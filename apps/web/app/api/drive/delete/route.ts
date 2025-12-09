import { NextRequest, NextResponse } from 'next/server';
import { getAndRefreshToken } from '../_helpers';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId } = body;

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    const tokenResult = await getAndRefreshToken(request);
    if ('error' in tokenResult) {
      return NextResponse.json(tokenResult, { status: 403 });
    }
    const { accessToken, newAccessToken, newTokenExpiry } = tokenResult;

    const delRes = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!delRes.ok) {
      return NextResponse.json({ error: 'Failed to delete from Drive', details: await delRes.text() }, { status: 500 });
    }

    const response = NextResponse.json({ success: true });
    if (newAccessToken) {
      response.cookies.set('google_drive_access_token', newAccessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 3600, path: '/' });
    }
    if (newTokenExpiry) {
      response.cookies.set('google_drive_token_expiry', newTokenExpiry.toString(), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, path: '/' });
    }
    return response;

  } catch (error: any) {
    console.error('Drive delete error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete from Drive',
      details: error.message 
    }, { status: 500 });
  }
}

