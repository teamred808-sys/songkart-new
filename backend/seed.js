const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function seed() {
  const genres = ['Pop','Rock','Hip Hop','R&B','Jazz','Classical','Electronic','Country','Folk','Reggae','Blues','Latin','Indie','Metal','Punk','Soul','Funk','Ambient','Lo-Fi','Bollywood'];
  for (const name of genres) {
    await p.genres.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log('Genres seeded:', genres.length);

  const moods = ['Happy','Sad','Energetic','Chill','Romantic','Dark','Uplifting','Melancholic','Aggressive','Peaceful','Dreamy','Intense','Playful','Mysterious','Nostalgic'];
  for (const name of moods) {
    await p.moods.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log('Moods seeded:', moods.length);

  const sellers = await p.user_roles.findMany({ where: { role: 'seller' } });
  for (const s of sellers) {
    const ex = await p.seller_wallets.findUnique({ where: { user_id: s.user_id } });
    if (!ex) {
      await p.seller_wallets.create({ data: { user_id: s.user_id } });
      console.log('Wallet created:', s.user_id);
    }
  }

  await p.$disconnect();
  console.log('Done!');
}

seed().catch(e => { console.error(e.message); p.$disconnect(); });
