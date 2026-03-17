import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all songs (with full filtering for Browse page)
router.get('/', async (req: Request, res: Response) => {
  try {
    const sellerId = req.query.seller_id as string | undefined;
    const status = req.query.status as string | undefined;
    const id = req.query.id as string | undefined;
    const search = req.query.search as string | undefined;
    const genre = req.query.genre as string | undefined;
    const mood = req.query.mood as string | undefined;
    const language = req.query.language as string | undefined;
    const isFree = req.query.isFree as string | undefined;
    const isFeatured = req.query.isFeatured as string | undefined;
    const minPrice = req.query.minPrice as string | undefined;
    const maxPrice = req.query.maxPrice as string | undefined;
    const minBpm = req.query.minBpm as string | undefined;
    const maxBpm = req.query.maxBpm as string | undefined;
    const sortBy = req.query.sortBy as string | undefined;
    const totalRatings = req.query.total_ratings as string | undefined;

    const where: any = {};
    if (id) where.id = id;
    if (sellerId) {
      // Support Supabase-style "in.(id1,id2)" syntax
      const inMatch = sellerId.match(/^in\.\((.+)\)$/);
      if (inMatch && inMatch[1]) {
        where.seller_id = { in: inMatch[1].split(',').map((s: string) => s.trim()) };
      } else {
        where.seller_id = sellerId;
      }
    }
    if (status) {
      where.status = status;
    } else if (!id && !sellerId) {
      // Default to approved songs for public browse
      where.status = 'approved';
    }
    if (search) where.title = { contains: search, mode: 'insensitive' };
    if (genre && genre !== 'all') where.genre_id = genre;
    if (mood && mood !== 'all') where.mood_id = mood;
    if (language && language !== 'all') where.language = language;
    if (isFree === 'true') where.is_free = true;
    if (isFeatured === 'true') where.is_featured = true;
    if (minPrice || maxPrice) {
      where.base_price = {};
      if (minPrice) where.base_price.gte = parseFloat(minPrice);
      if (maxPrice) where.base_price.lte = parseFloat(maxPrice);
    }
    if (minBpm || maxBpm) {
      where.bpm = {};
      if (minBpm) where.bpm.gte = parseInt(minBpm);
      if (maxBpm) where.bpm.lte = parseInt(maxBpm);
    }
    if (totalRatings) {
      const gtMatch = totalRatings.match(/^gt\.(\d+)$/);
      if (gtMatch && gtMatch[1]) where.total_ratings = { gt: parseInt(gtMatch[1]) };
    }

    // Determine sort order
    let orderBy: any = { created_at: 'desc' };
    if (sortBy === 'price_low') orderBy = { base_price: 'asc' };
    else if (sortBy === 'price_high') orderBy = { base_price: 'desc' };
    else if (sortBy === 'popular') orderBy = { play_count: 'desc' };
    else if (sortBy === 'rating') orderBy = { average_rating: 'desc' };
    else if (sortBy === 'newest') orderBy = { created_at: 'desc' };

    const songs = await prisma.songs.findMany({
      where,
      include: {
        genres: true,
        moods: true,
        license_tiers: true,
        profiles: { select: { id: true, full_name: true, avatar_url: true, is_verified: true } },
      },
      orderBy,
      take: 100,
    });

    // Convert Decimal fields and map relations
    const mapped = songs.map((s: any) => ({
      ...s,
      base_price: Number(s.base_price),
      genre: s.genres || null,
      mood: s.moods || null,
      seller: s.profiles || null,
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching songs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get songs with full details (genre, mood, license_tiers)
router.get('/full', async (req: Request, res: Response) => {
  try {
    const sellerId = req.query.seller_id as string | undefined;
    const status = req.query.status as string | undefined;
    const isFree = req.query.is_free as string | undefined;
    const limitStr = req.query.limit as string | undefined;
    const approvedAt = req.query.approved_at as string | undefined;

    const where: any = {};
    if (sellerId) where.seller_id = sellerId;
    if (status) where.status = status;
    if (isFree === 'true') where.is_free = true;
    if (approvedAt) {
      const gteMatch = approvedAt.match(/^gte\.(.+)$/);
      if (gteMatch && gteMatch[1]) where.approved_at = { gte: new Date(gteMatch[1]) };
    }

    const findArgs: any = {
      where,
      include: {
        genres: true,
        moods: true,
        license_tiers: true,
      },
      orderBy: { created_at: 'desc' as const },
    };
    if (limitStr) findArgs.take = parseInt(limitStr);

    const songs = await prisma.songs.findMany(findArgs);

    const mapped = songs.map((s: any) => ({
      ...s,
      genre: s.genres || null,
      mood: s.moods || null,
      base_price: Number(s.base_price),
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching full songs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get license tiers for a specific song
router.get('/license_tiers/:songId', async (req: Request, res: Response) => {
  try {
    const songId = req.params['songId'] as string;
    const tiers = await prisma.license_tiers.findMany({
      where: { song_id: songId }, orderBy: { price: 'asc' },
    });
    const mapped = tiers.map((t: any) => ({ ...t, price: Number(t.price), current_sales: t.current_sales || 0 }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching song license tiers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific song
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params['id'] as string;

    if (!id) {
      res.status(400).json({ error: 'Invalid ID' });
      return;
    }

    const song = await prisma.songs.findUnique({
      where: { id },
      include: {
        genres: true,
        moods: true,
        license_tiers: true,
        profiles: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
      },
    });

    if (!song) {
      res.status(404).json({ error: 'Song not found' });
      return;
    }

    res.json({
      ...song,
      base_price: Number(song.base_price),
      genre: song.genres || null,
      mood: song.moods || null,
      seller: song.profiles || null,
    });
  } catch (error) {
    console.error('Error fetching song:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new song (sellers only)
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      title, description, genre_id, mood_id, language, bpm,
      full_lyrics, preview_lyrics, audio_url, preview_audio_url,
      cover_image_url, artwork_cropped_url, base_price,
      has_audio, has_lyrics, slug, seo_description, seo_content,
      use_cases, lyrics_intro, is_free, duration,
      preview_status, preview_duration_seconds,
    } = req.body;

    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const songData: any = {
      seller_id: sellerId,
      title,
      description: description || null,
      genre_id: genre_id || null,
      mood_id: mood_id || null,
      language: language || 'English',
      bpm: bpm ? parseInt(bpm) : null,
      duration: duration ? parseInt(duration) : null,
      full_lyrics: full_lyrics || null,
      preview_lyrics: preview_lyrics || null,
      audio_url: audio_url || null,
      preview_audio_url: preview_audio_url || null,
      cover_image_url: cover_image_url || null,
      artwork_cropped_url: artwork_cropped_url || null,
      base_price: base_price || 0,
      has_audio: has_audio || false,
      has_lyrics: has_lyrics || false,
      slug: slug || null,
      seo_description: seo_description || null,
      seo_content: seo_content || null,
      preview_duration_seconds: preview_duration_seconds ? parseInt(preview_duration_seconds) : null,
      use_cases: use_cases || [],
      lyrics_intro: lyrics_intro || null,
      is_free: is_free || false,
      status: 'pending',
    };

    const song = await prisma.songs.create({ data: songData });

    res.status(201).json({ ...song, base_price: Number(song.base_price) });
  } catch (error) {
    console.error('Error creating song:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a song
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const songId = req.params['id'] as string;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Verify ownership
    const existing = await prisma.songs.findUnique({ where: { id: songId } });
    if (!existing || existing.seller_id !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const allowedFields = [
      'title', 'description', 'genre_id', 'mood_id', 'language', 'bpm',
      'full_lyrics', 'preview_lyrics', 'audio_url', 'preview_audio_url',
      'cover_image_url', 'artwork_cropped_url', 'base_price',
      'has_audio', 'has_lyrics', 'slug', 'seo_description', 'seo_content',
      'use_cases', 'lyrics_intro', 'is_free', 'duration', 'preview_duration_seconds',
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const song = await prisma.songs.update({
      where: { id: songId },
      data: updateData,
    });

    res.json({ ...song, base_price: Number(song.base_price) });
  } catch (error) {
    console.error('Error updating song:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a song
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const songId = req.params['id'] as string;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Verify ownership
    const existing = await prisma.songs.findUnique({ where: { id: songId } });
    if (!existing || existing.seller_id !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Check for existing sales
    const sales = await prisma.transactions.findFirst({
      where: { song_id: songId },
    });

    if (sales) {
      res.status(400).json({ error: 'Cannot delete song with existing sales' });
      return;
    }

    // Delete related license tiers first
    await prisma.license_tiers.deleteMany({ where: { song_id: songId } });

    await prisma.songs.delete({ where: { id: songId } });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting song:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
