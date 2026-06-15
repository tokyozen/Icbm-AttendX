import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const oldEmail = "abesshussein@gmail.com"
  const bootstrapEmail = "admin@icbm-attendx.com"
  const newEmail = "ahussein@sbtsgroup.com"
  const newPassword = "t0ky0hu$$31n@b3$$"

  const passwordHash = await bcrypt.hash(newPassword, 12)

  // Update the personal super admin account to the new work email + password
  const updated = await prisma.user.update({
    where: { email: oldEmail },
    data: { email: newEmail, passwordHash },
  })
  console.log(`Updated account: ${oldEmail} → ${updated.email}`)

  // Remove the stale bootstrap admin account
  const deleted = await prisma.user.deleteMany({
    where: { email: bootstrapEmail },
  })
  console.log(`Removed ${deleted.count} bootstrap admin account(s) (${bootstrapEmail})`)

  console.log("Password updated successfully")
  console.log(`\nActive super admin: ${newEmail}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
