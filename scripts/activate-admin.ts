import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

const SUPER_ADMIN_EMAIL = "admin@icbm-attendx.com";

async function main() {
  const result = await prisma.user.updateMany({
    where: { email: SUPER_ADMIN_EMAIL },
    data: { isActive: true, isApproved: true },
  });

  if (result.count === 0) {
    console.error(`Super admin not found: ${SUPER_ADMIN_EMAIL}`);
    process.exit(1);
  }

  console.log(`✓ Super admin (${SUPER_ADMIN_EMAIL}) activated — isActive=true, isApproved=true`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
