import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForToken,
  getInstagramProfile,
  exchangeShortLivedForLongLived,
} from "@/lib/instagram/config";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import type { User } from "@/lib/supabase/types";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle user denial or errors
  if (error || !code) {
    console.error("Instagram auth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`/signin?error=${encodeURIComponent(errorDescription || "instagram_denied")}`, request.url)
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    // Step 1: Exchange code for Instagram Short-Lived Token
    console.log("Step 1: Exchanging code for Instagram token...");
    const tokenData = await exchangeCodeForToken(code, request.url);
    let accessToken = tokenData.access_token;

    // MANDATORY: Exchange for Long-Lived Token (60 days)
    console.log("🔄 Exchanging for Long-Lived Token...");
    const longLivedToken = await exchangeShortLivedForLongLived(accessToken);
    if (longLivedToken) {
      console.log("✅ Long-Lived Token acquired.");
      accessToken = longLivedToken;
    } else {
      console.warn("⚠️ Long-Lived exchange failed, using short-lived placeholder.");
    }

    console.log(`📊 Token Diagnostic: Length=${accessToken.length}, StartsWith=${accessToken.substring(0, 10)}...`);

    // Step 2: Get Instagram profile to verify and get username
    console.log("Step 2: Getting Instagram profile using /me...");
    const profile = await getInstagramProfile(accessToken);

    // CRITICAL FIX: 'profile.id' is the App-Scoped ID (ASID) like 256...
    // 'profile.user_id' is the real Instagram ID (IGID) like 1784...
    // The webhooks use the IGID, so we MUST save the IGID to the database.
    const instagramUserId = (profile.user_id || profile.id).toString();
    const profilePictureUrl = profile.profile_picture_url;
    console.log(`✅ Final Resolved Instagram ID (IGID): "${instagramUserId}"`);
    console.log(`📸 Profile Pic: ${profilePictureUrl ? "Found" : "Not Found"}`);
    if (profile.user_id) console.log(`ℹ️ App-Scoped ID (ASID) was: "${profile.id}"`);

    // Step 3: Auto-subscribe webhooks (Native Instagram subscription)
    try {
      console.log("Step 3: Auto-subscribing webhooks for IG ID:", instagramUserId);
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
        console.log("✅ Webhooks auto-subscribed successfully!");
      } else {
        const errorData = await subscribeResponse.json();
        console.error("⚠️ Webhook subscription note (may require App Review for live):", errorData);
      }
    } catch (webhookError) {
      console.error("Error auto-subscribing webhooks:", webhookError);
    }

    // Step 4: Create or update user in database
    console.log(`Step 4: Managing user in DB (IGID: ${instagramUserId}, ASID: ${profile.id})`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { data: userRecord } = await (supabase as any)
      .from("users")
      .select("*")
      .eq("instagram_user_id", instagramUserId) // Try matching by Real IGID first
      .single();

    // FALLBACK: If not found by IGID, try matching by the OLD ASID (profile.id)
    // This handles users who were created before our ID fix.
    if (!userRecord) {
      console.log("ℹ️ User not found by IGID, checking for old ASID match...");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: legacyUser } = await (supabase as any)
        .from("users")
        .select("*")
        .eq("instagram_user_id", profile.id)
        .single();

      if (legacyUser) {
        console.log("✅ Found legacy user (ASID match). Migrating to IGID...");
        userRecord = legacyUser;
      }
    }

    let user: User;

    if (userRecord) {
      console.log("Updating existing user record...");
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
      console.log("Creating new user record...");
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

    // Step 5: Check waitlist reward and auto-apply
    try {
      const username = profile.username?.toLowerCase();
      if (username) {
        const { data: waitlistEntry } = await (supabase as any)
          .from("waitlist")
          .select("id, position, reward_tier, is_claimed")
          .ilike("instagram_username", username)
          .eq("is_claimed", false)
          .maybeSingle();

        if (waitlistEntry && waitlistEntry.reward_tier && !waitlistEntry.is_claimed) {
          // Apply the reward: set plan_type and plan_expires_at (30 days from now)
          const rewardPlan = waitlistEntry.reward_tier; // 'pro' or 'starter'
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

          const { data: upgradedUser } = await (supabase as any)
            .from("users")
            .update({
              plan_type: rewardPlan,
              plan_expires_at: expiresAt,
            })
            .eq("id", user.id)
            .select()
            .single();

          if (upgradedUser) {
            user = upgradedUser as User;
            console.log(`🎁 Waitlist reward claimed! User ${username} got ${rewardPlan} plan until ${expiresAt}`);
          }

          // Mark waitlist entry as claimed
          await (supabase as any)
            .from("waitlist")
            .update({
              is_claimed: true,
              claimed_by_user_id: user.id,
              claimed_at: new Date().toISOString(),
            })
            .eq("id", waitlistEntry.id);
        }
      }
    } catch (waitlistError) {
      // Non-critical: don't block login if waitlist check fails
      console.error("Waitlist reward check error (non-critical):", waitlistError);
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
