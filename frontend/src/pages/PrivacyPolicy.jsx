import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="modern-card p-6">
          <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mt-1">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="mt-6 space-y-6 text-gray-800">
            <section>
              <h2 className="text-xl font-semibold">1. Overview</h2>
              <p className="mt-2 text-gray-700">
                This Privacy Policy explains how Akwanda (“AkwandaTravels.com”, “we”, “us”) collects, uses, shares, and protects
                information when you use our website, mobile experiences, and related services (the “Services”).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">2. Information we collect</h2>
              <div className="mt-2 space-y-2 text-gray-700">
                <p><strong>Account data:</strong> name, email, phone number, password (stored as a secure hash), user type (guest/host).</p>
                <p><strong>Booking & transaction data:</strong> booking details, payment status, receipts/invoices, and service history.</p>
                <p><strong>Communications:</strong> messages between guests and hosts, support tickets, and feedback.</p>
                <p><strong>Content you provide:</strong> property listings, images, descriptions, amenities, reviews, and ratings.</p>
                <p><strong>Technical data:</strong> device/browser information, IP address, logs, and cookies used for authentication and security.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold">3. How we use your information</h2>
              <div className="mt-2 space-y-2 text-gray-700">
                <p>We use information to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Provide and improve the Services (search, booking, payments, messaging).</li>
                  <li>Verify users and prevent fraud/abuse.</li>
                  <li>Send important notifications (booking updates, security, support responses).</li>
                  <li>Personalize your experience (saved items, language preferences).</li>
                  <li>Comply with legal and regulatory requirements.</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold">4. Sharing of information</h2>
              <div className="mt-2 space-y-2 text-gray-700">
                <p>We may share information:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Between guests and hosts</strong> as needed to complete a booking (e.g., contact and booking details).</li>
                  <li><strong>With service providers</strong> (e.g., payment processing, communications, hosting) under confidentiality obligations.</li>
                  <li><strong>For legal reasons</strong> if required by law or to protect rights, safety, and security.</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold">5. Data retention</h2>
              <p className="mt-2 text-gray-700">
                We retain personal data for as long as necessary to provide the Services, comply with legal obligations, resolve disputes,
                and enforce agreements. Retention periods may differ depending on data type.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">6. Security</h2>
              <p className="mt-2 text-gray-700">
                We implement technical and organizational measures to protect your information. However, no system is 100% secure.
                Please protect your account credentials and notify us if you suspect unauthorized access.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">7. Your choices</h2>
              <div className="mt-2 space-y-2 text-gray-700">
                <p>You can:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Update profile information in your account settings.</li>
                  <li>Control notification preferences (where available).</li>
                  <li>Request access, correction, or deletion of your data, subject to legal requirements.</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold">8. Contact us</h2>
              <p className="mt-2 text-gray-700">
                If you have questions about this Privacy Policy, contact us at <strong>info@akwanda.rw</strong>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
