export const INSTAGRAM_CONFIG = {
  appId: process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID!,
  appSecret: process.env.INSTAGRAM_APP_SECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`,
  // 2025 Standard: Instagram Business Login Scopes (Pageless Flow)
  scopes: [
    "instagram_business_basic",
    "instagram_business_manage_messages",
    "instagram_business_manage_comments",
    "instagram_business_content_publish",
  ].join(","),
};

export function getInstagramAuthUrl(state: string): string {
  // 2025 Standard: Instagram Business Login
  // This allows connecting IG accounts WITHOUT a Facebook Page.
  // We remove 'content_publish' for now to avoid 'API Access Blocked' errors
  const testScopes = [
    "instagram_business_basic",
    "instagram_business_manage_messages",
    "instagram_business_manage_comments",
  ].join(",");

  return (
    `https://www.instagram.com/oauth/authorize?` +
    `enable_fb_login=0` +         // Forces Instagram-only (Native flow)
    `&force_authentication=1` +
    `&client_id=${INSTAGRAM_CONFIG.appId}` +
    `&redirect_uri=${encodeURIComponent(INSTAGRAM_CONFIG.redirectUri)}` +
    `&scope=${testScopes}` +
    `&response_type=code` +
    `&state=${state}`
  );
}

export async function exchangeCodeForToken(code: string) {
  // Exchange code for Instagram Access Token
  // For Instagram Business Login, we useapi.instagram.com or the graph endpoint
  const response = await fetch(
    `https://api.instagram.com/oauth/access_token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: INSTAGRAM_CONFIG.appId,
        client_secret: INSTAGRAM_CONFIG.appSecret,
        grant_type: 'authorization_code',
        redirect_uri: INSTAGRAM_CONFIG.redirectUri,
        code: code,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error("Token exchange err:", error);
    throw new Error(error.error_message || "Token exchange failed");
  }

  return response.json();
}

/**
 * Gets the profile information for the Instagram Business account
 * Note: For the new Instagram Login flow, the token already represents the IG account.
 */
export async function getInstagramProfile(accessToken: string, instagramUserId: string) {
  const response = await fetch(
    `https://graph.instagram.com/v21.0/${instagramUserId}?fields=id,username,profile_picture_url&access_token=${accessToken}`
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to get Instagram profile");
  }

  return response.json();
}
