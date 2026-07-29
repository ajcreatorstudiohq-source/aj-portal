/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // Keep Admin SDK out of the RSC/route bundler — prevents Vercel 500s on import
  serverExternalPackages: ['firebase-admin', '@google-cloud/firestore'],
};
export default nextConfig;
