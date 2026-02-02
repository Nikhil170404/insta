import Link from "next/link";

export const metadata = {
  title: "Terms of Service",
  description: "Terms of Service for ReplyKaro - Instagram DM Automation",
};

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-gray-500 mb-8">Last updated: January 2025</p>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 mb-4">
              By accessing or using ReplyKaro (&quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, please do not use our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-gray-600 mb-4">
              ReplyKaro is an Instagram DM automation platform that allows users to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Connect their Instagram Business or Creator accounts</li>
              <li>Configure keyword-based triggers for automated DM responses</li>
              <li>Send automated direct messages to users who comment specific keywords on their posts</li>
              <li>Track and manage their automated messaging activity</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. Account Requirements</h2>
            <p className="text-gray-600 mb-4">To use our Service, you must:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Be at least 18 years of age</li>
              <li>Have a valid Instagram Business or Creator account</li>
              <li>Provide accurate and complete information during registration</li>
              <li>Maintain the security of your account credentials</li>
              <li>Comply with Instagram&apos;s Terms of Use and Community Guidelines</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Acceptable Use Policy</h2>
            <p className="text-gray-600 mb-4">You agree NOT to use the Service to:</p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Send spam, unsolicited messages, or misleading content</li>
              <li>Harass, threaten, or harm other users</li>
              <li>Distribute malware, viruses, or malicious code</li>
              <li>Violate Instagram&apos;s Platform Policy or Terms of Use</li>
              <li>Engage in any illegal activities</li>
              <li>Impersonate others or misrepresent your affiliation</li>
              <li>Circumvent rate limits or abuse the Service</li>
              <li>Share, sell, or transfer your account access</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Instagram API Compliance</h2>
            <p className="text-gray-600 mb-4">
              Our Service operates through Instagram&apos;s official API. You acknowledge that:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Instagram may change their API policies at any time, which may affect our Service</li>
              <li>We are not responsible for any actions taken by Instagram against your account</li>
              <li>You must comply with all Instagram policies while using our Service</li>
              <li>Rate limits imposed by Instagram apply to your usage</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Subscription and Payments</h2>
            <h3 className="text-lg font-medium mb-2">6.1 Trial Period</h3>
            <p className="text-gray-600 mb-4">
              New users receive a 7-day free trial with limited features. No payment is required for the trial period.
            </p>

            <h3 className="text-lg font-medium mb-2">6.2 Paid Subscriptions</h3>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Subscriptions are billed monthly</li>
              <li>Payments are processed securely through Razorpay</li>
              <li>Prices are in Indian Rupees (INR) and inclusive of applicable taxes</li>
              <li>You authorize us to charge your payment method on a recurring basis</li>
            </ul>

            <h3 className="text-lg font-medium mb-2">6.3 Cancellation and Refunds</h3>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>You may cancel your subscription at any time</li>
              <li>Cancellation takes effect at the end of the current billing period</li>
              <li>No refunds are provided for partial months or unused services</li>
              <li>We reserve the right to offer refunds at our discretion</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Service Availability</h2>
            <p className="text-gray-600 mb-4">
              We strive to maintain 99.9% uptime but do not guarantee uninterrupted service. We may:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Perform scheduled maintenance with advance notice when possible</li>
              <li>Experience temporary outages due to technical issues</li>
              <li>Modify, suspend, or discontinue features with reasonable notice</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. Intellectual Property</h2>
            <p className="text-gray-600 mb-4">
              All content, features, and functionality of the Service are owned by ReplyKaro and protected by intellectual property laws. You may not:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Copy, modify, or distribute our software or content</li>
              <li>Reverse engineer or attempt to extract source code</li>
              <li>Use our trademarks without written permission</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">9. Limitation of Liability</h2>
            <p className="text-gray-600 mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>The Service is provided &quot;AS IS&quot; without warranties of any kind</li>
              <li>We are not liable for any indirect, incidental, or consequential damages</li>
              <li>Our total liability shall not exceed the amount paid by you in the past 12 months</li>
              <li>We are not responsible for actions taken by Instagram or third parties</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">10. Indemnification</h2>
            <p className="text-gray-600 mb-4">
              You agree to indemnify and hold harmless ReplyKaro, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Content you send through the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">11. Account Termination</h2>
            <p className="text-gray-600 mb-4">
              We may suspend or terminate your account if:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>You violate these Terms or our Acceptable Use Policy</li>
              <li>Your payment method fails repeatedly</li>
              <li>We receive complaints about your messaging activities</li>
              <li>Required by law or Instagram&apos;s policies</li>
            </ul>
            <p className="text-gray-600 mb-4">
              Upon termination, your right to use the Service ceases immediately. We may retain certain data as required by law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">12. Governing Law</h2>
            <p className="text-gray-600 mb-4">
              These Terms are governed by the laws of India. Any disputes shall be resolved in the courts of [Your City], India.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">13. Changes to Terms</h2>
            <p className="text-gray-600 mb-4">
              We may modify these Terms at any time. We will notify users of significant changes via email or through the Service. Continued use after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">14. Contact Us</h2>
            <p className="text-gray-600 mb-4">
              If you have questions about these Terms, please contact us at:
            </p>
            <p className="text-gray-600">
              Email: replykaro1704@gmail.com
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
              <Link href="/terms" className="text-sm text-primary font-medium">
                Terms of Service
              </Link>
              <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-900">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
