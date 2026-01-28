import { NextResponse } from "next/server";
import { getInstagramAuthUrl } from "@/lib/instagram/config";

export async function GET() {
  // Generate a random state for CSRF protection
  const state = crypto.randomUUID();

  // Get the Instagram OAuth URL
  const authUrl = getInstagramAuthUrl(state);

  // Redirect to Instagram OAuth
  return NextResponse.redirect(authUrl);
}
