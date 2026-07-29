/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // Keep Admin SDK + gRPC native deps out of the webpack/turbopack graph.
  // Prevents Vercel "module not found" for @grpc/grpc-js / google-gax on client bundles.
  serverExternalPackages: [
    'firebase-admin',
    '@google-cloud/firestore',
    '@google-cloud/storage',
    'google-gax',
    '@grpc/grpc-js',
    '@grpc/proto-loader',
    'protobufjs',
  ],
};
export default nextConfig;
