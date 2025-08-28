import { PrismaClient } from "./generated/client";
import { config } from "dotenv";
import path from "path";

// Load environment variables from the root .env file
config({ path: path.resolve(__dirname, "../../../.env") });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query"] : [],
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
