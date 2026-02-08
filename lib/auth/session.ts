import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "@/lib/supabase/types";
import { getSupabaseAdmin } from "@/lib/supabase/client";

// CRITICAL: Session secret must be set in environment
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET environment variable must be set and be at least 32 characters");
}

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET);

const COOKIE_NAME = "replykaro_session";

export interface SessionUser {
  id: string;
  instagram_user_id: string;
  instagram_username: string;
  plan_type: "free" | "trial" | "paid" | "expired";
  profile_picture_url?: string;
  created_at: string;
  plan_expires_at?: string;
}

export async function createSession(user: User): Promise<string> {
  const token = await new SignJWT({
    id: user.id,
    instagram_user_id: user.instagram_user_id,
    instagram_username: user.instagram_username,
    plan_type: user.plan_type,
    profile_picture_url: user.profile_picture_url,
    created_at: user.created_at,
    plan_expires_at: user.plan_expires_at,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);

  return token;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const sessionUser = payload as unknown as SessionUser;

    // Create a mutable copy
    const updatedSessionUser: SessionUser = { ...sessionUser };

    // P1 Fix: Fetch fresh plan details from DB
    // This prevents "stale session" where user stays on old plan until JWT expires (7 days)
    try {
      const supabase = getSupabaseAdmin();

      const { data: user } = await supabase
        .from("users")
        .select("plan_type, plan_expires_at, subscription_status")
        .eq("id", sessionUser.id)
        .single() as any;

      if (user) {
        // Override JWT data with fresh DB data
        updatedSessionUser.plan_type = user.plan_type as any;
        updatedSessionUser.plan_expires_at = user.plan_expires_at;
      }
    } catch (err) {
      // Fallback to JWT data if DB fails (fail-open or log error)
      console.error("Error refreshing session data:", err);
    }

    return updatedSessionUser;
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
