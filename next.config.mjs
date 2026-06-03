/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prisma is a server-only dependency; keep it out of the client bundle.
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
