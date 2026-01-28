import Link from "next/link";
import { Instagram } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function SignInPage() {
  // If already logged in, redirect to dashboard
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-primary">
            ReplyKaro
          </Link>
          <p className="text-gray-600 mt-2">Reply Karo, Sales Badao!</p>
        </div>

        {/* Sign In Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-center mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600 text-center mb-8">
            Connect your Instagram Business account to get started
          </p>

          {/* Instagram Sign In Button */}
          <a
            href="/api/auth/instagram"
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white rounded-lg px-4 py-3 font-semibold hover:opacity-90 transition-opacity"
          >
            <Instagram className="h-5 w-5" />
            Continue with Instagram
          </a>

          <p className="text-xs text-gray-500 text-center mt-4">
            Make sure you have an Instagram Business or Creator account
          </p>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                Why Instagram Business?
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Access to Instagram Messaging API</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Required for automated DM responses</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Free to convert from personal account</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
