import { NextResponse } from "next/server";
import { getInstagramAuthUrl } from "@/lib/instagram/config";

export async function GET(request: Request) {
  // Rate Limit: 10 requests per 10 seconds per IP
  const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";

  try {
    const { createRateLimiter } = await import("@/lib/upstash");
    const ratelimit = createRateLimiter("auth_limit", 10, "10 s");
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  } catch (error) {
    // Fail safe: If Redis is down, allow traffic but log error
    console.error("Rate limit error:", error);
  }

  // Generate a random state for CSRF protection
  const state = crypto.randomUUID();

  // Get the Instagram OAuth URL
  const authUrl = getInstagramAuthUrl(state, request.url);

  // Redirect to Instagram OAuth
  return NextResponse.redirect(authUrl);
}
