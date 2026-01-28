export const INSTAGRAM_CONFIG = {
  appId: process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID!,
  appSecret: process.env.INSTAGRAM_APP_SECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`,
  // Instagram Login for Business scopes
  scopes: [
    "instagram_business_basic",
    "instagram_business_manage_messages",
    "instagram_business_manage_comments",
    "pages_manage_metadata",
    "pages_show_list",
  ].join(","),
};

export function getInstagramAuthUrl(state: string): string {
  // Using Instagram Login for Business (direct Instagram auth)
  return (
    `https://www.instagram.com/oauth/authorize?` +
    `client_id=${INSTAGRAM_CONFIG.appId}` +
    `&redirect_uri=${encodeURIComponent(INSTAGRAM_CONFIG.redirectUri)}` +
    `&scope=${INSTAGRAM_CONFIG.scopes}` +
    `&response_type=code` +
    `&state=${state}` +
    `&enable_fb_login=0` +
    `&force_authentication=1`
  );
}

export async function exchangeCodeForToken(code: string) {
  // Exchange code for Instagram Access Token
  const response = await fetch(
    `https://api.instagram.com/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: INSTAGRAM_CONFIG.appId,
        client_secret: INSTAGRAM_CONFIG.appSecret,
        grant_type: "authorization_code",
        redirect_uri: INSTAGRAM_CONFIG.redirectUri,
        code,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_message || "Token exchange failed");
  }

  return response.json();
}

export async function getLongLivedToken(shortLivedToken: string) {
  // Exchange short-lived token for long-lived token (60 days)
  const response = await fetch(
    `https://graph.instagram.com/access_token?` +
    `grant_type=ig_exchange_token` +
    `&client_secret=${INSTAGRAM_CONFIG.appSecret}` +
    `&access_token=${shortLivedToken}`
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to get long-lived token");
  }

  return response.json();
}

export async function getInstagramProfile(accessToken: string) {
  // Get Instagram user profile
  const response = await fetch(
    `https://graph.instagram.com/v21.0/me?fields=user_id,username,account_type,profile_picture_url&access_token=${accessToken}`
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to get Instagram profile");
  }

  return response.json();
}
