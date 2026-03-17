import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const user = await prisma.profiles.findFirst({ where: { email: 'teamred808@gmail.com' } });
  if (user) {
    const items = await prisma.cart_items.findMany({
      where: { user_id: user.id },
      include: {
        songs: { include: { genres: true, profiles: { select: { id: true, full_name: true, avatar_url: true } } } },
        license_tiers: true,
      },
      orderBy: { created_at: 'desc' },
    });
    console.log(JSON.stringify(items, null, 2));
  } else {
    console.log("No user");
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
