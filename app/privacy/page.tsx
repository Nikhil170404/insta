import Link from "next/link";

export const metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for ReplyKaro - Instagram DM Automation",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="text-xl font-bold text-primary">
            ReplyKaro
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: January 2025</p>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-gray-600 mb-4">
              Welcome to ReplyKaro (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Instagram DM automation service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>
            <h3 className="text-lg font-medium mb-2">2.1 Information from Instagram</h3>
            <p className="text-gray-600 mb-4">
              When you connect your Instagram account, we collect:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Your Instagram username and user ID</li>
              <li>Access tokens to interact with Instagram on your behalf</li>
              <li>Comments on your posts (to detect keywords)</li>
              <li>Basic profile information</li>
            </ul>

            <h3 className="text-lg font-medium mb-2">2.2 Information You Provide</h3>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Keywords and automated reply messages you configure</li>
              <li>Payment information (processed securely by Razorpay)</li>
            </ul>

            <h3 className="text-lg font-medium mb-2">2.3 Automatically Collected Information</h3>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Log data (IP address, browser type, access times)</li>
              <li>Usage data (features used, DMs sent)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Provide and maintain our DM automation service</li>
              <li>Detect keywords in comments and send automated DMs</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send service-related communications</li>
              <li>Improve and optimize our service</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Data Sharing and Disclosure</h2>
            <p className="text-gray-600 mb-4">
              We do not sell your personal information. We may share your data with:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li><strong>Service Providers:</strong> Supabase (database), Vercel (hosting), Razorpay (payments)</li>
              <li><strong>Meta/Instagram:</strong> To provide the automation service through their API</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Data Security</h2>
            <p className="text-gray-600 mb-4">
              We implement industry-standard security measures including:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Encryption of data in transit (HTTPS/TLS)</li>
              <li>Secure storage of access tokens</li>
              <li>Regular security audits</li>
              <li>Access controls and authentication</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Data Retention</h2>
            <p className="text-gray-600 mb-4">
              We retain your data for as long as your account is active. Upon account deletion:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Your personal data will be deleted within 30 days</li>
              <li>Instagram access tokens are immediately revoked</li>
              <li>Anonymized analytics data may be retained</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Your Rights</h2>
            <p className="text-gray-600 mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and data</li>
              <li>Export your data</li>
              <li>Withdraw consent for data processing</li>
              <li>Disconnect your Instagram account at any time</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. Third-Party Services</h2>
            <p className="text-gray-600 mb-4">
              Our service integrates with Instagram/Meta. Your use of Instagram is subject to Meta&apos;s Privacy Policy and Terms of Service. We recommend reviewing their policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">9. Children&apos;s Privacy</h2>
            <p className="text-gray-600 mb-4">
              Our service is not intended for users under 18 years of age. We do not knowingly collect information from children.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">10. Changes to This Policy</h2>
            <p className="text-gray-600 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">11. Contact Us</h2>
            <p className="text-gray-600 mb-4">
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-gray-600">
              Email: support@replykaro.com
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} ReplyKaro. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-900">
                Terms of Service
              </Link>
              <Link href="/privacy" className="text-sm text-primary font-medium">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
