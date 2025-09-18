import { PrismaClient } from "./generated/client";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables from the root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, "../../../.env") });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query"] : [],
}); // Updated with channels field - restart required

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
