import { NextRequest, NextResponse } from 'next/server';
import { getAndRefreshToken } from '../_helpers';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId } = body as { fileId: string };

    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    const tokenResult = await getAndRefreshToken(request);
    if ('error' in tokenResult) {
      return NextResponse.json(tokenResult, { status: 403 });
    }
    const { accessToken, newAccessToken, newTokenExpiry } = tokenResult;

    const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!fileRes.ok) {
      return NextResponse.json({ error: 'Failed to download from Drive', details: await fileRes.text() }, { status: 500 });
    }
    const arrayBuffer = await fileRes.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const zipBase64 = btoa(binary);

    const response = NextResponse.json({ success: true, zipData: zipBase64 });
    if (newAccessToken) {
      response.cookies.set('google_drive_access_token', newAccessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 3600, path: '/' });
    }
    if (newTokenExpiry) {
      response.cookies.set('google_drive_token_expiry', newTokenExpiry.toString(), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, path: '/' });
    }
    return response;

  } catch (error: any) {
    console.error('Drive download error:', error);
    return NextResponse.json({ 
      error: 'Failed to download from Drive',
      details: error.message 
    }, { status: 500 });
  }
}
