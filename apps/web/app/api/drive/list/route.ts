import { NextRequest, NextResponse } from 'next/server';
import { getAndRefreshToken } from '../_helpers';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const tokenResult = await getAndRefreshToken(request);
    if ('error' in tokenResult) {
      return NextResponse.json(tokenResult, { status: 403 });
    }
    const { accessToken, newAccessToken, newTokenExpiry } = tokenResult;

    const listFiles = async (q: string, fields: string, extra: Record<string,string> = {}) => {
      const url = new URL('https://www.googleapis.com/drive/v3/files');
      url.searchParams.set('q', q);
      url.searchParams.set('fields', fields);
      url.searchParams.set('spaces', 'drive');
      for (const [k,v] of Object.entries(extra)) url.searchParams.set(k, v);
      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    };

    const folderQuery = await listFiles(
      "name='CAPlayground' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      'files(id, name)'
    );

    if (!folderQuery.files || folderQuery.files.length === 0) {
      return NextResponse.json({ files: [] });
    }

    const folderId = folderQuery.files[0].id as string;

    const filesQuery = await listFiles(
      `'${folderId}' in parents and trashed=false and mimeType='application/zip'`,
      'files(id, name, webViewLink, createdTime, size)',
      { orderBy: 'createdTime desc' }
    );

    const response = NextResponse.json({ files: filesQuery.files || [] });
    if (newAccessToken) {
      response.cookies.set('google_drive_access_token', newAccessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 3600, path: '/' });
    }
    if (newTokenExpiry) {
      response.cookies.set('google_drive_token_expiry', newTokenExpiry.toString(), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, path: '/' });
    }
    return response;

  } catch (error: any) {
    console.error('Drive list error:', error);
    return NextResponse.json({ 
      error: 'Failed to list Drive files',
      details: error.message 
    }, { status: 500 });
  }
}
