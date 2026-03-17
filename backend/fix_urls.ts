import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const songs = await prisma.songs.findMany();
  for (const song of songs) {
    let updated = false;
    const data: any = {};
    if (song.cover_image_url?.includes('https://songkart.com/assets/uploads')) {
      data.cover_image_url = song.cover_image_url.replace('https://songkart.com/assets/uploads', 'http://localhost:5001/uploads');
      data.artwork_cropped_url = song.artwork_cropped_url?.replace('https://songkart.com/assets/uploads', 'http://localhost:5001/uploads');
      updated = true;
    }
    if (song.audio_url?.includes('https://songkart.com/assets/uploads')) {
      data.audio_url = song.audio_url.replace('https://songkart.com/assets/uploads', 'http://localhost:5001/uploads');
      updated = true;
    }
    if (song.preview_audio_url?.includes('https://songkart.com/assets/uploads')) {
      data.preview_audio_url = song.preview_audio_url.replace('https://songkart.com/assets/uploads', 'http://localhost:5001/uploads');
      updated = true;
    }
    
    if (updated) {
      await prisma.songs.update({ where: { id: song.id }, data });
    }
  }
  
  const profiles = await prisma.profiles.findMany();
  for (const p of profiles) {
    if (p.avatar_url?.includes('https://songkart.com/assets/uploads')) {
      await prisma.profiles.update({
        where: { id: p.id },
        data: { avatar_url: p.avatar_url.replace('https://songkart.com/assets/uploads', 'http://localhost:5001/uploads') }
      });
    }
  }
  console.log("Database URLs fixed for local testing.");
}

run().catch(console.error).finally(() => prisma.$disconnect());
