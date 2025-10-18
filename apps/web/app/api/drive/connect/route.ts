import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const origin = request.headers.get('origin') || 'http://localhost:3000';

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

    return NextResponse.json({ authUrl });

  } catch (error: any) {
    console.error('Drive connect error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate auth URL',
      details: error.message 
    }, { status: 500 });
  }
}

