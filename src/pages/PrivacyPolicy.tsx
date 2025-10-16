import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-theme-black text-theme-text">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="mb-12">
          <Link 
            to="/" 
            className="inline-flex items-center text-theme-light hover:text-theme-text transition-colors mb-6"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-theme-text font-raleway mb-4">
            Privacy Policy
          </h1>
          <p className="text-theme-light text-lg">
            Last updated: October 16, 2025
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          <p className="text-theme-light leading-relaxed mb-8">
            Daygen operates the website daygen.ai. This Privacy Policy explains how we collect, use, and safeguard your information when you use our website and services. By accessing or using Daygen, you agree to the practices described in this policy.
          </p>

          <div className="border-t border-theme-mid pt-8 mb-8">
            <h2 className="text-2xl font-semibold text-theme-text font-raleway mb-6">
              1. Information We Collect
            </h2>
            <p className="text-theme-light leading-relaxed mb-4">
              We may collect the following types of information:
            </p>
            <ul className="list-disc list-inside text-theme-light space-y-2 mb-6">
              <li><strong className="text-theme-text">Personal Information:</strong> Name, email address, phone number, billing information, or other details you provide when signing up or contacting us.</li>
              <li><strong className="text-theme-text">Usage Data:</strong> Information about how you interact with our site, such as IP address, browser type, device details, pages visited, and time spent.</li>
              <li><strong className="text-theme-text">Cookies & Tracking Technologies:</strong> We use cookies and similar tools to enhance user experience, personalize content, and analyze traffic.</li>
            </ul>
          </div>

          <div className="border-t border-theme-mid pt-8 mb-8">
            <h2 className="text-2xl font-semibold text-theme-text font-raleway mb-6">
              2. How We Use Your Information
            </h2>
            <p className="text-theme-light leading-relaxed mb-4">
              Your information may be used to:
            </p>
            <ul className="list-disc list-inside text-theme-light space-y-2 mb-6">
              <li>Provide, maintain, and improve our services.</li>
              <li>Process payments and deliver products or services.</li>
              <li>Respond to your inquiries and provide customer support.</li>
              <li>Send updates, newsletters, or promotional materials (if you consent).</li>
              <li>Monitor website usage and improve performance.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </div>

          <div className="border-t border-theme-mid pt-8 mb-8">
            <h2 className="text-2xl font-semibold text-theme-text font-raleway mb-6">
              3. Sharing of Information
            </h2>
            <p className="text-theme-light leading-relaxed mb-4">
              We do not sell or rent your personal information. We may share data with:
            </p>
            <ul className="list-disc list-inside text-theme-light space-y-2 mb-6">
              <li><strong className="text-theme-text">Service Providers:</strong> Third-party vendors who help us operate our website and services.</li>
              <li><strong className="text-theme-text">Legal Authorities:</strong> When required to comply with laws, regulations, or government requests.</li>
              <li><strong className="text-theme-text">Business Transfers:</strong> In connection with a merger, acquisition, or sale of our assets.</li>
            </ul>
          </div>

          <div className="border-t border-theme-mid pt-8 mb-8">
            <h2 className="text-2xl font-semibold text-theme-text font-raleway mb-6">
              4. Data Security
            </h2>
            <p className="text-theme-light leading-relaxed mb-6">
              We use reasonable technical and organizational measures to protect your personal data. However, no method of transmission or storage is completely secure, and we cannot guarantee absolute protection.
            </p>
          </div>

          <div className="border-t border-theme-mid pt-8 mb-8">
            <h2 className="text-2xl font-semibold text-theme-text font-raleway mb-6">
              5. Your Rights
            </h2>
            <p className="text-theme-light leading-relaxed mb-4">
              Depending on your location, you may have rights under applicable laws (such as GDPR or CCPA), including:
            </p>
            <ul className="list-disc list-inside text-theme-light space-y-2 mb-4">
              <li>Accessing and receiving a copy of your data.</li>
              <li>Requesting correction or deletion of your data.</li>
              <li>Objecting to or restricting certain data processing.</li>
              <li>Withdrawing consent for marketing communications.</li>
            </ul>
            <p className="text-theme-light leading-relaxed mb-6">
              To exercise these rights, please contact us at <a href="mailto:privacy@daygen.ai" className="text-theme-accent hover:text-theme-text transition-colors">privacy@daygen.ai</a>.
            </p>
          </div>

          <div className="border-t border-theme-mid pt-8 mb-8">
            <h2 className="text-2xl font-semibold text-theme-text font-raleway mb-6">
              6. Cookies & Tracking
            </h2>
            <p className="text-theme-light leading-relaxed mb-6">
              You may adjust your browser settings to block or delete cookies. Please note that disabling cookies may impact site functionality.
            </p>
          </div>

          <div className="border-t border-theme-mid pt-8 mb-8">
            <h2 className="text-2xl font-semibold text-theme-text font-raleway mb-6">
              7. Third-Party Links
            </h2>
            <p className="text-theme-light leading-relaxed mb-6">
              Our website may contain links to external sites. We are not responsible for the privacy practices or content of those websites.
            </p>
          </div>

          <div className="border-t border-theme-mid pt-8 mb-8">
            <h2 className="text-2xl font-semibold text-theme-text font-raleway mb-6">
              8. Children's Privacy
            </h2>
            <p className="text-theme-light leading-relaxed mb-6">
              Daygen is not directed toward children under the age of 13 (or the minimum age in your jurisdiction). We do not knowingly collect personal data from children.
            </p>
          </div>

          <div className="border-t border-theme-mid pt-8 mb-8">
            <h2 className="text-2xl font-semibold text-theme-text font-raleway mb-6">
              9. Changes to This Policy
            </h2>
            <p className="text-theme-light leading-relaxed mb-6">
              We may update this Privacy Policy from time to time. Updates will be posted on this page with the revised "Last updated" date.
            </p>
          </div>

          <div className="border-t border-theme-mid pt-8 mb-8">
            <h2 className="text-2xl font-semibold text-theme-text font-raleway mb-6">
              10. Contact Us
            </h2>
            <p className="text-theme-light leading-relaxed mb-4">
              If you have any questions about this Privacy Policy, please contact us:
            </p>
            <div className="bg-theme-dark p-6 rounded-lg">
              <p className="text-theme-text font-semibold mb-2">Daygen</p>
              <p className="text-theme-light mb-1">Website: <a href="https://daygen.ai" className="text-theme-accent hover:text-theme-text transition-colors">daygen.ai</a></p>
              <p className="text-theme-light">Email: <a href="mailto:team@daygen.ai" className="text-theme-accent hover:text-theme-text transition-colors">team@daygen.ai</a></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
