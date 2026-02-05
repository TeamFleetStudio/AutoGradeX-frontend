/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't use standalone - it has binding issues in containers
  // output: 'standalone',
  
  // Disable ESLint during build (run separately in CI)
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
