import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('google_drive_access_token')?.value;
    
    if (accessToken) {
      return NextResponse.json({ 
        connected: true,
        hasToken: true
      });
    }

    const url = new URL(request.url);
    const origin = `${url.protocol}//${url.host}`;
    const redirectUri = `${origin}/api/drive/callback`;
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email'
      ].join(' '),
      access_type: 'offline',
      prompt: 'consent'
    });
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return NextResponse.json({ 
      connected: false,
      authUrl
    });

  } catch (error: any) {
    console.error('Drive auth check error:', error);
    return NextResponse.json({ 
      error: 'Failed to check Drive connection',
      details: error.message 
    }, { status: 500 });
  }
}
