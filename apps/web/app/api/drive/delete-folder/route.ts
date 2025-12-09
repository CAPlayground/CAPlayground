import { NextRequest, NextResponse } from 'next/server';
import { getAndRefreshToken } from '../_helpers';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const tokenResult = await getAndRefreshToken(request);
    if ('error' in tokenResult) {
      return NextResponse.json(tokenResult, { status: 403 });
    }
    const { accessToken, newAccessToken, newTokenExpiry } = tokenResult;

    const listUrl = new URL('https://www.googleapis.com/drive/v3/files');
    listUrl.searchParams.set('q', "name='CAPlayground' and mimeType='application/vnd.google-apps.folder' and trashed=false");
    listUrl.searchParams.set('fields', 'files(id, name)');
    listUrl.searchParams.set('spaces', 'drive');
    const searchRes = await fetch(listUrl.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!searchRes.ok) return NextResponse.json({ error: 'Failed to query folder', details: await searchRes.text() }, { status: 500 });
    const searchJson = await searchRes.json() as { files?: Array<{ id: string }> };

    if (searchJson.files && searchJson.files.length > 0) {
      const folderId = searchJson.files[0].id;
      const delRes = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!delRes.ok) return NextResponse.json({ error: 'Failed to delete folder', details: await delRes.text() }, { status: 500 });
      const response = NextResponse.json({ success: true, deleted: true });
      if (newAccessToken) {
        response.cookies.set('google_drive_access_token', newAccessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 3600, path: '/' });
      }
      if (newTokenExpiry) {
        response.cookies.set('google_drive_token_expiry', newTokenExpiry.toString(), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, path: '/' });
      }
      return response;
    } else {
      return NextResponse.json({ success: true, deleted: false, message: 'Folder not found' });
    }

  } catch (error: any) {
    console.error('Drive delete-folder error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete folder from Drive',
      details: error.message 
    }, { status: 500 });
  }
}
