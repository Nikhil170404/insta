import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "@/lib/supabase/types";

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "replykaro-secret-key-change-in-production"
);

const COOKIE_NAME = "replykaro_session";

export interface SessionUser {
  id: string;
  instagram_user_id: string;
  instagram_username: string;
  plan_type: "trial" | "paid" | "expired";
}

export async function createSession(user: User): Promise<string> {
  const token = await new SignJWT({
    id: user.id,
    instagram_user_id: user.instagram_user_id,
    instagram_username: user.instagram_username,
    plan_type: user.plan_type,
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
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
