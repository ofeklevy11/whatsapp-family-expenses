import { PrismaClient } from "@prisma/client";

/**
 * Single PrismaClient instance, reused across hot reloads in dev and
 * shared by both the Next.js app and the standalone bot process.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
