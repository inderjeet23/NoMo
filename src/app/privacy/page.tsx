import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy • NoMo',
  description: 'How NoMo collects, uses, and protects your data.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-app text-app px-3 sm:px-4 pb-24">
      <div className="w-full max-w-3xl mx-auto py-10">
        <h1 className="text-3xl sm:text-4xl font-black mb-4">Privacy Policy</h1>
        <div className="text-sm text-neutral-400 mb-6">Last updated: {new Date().toLocaleDateString()}</div>

        <article className="prose max-w-none prose-invert card p-6 rounded-2xl">
          <h2>Who we are</h2>
          <p>
            NoMo (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) helps you manage and cancel subscriptions. This policy explains what
            information we collect, how we use it, and your choices. By using NoMo, you agree to this policy.
          </p>

          <h2>Information we collect</h2>
          <ul>
            <li>
              <strong>Account data</strong>: When you sign in with Google, we receive your name, email address, and
              profile image from Google OAuth. We do not receive your Google password.
            </li>
            <li>
              <strong>App data</strong>: Subscriptions you add, edit, remove, or mark as canceled. This includes fields
              like name, price, cadence, and next charge date.
            </li>
            <li>
              <strong>AI requests</strong>: Prompts you send to generate guides/insights and the resulting model output.
            </li>
            <li>
              <strong>Device/usage</strong>: Basic analytics about feature usage to improve the product. We do not sell
              this data.
            </li>
            <li>
              <strong>Optional Gmail scan</strong> (disabled by default): If you explicitly grant Gmail Readonly access,
              we analyze recent messages to detect subscription vendors. We never store email content long‑term; we only
              store detected vendor identifiers. You can revoke access at any time in your Google account settings.
            </li>
          </ul>

          <h2>How we use data</h2>
          <ul>
            <li>Provide core features (sync your subscriptions across devices via Firestore).</li>
            <li>Generate step‑by‑step cancellation guides using a third‑party model (Google Gemini).</li>
            <li>Maintain security, prevent abuse, and improve the app through aggregated analytics.</li>
            <li>Communicate important changes (policy updates, security notices).</li>
          </ul>

          <h2>Data sharing</h2>
          <p>
            We do not sell your data. We share data only with service providers that help us operate NoMo (e.g., Google
            for authentication/Gemini, Firebase for storage/analytics). Providers process data under contractual
            safeguards and only as instructed by us.
          </p>

          <h2>Data retention</h2>
          <p>
            We keep account and subscription data while your account is active. You may request deletion of your data at
            any time; we will delete or anonymize data unless we must keep it for legal or safety reasons.
          </p>

          <h2>Your rights</h2>
          <ul>
            <li>Access, correct, or delete your data.</li>
            <li>Export your data in a portable format (upon request).</li>
            <li>Withdraw consent, including revoking Gmail access in your Google account settings.</li>
          </ul>

          <h2>Security</h2>
          <p>
            We use industry‑standard security practices and restrict access to production systems. No method of storage
            or transmission is 100% secure, but we work to protect your information against unauthorized access.
          </p>

          <h2>Children</h2>
          <p>NoMo is not directed to children under 13, and we do not knowingly collect data from them.</p>

          <h2>International users</h2>
          <p>
            By using NoMo, you understand that your data may be processed and stored in the United States and other
            countries where our providers operate.
          </p>

          <h2>Changes to this policy</h2>
          <p>
            We may update this policy. We will post the updated version with a new “Last updated” date. Material changes
            will be highlighted in‑app or by email when appropriate.
          </p>

          <h2>Contact</h2>
          <p>Questions or requests: <a href="mailto:support@nomosubs.com">support@nomosubs.com</a></p>
        </article>
      </div>
    </main>
  );
}


