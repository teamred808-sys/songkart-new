import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const user = await prisma.profiles.findFirst({ where: { email: 'teamred808@gmail.com' } });
  if (user) {
    const existing = await prisma.user_roles.findFirst({ where: { user_id: user.id, role: 'seller' } });
    if (!existing) {
      await prisma.user_roles.create({ data: { user_id: user.id, role: 'seller' } });
      console.log('Seller role added');
    } else {
      console.log('Seller role already exists');
    }
  } else {
    console.log('User not found');
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
