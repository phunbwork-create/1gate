/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Prevent Prisma from being bundled into client-side code (Next.js 14)
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
  // ESLint is run separately in CI — don't block production builds
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
