import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const contactReasons = [
  {
    key: "technical",
    label: "Technical Issue",
    description: "Report bugs or technical problems",
    icon: "Bug",
    sortOrder: 1,
  },
  {
    key: "billing",
    label: "Billing Question",
    description: "Questions about payments or subscriptions",
    icon: "CreditCard",
    sortOrder: 2,
  },
  {
    key: "account",
    label: "Account Security",
    description: "Account access or security concerns",
    icon: "Shield",
    sortOrder: 3,
  },
  {
    key: "feature",
    label: "Feature Request",
    description: "Suggest new features or improvements",
    icon: "MessageCircle",
    sortOrder: 4,
  },
  {
    key: "general",
    label: "General Support",
    description: "General questions or assistance",
    icon: "HelpCircle",
    sortOrder: 5,
  },
];

async function main() {
  console.log("🌱 Seeding contact reasons...");

  for (const reason of contactReasons) {
    const existing = await prisma.contactReason.findUnique({
      where: { key: reason.key },
    });

    if (existing) {
      console.log(`✅ Contact reason "${reason.label}" already exists`);
      continue;
    }

    const created = await prisma.contactReason.create({
      data: reason,
    });

    console.log(`✅ Created contact reason: ${created.label}`);
  }

  console.log("🎉 Contact reasons seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding contact reasons:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
