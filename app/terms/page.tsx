export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white px-4 py-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[#0a0a14]/95 p-8 shadow-[0_0_40px_rgba(0,0,0,0.45)]">
        <h1 className="text-3xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-400 uppercase">Terms of Service</h1>
        <p className="mt-4 text-sm text-gray-300 leading-relaxed">
          Welcome to AJ Super Portal. These Terms of Service govern your use of our gaming and rewards platform, including TikReels, Live streaming, surveys, and wallet features. By using the portal, you agree to the rules and protections outlined below.
        </p>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-black text-white">1. Accepting Terms</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Use of AJ Super Portal requires acceptance of these Terms. If you do not agree with these terms, please do not use the portal. We may update this document at any time, and continued access means you accept the changes.
          </p>
        </section>

        <section className="mt-6 space-y-4">
          <h2 className="text-xl font-black text-white">2. Eligible Users</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Our platform is intended for users who can lawfully participate in online gaming and reward programs. You must be authorized in your location and must not be barred by any applicable local laws.
          </p>
        </section>

        <section className="mt-6 space-y-4">
          <h2 className="text-xl font-black text-white">3. Account Responsibility</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            You are responsible for any activity that occurs under your account. Keep your login credentials secure and notify us immediately if you suspect unauthorized access.
          </p>
        </section>

        <section className="mt-6 space-y-4">
          <h2 className="text-xl font-black text-white">4. Rewards and Wallet</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Coins earned through surveys, live streams, or gameplay are credited to your Main Hub wallet. Reward values are set by AJ Super Portal and may be subject to audit, verification, and adjustment for fraud prevention.
          </p>
          <p className="text-sm text-gray-300 leading-relaxed">
            Survey earnings are shared with the platform, and while you receive the full amount in your wallet, AJ Super Portal also records a platform revenue share to support system operation and rewards continuity.
          </p>
        </section>

        <section className="mt-6 space-y-4">
          <h2 className="text-xl font-black text-white">5. Conduct and Fair Play</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Users must behave respectfully and avoid cheating, exploiting bugs, or manipulating reward systems. We reserve the right to suspend or ban accounts that violate our policies or compromise the platform.</p>
        </section>

        <section className="mt-6 space-y-4">
          <h2 className="text-xl font-black text-white">6. Platform Access</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            AJ Super Portal is optimized for web and PWA installation on supported devices. If your device does not support native installation, you may still access the portal through a compatible browser window.
          </p>
        </section>

        <section className="mt-6 space-y-4">
          <h2 className="text-xl font-black text-white">7. Termination</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            We may suspend or terminate access for any user who violates these Terms or engages in harmful activity. Termination may result in forfeiture of rewards and removal of account data.
          </p>
        </section>

        <section className="mt-6 space-y-4">
          <h2 className="text-xl font-black text-white">8. Contact</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            For questions or support, please contact our team at ajcreatorstudio.hq@gmail.com. We are here to help with account, wallet, and portal matters.
          </p>
        </section>
      </div>
    </main>
  );
}
