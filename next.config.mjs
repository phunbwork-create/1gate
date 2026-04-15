/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Prevent Prisma from being bundled into client-side code (Next.js 14)
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
}

export default nextConfig
