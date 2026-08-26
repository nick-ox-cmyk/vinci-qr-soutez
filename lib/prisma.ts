import { PrismaClient } from "@prisma/client";

// Standardní Next.js singleton pattern — zabraňuje vzniku nového PrismaClient
// při každém hot-reloadu ve vývoji.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
