import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getInstagramProfile,
} from "@/lib/instagram/config";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import type { User } from "@/lib/supabase/types";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorReason = searchParams.get("error_reason");

  // Handle user denial
  if (error || !code) {
    console.error("Instagram auth error:", error, errorReason);
    return NextResponse.redirect(
      new URL("/signin?error=instagram_denied", request.url)
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    // Step 1: Exchange code for short-lived token
    const tokenData = await exchangeCodeForToken(code);
    const shortLivedToken = tokenData.access_token;
    const instagramUserId = tokenData.user_id;

    // Step 2: Exchange for long-lived token (60 days)
    const longLivedData = await getLongLivedToken(shortLivedToken);
    const longLivedToken = longLivedData.access_token;
    const expiresIn = longLivedData.expires_in; // seconds

    // Step 3: Get user profile
    const profile = await getInstagramProfile(longLivedToken);

    // Step 3.5: Verify Facebook Page connection
    try {
      const pageCheckResponse = await fetch(
        `https://graph.facebook.com/v21.0/${instagramUserId}?fields=connected_facebook_page&access_token=${longLivedToken}`
      );

      const pageCheckData = await pageCheckResponse.json();

      if (!pageCheckData.connected_facebook_page) {
        console.warn("⚠️ Instagram account not connected to Facebook Page!");
        console.warn("User:", profile.username);
        // We log this but don't block login, as we'll show instructions in the dashboard
      } else {
        console.log("✅ Facebook Page connected:", pageCheckData.connected_facebook_page);
      }
    } catch (error) {
      console.error("Could not verify Page connection:", error);
    }

    // Step 3.6: Auto-subscribe webhooks
    try {
      console.log("Auto-subscribing webhooks for user:", instagramUserId);

      const subscribeResponse = await fetch(
        `https://graph.facebook.com/v21.0/${instagramUserId}/subscribed_apps`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            subscribed_fields: "comments,messages,mentions",
            access_token: longLivedToken,
          }),
        }
      );

      if (subscribeResponse.ok) {
        console.log("✅ Webhooks auto-subscribed successfully!");
      } else {
        const error = await subscribeResponse.json();
        console.error("⚠️ Webhook subscription failed:", error);
      }
    } catch (error) {
      console.error("Error auto-subscribing webhooks:", error);
    }

    // Step 4: Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Step 5: Create or update user in database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingUser } = await (supabase as any)
      .from("users")
      .select("*")
      .eq("instagram_user_id", instagramUserId.toString())
      .single();

    let user: User;

    if (existingUser) {
      // Update existing user
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updatedUser, error: updateError } = await (supabase as any)
        .from("users")
        .update({
          instagram_username: profile.username,
          instagram_access_token: longLivedToken,
          instagram_token_expires_at: tokenExpiresAt,
        })
        .eq("id", existingUser.id)
        .select()
        .single();

      if (updateError) throw updateError;
      user = updatedUser as User;
    } else {
      // Create new user with 7-day trial
      const trialExpiresAt = new Date();
      trialExpiresAt.setDate(trialExpiresAt.getDate() + 7);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newUser, error: insertError } = await (supabase as any)
        .from("users")
        .insert({
          instagram_user_id: instagramUserId.toString(),
          instagram_username: profile.username,
          instagram_access_token: longLivedToken,
          instagram_token_expires_at: tokenExpiresAt,
          plan_type: "trial",
          plan_expires_at: trialExpiresAt.toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;
      user = newUser as User;
    }

    // Step 6: Create session and set cookie
    const sessionToken = await createSession(user);
    await setSessionCookie(sessionToken);

    // Step 7: Redirect to dashboard
    return NextResponse.redirect(new URL("/dashboard", request.url));

  } catch (err) {
    console.error("Instagram callback error:", err);
    const message = err instanceof Error ? err.message : "auth_failed";
    const errorParam = encodeURIComponent(message);
    return NextResponse.redirect(
      new URL(`/signin?error=${errorParam}`, request.url)
    );
  }
}
