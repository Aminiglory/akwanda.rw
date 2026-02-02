import React from 'react';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="modern-card p-6">
          <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
          <p className="text-sm text-gray-500 mt-1">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="mt-6 space-y-6 text-gray-800">
            <section>
              <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
              <p className="mt-2 text-gray-700">
                By accessing or using Akwanda (“AkwandaTravels.com”, “we”, “us”), you agree to these Terms of Service (the “Terms”).
                If you do not agree, do not use the Services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">2. The Services</h2>
              <p className="mt-2 text-gray-700">
                Akwanda provides a platform that connects guests with hosts and listings (stays, vehicles, experiences, attractions)
                and enables search, booking, payments, messaging, and support.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">3. Accounts</h2>
              <div className="mt-2 space-y-2 text-gray-700">
                <p>You are responsible for keeping your account credentials secure.</p>
                <p>You must provide accurate information and keep it updated.</p>
                <p>We may suspend accounts for fraud, abuse, or violations of these Terms.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold">4. Bookings, payments, and cancellations</h2>
              <div className="mt-2 space-y-2 text-gray-700">
                <p><strong>Bookings:</strong> A booking is a request/transaction between a guest and host subject to availability and confirmation.</p>
                <p><strong>Payments:</strong> Payments may be required to complete certain bookings. Fees/commissions may apply.</p>
                <p><strong>Cancellations:</strong> Cancellation rules depend on the listing policy and booking status. Akwanda may record cancellation reasons.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold">5. Host responsibilities</h2>
              <div className="mt-2 space-y-2 text-gray-700">
                <p>Hosts must provide accurate listing details, pricing, availability, and house rules.</p>
                <p>Hosts must comply with applicable laws, safety requirements, and tax obligations.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold">6. User content and reviews</h2>
              <p className="mt-2 text-gray-700">
                Users may post listings, messages, and reviews. You grant Akwanda a license to display this content as part of the Services.
                Content must not be illegal, misleading, or abusive.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">7. Prohibited conduct</h2>
              <div className="mt-2 space-y-2 text-gray-700">
                <ul className="list-disc pl-6 space-y-1">
                  <li>Fraud, impersonation, or unauthorized access.</li>
                  <li>Harassment, hate speech, or abusive behavior.</li>
                  <li>Uploading malicious code or attempting to disrupt the platform.</li>
                  <li>Using the Services in violation of laws or third-party rights.</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold">8. Disclaimer and limitation of liability</h2>
              <p className="mt-2 text-gray-700">
                The Services are provided “as is”. To the maximum extent permitted by law, Akwanda is not liable for indirect or
                consequential damages. Hosts are responsible for their listings and services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">9. Changes to these Terms</h2>
              <p className="mt-2 text-gray-700">
                We may update these Terms from time to time. Continued use of the Services after updates means you accept the changes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">10. Contact</h2>
              <p className="mt-2 text-gray-700">
                Questions about these Terms can be sent to <strong>info@akwanda.rw</strong>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
