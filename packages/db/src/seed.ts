import { db } from "./client";
import { hashPassword } from "@shared/base";

async function main() {
  console.log("🌱 Seeding database...");

  // Create a test user
  const hashedPassword = await hashPassword("password123");
  
  const user = await db.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      name: "Test User",
      hashedPassword,
    },
  });

  console.log("✅ Created user:", user.email);
  console.log("🔑 Test credentials: test@example.com / password123");
  
  await db.$disconnect();
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  });
