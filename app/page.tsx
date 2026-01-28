import Link from "next/link";
import { ArrowRight, MessageSquare, Zap, Shield, Clock } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-primary">ReplyKaro</div>
          <div className="flex items-center gap-4">
            <Link
              href="/pricing"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/signin"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Reply Karo,{" "}
            <span className="text-primary">Sales Badao!</span>
          </h1>
          <p className="mt-6 text-xl text-gray-600">
            Automate your Instagram DMs with keyword-based responses.
            Convert comments into customers automatically.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/signin"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-lg font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              View Pricing
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Start with 7 days free. No credit card required.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900">
            Everything you need to automate DMs
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Simple setup, powerful results
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Keyword Detection
            </h3>
            <p className="text-gray-600">
              Automatically detect keywords in comments and trigger personalized DM responses.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Instant Replies
            </h3>
            <p className="text-gray-600">
              Send DMs within seconds of detecting a matching comment.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Safe & Compliant
            </h3>
            <p className="text-gray-600">
              Built-in rate limiting ensures your account stays safe and within Instagram&apos;s guidelines.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              24/7 Automation
            </h3>
            <p className="text-gray-600">
              Never miss a lead. Your automation works around the clock.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-primary rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to automate your Instagram?
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            Join thousands of businesses using ReplyKaro
          </p>
          <Link
            href="/signin"
            className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-lg font-semibold text-primary hover:bg-gray-100 transition-colors"
          >
            Start Your Free Trial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-gray-600">
              &copy; {new Date().getFullYear()} ReplyKaro. All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-gray-600 hover:text-gray-900">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-600 hover:text-gray-900">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
