export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white px-4 py-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[#0a0a14]/95 p-8 shadow-[0_0_40px_rgba(0,0,0,0.45)]">
        <h1 className="text-3xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-400 uppercase">Privacy Policy</h1>
        <p className="mt-4 text-sm text-gray-300 leading-relaxed">
          AJ Super Portal values your privacy. This Privacy Policy explains how we collect, use, and protect your information as you use our rewards, live streaming, and gaming portal.
        </p>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-black text-white">1. Information We Collect</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            We collect only the information required to create and maintain your account, manage your wallet balance, and enable portal features such as live streaming, offers, and notifications.
          </p>
        </section>

        <section className="mt-6 space-y-4">
          <h2 className="text-xl font-black text-white">2. How We Use Your Data</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Your data is used to verify your identity, credit rewards to your Main Hub wallet, personalize your experience, and keep the portal secure and reliable. We do not sell your personal information.
          </p>
        </section>

        <section className="mt-6 space-y-4">
          <h2 className="text-xl font-black text-white">3. Wallet and Reward Tracking</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Wallet balances and reward history are stored securely so you can track your earnings. Survey and offer credits are processed through server-side postbacks to ensure accurate user balance updates and platform revenue accounting.
          </p>
        </section>

        <section className="mt-6 space-y-4">
          <h2 className="text-xl font-black text-white">4. Cookies and Tracking</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            We may use cookies and browser storage to support login sessions, theme preferences, and core portal features. Third-party analytics may also be used to improve service quality.
          </p>
        </section>

        <section className="mt-6 space-y-4">
          <h2 className="text-xl font-black text-white">5. Security</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            We use standard technical measures to protect your information. However, no online system is completely secure, so please keep your account credentials safe.
          </p>
        </section>

        <section className="mt-6 space-y-4">
          <h2 className="text-xl font-black text-white">6. Children</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            The portal is not intended for children under applicable age restrictions. If you believe a child account has been created without proper consent, contact us for assistance.
          </p>
        </section>

        <section className="mt-6 space-y-4">
          <h2 className="text-xl font-black text-white">7. Contact</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Questions about our Privacy Policy may be sent to ajcreatorstudio.hq@gmail.com. We will respond and help resolve any privacy concerns.
          </p>
        </section>
      </div>
    </main>
  );
}
