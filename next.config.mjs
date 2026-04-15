/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Prisma from being bundled into client-side code
  serverExternalPackages: ["@prisma/client", "prisma"],
}

export default nextConfig
