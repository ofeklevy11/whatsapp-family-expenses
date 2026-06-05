/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Server-only deps; keep them out of the client/edge bundle.
  serverExternalPackages: ["@prisma/client", "prisma", "pdf-parse"],
  // The WhatsApp bot (Baileys) rewrites its session files in /auth constantly,
  // and uploads land in /uploads. Both live inside the project root, so the dev
  // watcher would otherwise trigger a Fast Refresh rebuild every few seconds —
  // causing reload loops and transient 500/404s. Exclude runtime dirs here.
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.next/**",
          "**/.git/**",
          "**/auth/**",
          "**/auth_info*/**",
          "**/uploads/**",
          "**/whatsapp-qr.png",
          "**/*.log",
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
