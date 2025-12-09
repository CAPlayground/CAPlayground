import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });
    
    response.cookies.delete('google_drive_access_token');
    response.cookies.delete('google_drive_refresh_token');
    response.cookies.delete('google_drive_token_expiry');
    
    return response;
  } catch (error: any) {
    console.error('Sign out error:', error);
    return NextResponse.json({ 
      error: 'Failed to sign out',
      details: error.message 
    }, { status: 500 });
  }
}
