/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // Required for Docker deployments
  experimental: {
    // Prevent Prisma from being bundled into client-side code (Next.js 14)
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
  // ESLint is run separately in CI — don't block production builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Content-Disposition",
            value: "inline",
          },
        ],
      },
    ]
  },
}

export default nextConfig
