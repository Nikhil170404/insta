import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  exchangeCodeForToken,
  getInstagramProfile,
  exchangeShortLivedForLongLived,
} from "@/lib/instagram/config";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import type { User } from "@/lib/supabase/types";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle user denial or errors
  if (error || !code) {
    logger.error("Instagram auth error", { error: error || undefined, errorDescription: errorDescription || undefined, category: "auth" });
    return NextResponse.redirect(
      new URL(`/signin?error=${encodeURIComponent(errorDescription || "instagram_denied")}`, request.url)
    );
  }

  // 1.1 CSRF Validation: Compare state from URL with state stored in cookie
  const cookieStore = request.cookies;
  const storedState = cookieStore.get("oauth_state")?.value;

  if (!storedState || !state) {
    logger.warn("OAuth state missing", { hasStoredState: !!storedState, hasUrlState: !!state, category: "auth" });
    return NextResponse.redirect(
      new URL(`/signin?error=${encodeURIComponent("auth_state_missing")}`, request.url)
    );
  }

  // Use timing-safe comparison to prevent timing attacks
  try {
    const storedBuf = Buffer.from(storedState, "utf-8");
    const receivedBuf = Buffer.from(state, "utf-8");
    if (storedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(storedBuf, receivedBuf)) {
      logger.warn("OAuth state mismatch — possible CSRF attack", { category: "auth" });
      return NextResponse.redirect(
        new URL(`/signin?error=${encodeURIComponent("auth_state_mismatch")}`, request.url)
      );
    }
  } catch {
    logger.warn("OAuth state comparison error", { category: "auth" });
    return NextResponse.redirect(
      new URL(`/signin?error=${encodeURIComponent("auth_state_invalid")}`, request.url)
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    // Step 1: Exchange code for Instagram Short-Lived Token
    logger.info("Exchanging code for Instagram token", { category: "auth" });
    const tokenData = await exchangeCodeForToken(code, request.url);
    let accessToken = tokenData.access_token;

    // MANDATORY: Exchange for Long-Lived Token (60 days)
    logger.info("Exchanging for Long-Lived Token", { category: "auth" });
    const longLivedToken = await exchangeShortLivedForLongLived(accessToken);
    if (longLivedToken) {
      logger.info("Long-Lived Token acquired", { category: "auth" });
      accessToken = longLivedToken;
    } else {
      logger.warn("Long-Lived exchange failed, using short-lived placeholder", { category: "auth" });
    }

    // 1.3: Token diagnostic — never log token values
    logger.debug("Token acquired", { tokenLength: accessToken.length, isLongLived: !!longLivedToken, category: "auth" });

    // Step 2: Get Instagram profile to verify and get username
    logger.info("Getting Instagram profile using /me", { category: "auth" });
    const profile = await getInstagramProfile(accessToken);

    // CRITICAL FIX: 'profile.id' is the App-Scoped ID (ASID) like 256...
    // 'profile.user_id' is the real Instagram ID (IGID) like 1784...
    // The webhooks use the IGID, so we MUST save the IGID to the database.
    const instagramUserId = (profile.user_id || profile.id).toString();
    const profilePictureUrl = profile.profile_picture_url;
    logger.info("Resolved Instagram ID", { igid: instagramUserId, hasProfilePic: !!profilePictureUrl, hasUserIdField: !!profile.user_id, category: "auth" });

    // Step 3: Auto-subscribe webhooks (Native Instagram subscription)
    try {
      logger.info("Auto-subscribing webhooks", { igId: instagramUserId, category: "auth" });
      const subscribeResponse = await fetch(
        `https://graph.instagram.com/v21.0/${instagramUserId}/subscribed_apps`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            subscribed_fields: "comments,messages,mentions",
            access_token: accessToken,
          }),
        }
      );

      if (subscribeResponse.ok) {
        logger.info("Webhooks auto-subscribed successfully", { category: "auth" });
      } else {
        const errorData = await subscribeResponse.json();
        logger.warn("Webhook subscription note (may require App Review for live)", { errorData, category: "auth" });
      }
    } catch (webhookError) {
      logger.error("Error auto-subscribing webhooks", { category: "auth" }, webhookError as Error);
    }

    // Step 4: Create or update user in database
    logger.info("Managing user in DB", { igid: instagramUserId, asid: profile.id, category: "auth" });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { data: userRecord } = await (supabase as any)
      .from("users")
      .select("*")
      .eq("instagram_user_id", instagramUserId) // Try matching by Real IGID first
      .single();

    // FALLBACK: If not found by IGID, try matching by the OLD ASID (profile.id)
    // This handles users who were created before our ID fix.
    if (!userRecord) {
      logger.info("User not found by IGID, checking for old ASID match", { category: "auth" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: legacyUser } = await (supabase as any)
        .from("users")
        .select("*")
        .eq("instagram_user_id", profile.id)
        .single();

      if (legacyUser) {
        logger.info("Found legacy user (ASID match). Migrating to IGID", { category: "auth" });
        userRecord = legacyUser;
      }
    }

    let user: User;

    if (userRecord) {
      logger.info("Updating existing user record", { category: "auth" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updatedUser, error: updateError } = await (supabase as any)
        .from("users")
        .update({
          instagram_user_id: instagramUserId, // Migrate to the Real IGID
          instagram_username: profile.username,
          instagram_access_token: accessToken,
          instagram_token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          profile_picture_url: profilePictureUrl, // SAVE PROFILE PIC
        })
        .eq("id", userRecord.id)
        .select()
        .single();

      if (updateError) throw updateError;
      user = updatedUser as User;
    } else {
      logger.info("Creating new user record", { category: "auth" });
      // Create new user with Free plan (no expiry)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newUser, error: insertError } = await (supabase as any)
        .from("users")
        .insert({
          instagram_user_id: instagramUserId,
          instagram_username: profile.username,
          instagram_access_token: accessToken,
          instagram_token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
          plan_type: "free",
          plan_expires_at: null, // No expiry for free tier
          profile_picture_url: profilePictureUrl, // SAVE PROFILE PIC
        })
        .select()
        .single();

      if (insertError) throw insertError;
      user = newUser as User;
    }

    // Step 4.5: Check waitlist for promo redemption (new users only)
    if (!userRecord) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: waitlistEntry } = await (supabase as any)
          .from("waitlist")
          .select("*")
          .eq("instagram_username", profile.username.toLowerCase())
          .eq("redeemed", false)
          .single();

        if (waitlistEntry) {
          logger.info("Waitlist match found", { tier: waitlistEntry.tier, position: waitlistEntry.position, category: "auth" });
          const now = new Date();
          const planExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
          const discountExpiry = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const updateData: any = {
            waitlist_discount_until: discountExpiry.toISOString(), // 90 days for 10% off
          };

          // Free plan upgrade for pro/starter tiers
          if (waitlistEntry.tier === "pro" || waitlistEntry.tier === "starter") {
            updateData.plan_type = waitlistEntry.tier;
            updateData.plan_expires_at = planExpiry.toISOString();
          }

          // Discount tier: boost free plan to 15K DMs/month for 1 month only
          if (waitlistEntry.tier === "discount") {
            updateData.waitlist_dms_per_month = 15000;
            updateData.waitlist_discount_until = planExpiry.toISOString(); // 30 days, NOT 90
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from("users")
            .update(updateData)
            .eq("id", user.id);

          // Mark waitlist entry as redeemed
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from("waitlist")
            .update({ redeemed: true, redeemed_at: now.toISOString() })
            .eq("id", waitlistEntry.id);

          // Update user object for session
          if (waitlistEntry.tier === "pro" || waitlistEntry.tier === "starter") {
            user = { ...user, plan_type: waitlistEntry.tier, plan_expires_at: planExpiry.toISOString() } as User;
          }

          logger.info("Waitlist promo applied", { tier: waitlistEntry.tier, category: "auth" });
        }
      } catch (waitlistError) {
        // Non-critical: don't block login if waitlist check fails
        logger.error("Waitlist redemption check error (non-critical)", { category: "auth" }, waitlistError as Error);
      }
    }

    // Step 5: Create session and set cookie
    const sessionToken = await createSession(user);
    await setSessionCookie(sessionToken);

    // Step 5.5: Notify user of Signin Success (Security Alert)
    try {
      const { notifyUser } = await import("@/lib/notifications/push");
      await notifyUser(user.id, 'security', {
        title: "Signin Success 🚀",
        body: `Welcome back, @${user.instagram_username}. You just logged into ReplyKaro.`
      });
    } catch (notifyError) {
      logger.error("Error triggering signin notification", { category: "auth" }, notifyError as Error);
    }

    // Step 6: Redirect to dashboard — delete the OAuth state cookie
    const redirectResponse = NextResponse.redirect(new URL("/dashboard", request.url));
    redirectResponse.cookies.delete("oauth_state");
    return redirectResponse;

  } catch (err) {
    logger.error("Instagram callback error", { category: "auth" }, err as Error);
    const message = err instanceof Error ? err.message : "auth_failed";
    const errorParam = encodeURIComponent(message);
    const redirectResponse = NextResponse.redirect(
      new URL(`/signin?error=${errorParam}`, request.url)
    );
    redirectResponse.cookies.delete("oauth_state");
    return redirectResponse;
  }
}
