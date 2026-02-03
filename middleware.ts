import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// CRITICAL: Session secret must be set in environment
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET environment variable must be set and be at least 32 characters");
}

const SECRET = new TextEncoder().encode(SESSION_SECRET);

const COOKIE_NAME = "replykaro_session";

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/keywords", "/analytics", "/settings"];

// Routes that should redirect to dashboard if authenticated
const authRoutes = ["/signin", "/signup"];
const isRootPath = (pathname: string) => pathname === "/";

async function getSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes for auth
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Get session
  const session = await getSessionFromRequest(request);

  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL("/signin", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users from auth routes or landing page
  if (session && (isAuthRoute || isRootPath(pathname))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
