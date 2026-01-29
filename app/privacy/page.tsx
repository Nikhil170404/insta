export const metadata = {
  title: "Privacy Policy - ReplyKaro",
  description: "Privacy Policy for ReplyKaro Instagram DM Automation",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <a href="/" className="text-xl font-bold text-primary">
            ReplyKaro
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: January 29, 2025</p>

        <div className="prose prose-gray max-w-none space-y-8">

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              ReplyKaro ("we," "our," or "us") is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your
              information when you use our Instagram direct message automation service.
            </p>
            <p className="text-gray-600 leading-relaxed mt-4">
              By using ReplyKaro, you agree to the collection and use of information in
              accordance with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-medium mb-3 mt-6">2.1 Information from Instagram</h3>
            <p className="text-gray-600 mb-3">When you connect your Instagram Business or Creator account, we collect:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Profile Information:</strong> Instagram username, user ID, and profile picture</li>
              <li><strong>Access Tokens:</strong> Encrypted tokens to interact with Instagram on your behalf</li>
              <li><strong>Comments:</strong> Text of comments on your posts to detect keywords</li>
              <li><strong>Media Information:</strong> Post IDs, captions, and thumbnail URLs of your content</li>
              <li><strong>Direct Messages:</strong> Only messages sent through our automation (not your entire inbox)</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">2.2 Information You Provide</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Keywords and trigger phrases you configure</li>
              <li>Automated reply messages you create</li>
              <li>Payment information (processed securely by Razorpay - we never store credit card details)</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">2.3 Automatically Collected Information</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Log data (IP address, browser type, device information, access times)</li>
              <li>Usage data (features used, automations created, DMs sent)</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-600 mb-3">We use your information to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Provide Our Service:</strong> Enable Instagram DM automation based on your configured triggers</li>
              <li><strong>Send Automated Messages:</strong> Detect keywords in comments and send pre-written DMs</li>
              <li><strong>Analytics & Reporting:</strong> Show you statistics about your automations (DMs sent, engagement rates)</li>
              <li><strong>Process Payments:</strong> Handle subscription billing through Razorpay</li>
              <li><strong>Customer Support:</strong> Respond to your questions and provide technical assistance</li>
              <li><strong>Service Communications:</strong> Send important updates about service changes or security</li>
              <li><strong>Improve Our Service:</strong> Analyze usage patterns to enhance features and user experience</li>
              <li><strong>Comply with Legal Obligations:</strong> Fulfill regulatory and legal requirements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. How We Share Your Information</h2>
            <p className="text-gray-600 mb-3">
              <strong>We do NOT sell your personal information.</strong> We may share your data only with:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Service Providers:</strong> Vercel (hosting), Supabase (database), Razorpay (payments) - all under strict data protection agreements</li>
              <li><strong>Meta/Instagram:</strong> To provide automation services through their official API</li>
              <li><strong>Legal Requirements:</strong> When required by law, court order, or to protect our rights and safety</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets (with notice to you)</li>
            </ul>
            <p className="text-gray-600 mt-4">
              We never share your data with advertisers or third-party marketers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p className="text-gray-600 mb-3">We implement industry-standard security measures:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Encryption:</strong> All data transmitted using HTTPS/TLS 1.3</li>
              <li><strong>Secure Storage:</strong> Access tokens encrypted at rest using AES-256</li>
              <li><strong>Access Controls:</strong> Role-based permissions, limited employee access</li>
              <li><strong>Regular Audits:</strong> Quarterly security reviews and vulnerability scans</li>
              <li><strong>Infrastructure:</strong> Hosted on SOC 2 compliant platforms (Vercel, Supabase)</li>
            </ul>
            <p className="text-gray-600 mt-4">
              However, no method of transmission over the Internet is 100% secure.
              While we strive to protect your data, we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            <p className="text-gray-600 mb-3">We retain your data as follows:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Active Accounts:</strong> Data retained while your account is active</li>
              <li><strong>After Disconnection:</strong> Instagram access tokens immediately revoked</li>
              <li><strong>Account Deletion:</strong> All personal data deleted within 30 days of account deletion request</li>
              <li><strong>Logs & Analytics:</strong> Anonymized data may be retained for statistical purposes (no personal identifiers)</li>
              <li><strong>Legal Requirements:</strong> Some data retained longer if required by law (e.g., tax records: 7 years)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Your Rights & Choices</h2>
            <p className="text-gray-600 mb-3">You have the following rights:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update inaccurate or incomplete data</li>
              <li><strong>Deletion:</strong> Request deletion of your data (Account Settings → Delete Account)</li>
              <li><strong>Export:</strong> Download your data in a portable format</li>
              <li><strong>Withdraw Consent:</strong> Disconnect Instagram or delete automations anytime</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from marketing emails (we send very few)</li>
              <li><strong>Object:</strong> Object to certain data processing activities</li>
            </ul>
            <p className="text-gray-600 mt-4">
              To exercise these rights, email us at: <strong>privacy@replykaro.com</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Third-Party Services</h2>
            <p className="text-gray-600 mb-3">
              Our service integrates with Instagram (owned by Meta). Your use of Instagram
              is subject to Meta's Privacy Policy and Terms of Service:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Meta Privacy Policy: <a href="https://www.facebook.com/privacy/policy" className="text-primary underline">facebook.com/privacy/policy</a></li>
              <li>Instagram Terms: <a href="https://help.instagram.com/581066165581870" className="text-primary underline">Instagram Terms of Use</a></li>
            </ul>
            <p className="text-gray-600 mt-4">
              We are not responsible for Meta's privacy practices. Please review their
              policies independently.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
            <p className="text-gray-600">
              ReplyKaro is not intended for users under 18 years of age. We do not knowingly
              collect information from children. If you believe we have collected data from
              a minor, please contact us immediately at privacy@replykaro.com and we will
              delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. International Data Transfers</h2>
            <p className="text-gray-600">
              Your information may be transferred to and processed in countries other than
              India, including the United States (where our infrastructure providers are located).
              We ensure appropriate safeguards are in place through:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-3">
              <li>Standard Contractual Clauses with service providers</li>
              <li>Adequacy decisions by relevant authorities</li>
              <li>SOC 2 and ISO 27001 certified partners</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Changes to This Policy</h2>
            <p className="text-gray-600">
              We may update this Privacy Policy periodically. Changes will be posted on this
              page with an updated "Last updated" date. Material changes will be notified via:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-3">
              <li>Email notification (if you have an account)</li>
              <li>In-app notification</li>
              <li>Prominent notice on our website</li>
            </ul>
            <p className="text-gray-600 mt-4">
              Continued use of the service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
            <p className="text-gray-600 mb-3">
              If you have questions, concerns, or requests regarding this Privacy Policy or
              your personal data, please contact us:
            </p>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-700"><strong>Email:</strong> privacy@replykaro.com</p>
              <p className="text-gray-700 mt-2"><strong>Support:</strong> support@replykaro.com</p>
              <p className="text-gray-700 mt-2"><strong>Address:</strong> Mumbai, Maharashtra, India</p>
              <p className="text-gray-700 mt-2"><strong>Response Time:</strong> Within 48 hours</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Data Protection Officer</h2>
            <p className="text-gray-600">
              For data protection inquiries specific to GDPR or other privacy regulations,
              you may contact our Data Protection Officer at: <strong>dpo@replykaro.com</strong>
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
              <a href="/terms" className="text-sm text-gray-500 hover:text-gray-900">
                Terms of Service
              </a>
              <a href="/privacy" className="text-sm text-primary font-medium">
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
