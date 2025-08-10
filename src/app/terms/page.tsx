import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service • NoMo',
  description: 'Terms governing use of the NoMo application.',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-app text-app px-3 sm:px-4 pb-24">
      <div className="w-full max-w-3xl mx-auto py-10">
        <h1 className="text-3xl sm:text-4xl font-black mb-4">Terms of Service</h1>
        <div className="text-sm text-neutral-400 mb-6">Last updated: {new Date().toLocaleDateString()}</div>

        <article className="prose max-w-none prose-invert card p-6 rounded-2xl">
          <h2>1. Agreement to terms</h2>
          <p>
            By accessing or using NoMo (the “Service”), you agree to these Terms. If you do not agree, do not use the
            Service.
          </p>

          <h2>2. Eligibility</h2>
          <p>You must be at least 13 years old to use the Service.</p>

          <h2>3. Accounts</h2>
          <p>
            You may sign in with Google. You are responsible for maintaining the security of your account and for all
            activity that occurs under it.
          </p>

          <h2>4. Acceptable use</h2>
          <ul>
            <li>Do not misuse the Service or attempt to access it using a method other than the provided interface.</li>
            <li>Do not reverse engineer, probe, or disrupt our systems or third‑party providers.</li>
            <li>Do not upload unlawful, harmful, or infringing content.</li>
          </ul>

          <h2>5. Subscriptions and guidance</h2>
          <p>
            NoMo aggregates cancellation links and generates AI‑assisted guides using third‑party models. We strive for
            accuracy but cannot guarantee completeness or outcomes. You are responsible for your decisions and any
            account changes made with vendors.
          </p>

          <h2>6. Privacy</h2>
          <p>
            Our <a href="/privacy">Privacy Policy</a> explains how we collect and use information. By using the Service,
            you consent to our data practices.
          </p>

          <h2>7. Intellectual property</h2>
          <p>
            The Service, including text, UI, and software, is owned by us or our licensors and is protected by law. You
            receive a limited, non‑exclusive, non‑transferable license to use the Service as provided.
          </p>

          <h2>8. Third‑party services</h2>
          <p>
            The Service integrates third‑party services (e.g., Google Sign‑In, Firebase, Gemini). Their terms and
            privacy policies apply to your use of those services.
          </p>

          <h2>9. Disclaimers</h2>
          <p>
            THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL
            WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
            NON‑INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED OR ERROR‑FREE.
          </p>

          <h2>10. Limitation of liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
            CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR DATA, ARISING FROM OR RELATED TO YOUR USE OF
            THE SERVICE.
          </p>

          <h2>11. Changes to the Service</h2>
          <p>We may modify, suspend, or discontinue the Service at any time, with or without notice.</p>

          <h2>12. Termination</h2>
          <p>
            You may stop using the Service at any time. We may suspend or terminate access if you violate these Terms or
            if necessary to protect the Service or other users.
          </p>

          <h2>13. Governing law</h2>
          <p>These Terms are governed by the laws of the State of California, without regard to conflict‑of‑laws rules.</p>

          <h2>14. Contact</h2>
          <p>Questions about these Terms: <a href="mailto:legal@nomosubs.com">legal@nomosubs.com</a></p>
        </article>
      </div>
    </main>
  );
}


