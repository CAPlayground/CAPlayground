import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projects } = body as { projects: Array<{ id: string; name: string; zipData: string }> };

    if (!projects || !Array.isArray(projects) || projects.length === 0) {
      return NextResponse.json({ error: 'No projects specified' }, { status: 400 });
    }

    const providerToken = request.cookies.get('google_drive_access_token')?.value;
    const refreshToken = request.cookies.get('google_drive_refresh_token')?.value;
    const tokenExpiryStr = request.cookies.get('google_drive_token_expiry')?.value;
    const tokenExpiry = tokenExpiryStr ? parseInt(tokenExpiryStr) : undefined;

    if (!providerToken) {
      return NextResponse.json({ 
        error: 'Google Drive not connected. Please sign in to your Google Drive account first.',
        needsConnection: true
      }, { status: 403 });
    }
    
    let accessToken = providerToken as string;
    let newAccessToken: string | undefined;
    let newTokenExpiry: number | undefined;

    if (tokenExpiry && Date.now() >= tokenExpiry) {
      if (!refreshToken) {
        return NextResponse.json({ 
          error: 'Token expired and no refresh token available. Please sign in again to Google Drive.',
          needsConnection: true
        }, { status: 403 });
      }

      try {
        const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken as string
          })
        });

        if (!refreshRes.ok) {
          const t = await refreshRes.text();
          throw new Error(`Refresh failed: ${t}`);
        }

        const refreshed = await refreshRes.json() as { access_token: string; expires_in?: number };
        accessToken = refreshed.access_token;
        newAccessToken = refreshed.access_token;
        newTokenExpiry = refreshed.expires_in ? Date.now() + refreshed.expires_in * 1000 : undefined;
      } catch (refreshError: any) {
        console.error('Token refresh failed:', refreshError);
        return NextResponse.json({ 
          error: 'Failed to refresh token. Please sign in again to Google Drive.',
          needsConnection: true
        }, { status: 403 });
      }
    }

    const base64ToBytes = (b64: string): Uint8Array => {
      const binary = atob(b64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    };

    const driveList = async (q: string, fields: string) => {
      const url = new URL('https://www.googleapis.com/drive/v3/files');
      url.searchParams.set('q', q);
      url.searchParams.set('fields', fields);
      url.searchParams.set('spaces', 'drive');
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error(`Drive list failed: ${await res.text()}`);
      return res.json();
    };

    let folderId: string | undefined;
    const folderQuery = await driveList(
      "name='CAPlayground' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      'files(id, name)'
    );
    if (folderQuery.files && folderQuery.files.length > 0) {
      folderId = folderQuery.files[0].id as string;
    } else {
      const createFolderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'CAPlayground',
          mimeType: 'application/vnd.google-apps.folder'
        })
      });
      if (!createFolderRes.ok) throw new Error(`Create folder failed: ${await createFolderRes.text()}`);
      const folder = await createFolderRes.json();
      folderId = folder.id as string;
    }

    const startResumable = async (metadata: any, existingFileId?: string) => {
      const baseUrl = existingFileId
        ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=resumable`
        : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable';
      const method = existingFileId ? 'PATCH' : 'POST';
      const res = await fetch(baseUrl, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8'
        },
        body: JSON.stringify(metadata)
      });
      if (!res.ok) throw new Error(`Start resumable upload failed: ${await res.text()}`);
      const sessionUrl = res.headers.get('location');
      if (!sessionUrl) throw new Error('No resumable session URL returned by Drive');
      return sessionUrl;
    };

    const uploadToSession = async (sessionUrl: string, bytes: Uint8Array) => {
      const res = await fetch(sessionUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/zip',
          'Content-Length': String(bytes.byteLength)
        },
        body: bytes
      });
      if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`);
      return res.json();
    };

    const results: Array<{ projectId: string; success: boolean; fileId?: string; fileName?: string; webViewLink?: string; updated?: boolean; error?: string }> = [];
    for (const project of projects) {
      try {
        const bytes = base64ToBytes(project.zipData);

        const search = await driveList(
          `name='${project.name}.ca.zip' and '${folderId}' in parents and trashed=false`,
          'files(id, name, webViewLink)'
        );
        const existingFileId: string | undefined = (search.files && search.files.length > 0) ? search.files[0].id : undefined;

        const metadata: any = existingFileId ? {} : {
          name: `${project.name}.ca.zip`,
          parents: [folderId],
          description: `CAPlayground project: ${project.name}`
        };

        const sessionUrl = await startResumable(metadata, existingFileId);
        const uploaded = await uploadToSession(sessionUrl, bytes);

        results.push({
          projectId: project.id,
          success: true,
          fileId: uploaded.id,
          fileName: uploaded.name,
          webViewLink: uploaded.webViewLink,
          updated: !!existingFileId
        });
      } catch (error: any) {
        console.error(`Failed to upload project ${project.id}:`, error);
        results.push({
          projectId: project.id,
          success: false,
          error: error?.message || String(error)
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const response = NextResponse.json({ success: true, uploaded: successCount, total: projects.length, results });
    
    if (newAccessToken) {
      response.cookies.set('google_drive_access_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 3600,
        path: '/'
      });
    }
    
    if (newTokenExpiry) {
      response.cookies.set('google_drive_token_expiry', newTokenExpiry.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
        path: '/'
      });
    }
    
    return response;

  } catch (error: any) {
    console.error('Drive upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload to Drive',
      details: error.message 
    }, { status: 500 });
  }
}
