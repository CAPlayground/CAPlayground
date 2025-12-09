import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const { searchParams } = url;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');
    const origin = `${url.protocol}//${url.host}`;

    if (error) {
      return NextResponse.redirect(`${origin}/dashboard?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return NextResponse.redirect(`${origin}/dashboard?error=no_code`);
    }

    const redirectUri = `${origin}/api/drive/callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri
      })
    });
    if (!tokenRes.ok) {
      const details = await tokenRes.text();
      return NextResponse.redirect(`${origin}/dashboard?error=${encodeURIComponent('token_exchange_failed')}&details=${encodeURIComponent(details)}`);
    }
    const tokens = await tokenRes.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!tokens.access_token) {
      return NextResponse.redirect(`${origin}/dashboard?error=no_token`);
    }

    const nowExpiry = tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined;
    
    const response = NextResponse.redirect(`${origin}/dashboard?drive_connected=true`);
    
    response.cookies.set('google_drive_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in || 3600,
      path: '/'
    });
    
    if (tokens.refresh_token) {
      response.cookies.set('google_drive_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
        path: '/'
      });
    }
    
    if (nowExpiry) {
      response.cookies.set('google_drive_token_expiry', nowExpiry.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
        path: '/'
      });
    }

    return response;

  } catch (error: any) {
    console.error('Drive callback error:', error);
    const url = new URL(request.url);
    const origin = `${url.protocol}//${url.host}`;
    return NextResponse.redirect(`${origin}/dashboard?error=${encodeURIComponent(error.message)}`);
  }
}
