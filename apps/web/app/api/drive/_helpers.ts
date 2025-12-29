import { NextRequest } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

export interface TokenRefreshResult {
  accessToken: string;
  newAccessToken?: string;
  newTokenExpiry?: number;
}

export async function getAndRefreshToken(request: NextRequest): Promise<TokenRefreshResult | { error: string; needsConnection: boolean }> {
  const providerToken = request.cookies.get('google_drive_access_token')?.value;
  const refreshToken = request.cookies.get('google_drive_refresh_token')?.value;
  const tokenExpiryStr = request.cookies.get('google_drive_token_expiry')?.value;
  const tokenExpiry = tokenExpiryStr ? parseInt(tokenExpiryStr) : undefined;

  if (!providerToken) {
    return {
      error: 'Google云端硬盘未连接。请先登录您的Google云端硬盘。',
      needsConnection: true
    };
  }

  let accessToken = providerToken;
  let newAccessToken: string | undefined;
  let newTokenExpiry: number | undefined;

  if (tokenExpiry && Date.now() >= tokenExpiry) {
    if (!refreshToken) {
      return {
        error: '令牌已过期且没有可用的刷新令牌。请重新登录Google云端硬盘。',
        needsConnection: true
      };
    }

    try {
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: refreshToken
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
      return {
        error: '刷新令牌失败。请重新登录Google云端硬盘。',
        needsConnection: true
      };
    }
  }

  return { accessToken, newAccessToken, newTokenExpiry };
}

export function setRefreshedTokenCookies(response: Response, newAccessToken?: string, newTokenExpiry?: number) {
  if (newAccessToken) {
    response.headers.append('Set-Cookie', `google_drive_access_token=${newAccessToken}; HttpOnly; Secure=${process.env.NODE_ENV === 'production'}; SameSite=Lax; Max-Age=3600; Path=/`);
  }
  
  if (newTokenExpiry) {
    response.headers.append('Set-Cookie', `google_drive_token_expiry=${newTokenExpiry}; HttpOnly; Secure=${process.env.NODE_ENV === 'production'}; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}; Path=/`);
  }
}
