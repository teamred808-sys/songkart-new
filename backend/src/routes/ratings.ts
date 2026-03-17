import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /song_ratings?song_id=X&user_id=X
router.get('/song_ratings', async (req: Request, res: Response) => {
  try {
    const songId = req.query.song_id as string | undefined;
    const userId = req.query.user_id as string | undefined;
    const where: any = {};
    if (songId) where.song_id = songId;
    if (userId) where.user_id = userId;

    const ratings = await prisma.song_ratings.findMany({ where, orderBy: { created_at: 'desc' } });
    res.json(ratings);
  } catch (error) {
    console.error('Error fetching song ratings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /song_ratings/full?songs.seller_id=X or other filters
router.get('/song_ratings/full', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.query['songs.seller_id'] as string | undefined;
    const where: any = {};
    if (sellerId) where.songs = { seller_id: sellerId };

    const ratings = await prisma.song_ratings.findMany({
      where,
      include: {
        songs: { select: { id: true, title: true, cover_image_url: true, seller_id: true } },
        profiles: { select: { id: true, full_name: true, avatar_url: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    const mapped = ratings.map((r: any) => ({
      ...r,
      song: r.songs || null,
      user: r.profiles || null,
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching full ratings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /rpc/submit_rating
router.post('/rpc/submit_rating', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { song_id, rating } = req.body;
    if (!song_id || !rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'song_id and rating (1-5) are required' });
      return;
    }

    // Check if user has purchased this song
    const purchase = await prisma.transactions.findFirst({
      where: { buyer_id: userId, song_id, payment_status: 'completed' },
    });

    const result = await prisma.song_ratings.upsert({
      where: { song_id_user_id: { song_id, user_id: userId } },
      create: { song_id, user_id: userId, rating, is_verified_purchase: !!purchase },
      update: { rating, updated_at: new Date() },
    });

    // Update song average rating
    const agg = await prisma.song_ratings.aggregate({ where: { song_id }, _avg: { rating: true }, _count: true });
    await prisma.songs.update({
      where: { id: song_id },
      data: { average_rating: agg._avg.rating || 0, total_ratings: agg._count },
    });

    res.json(result);
  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /rpc/get_song_ratings
router.post('/rpc/get_song_ratings', async (req: Request, res: Response) => {
  try {
    const { song_id, limit: limitVal, offset } = req.body;
    if (!song_id) { res.status(400).json({ error: 'song_id required' }); return; }

    const ratings = await prisma.song_ratings.findMany({
      where: { song_id },
      include: { profiles: { select: { id: true, full_name: true, avatar_url: true } } },
      orderBy: { created_at: 'desc' },
      take: limitVal || 20,
      skip: offset || 0,
    });

    const mapped = ratings.map((r: any) => ({ ...r, user: r.profiles || null }));
    res.json(mapped);
  } catch (error) {
    console.error('Error getting song ratings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /rpc/delete_my_rating
router.post('/rpc/delete_my_rating', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { song_id } = req.body;
    if (!userId || !song_id) { res.status(400).json({ error: 'song_id required' }); return; }

    await prisma.song_ratings.delete({ where: { song_id_user_id: { song_id, user_id: userId } } });

    // Update song average
    const agg = await prisma.song_ratings.aggregate({ where: { song_id }, _avg: { rating: true }, _count: true });
    await prisma.songs.update({
      where: { id: song_id },
      data: { average_rating: agg._avg.rating || 0, total_ratings: agg._count },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting rating:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /rpc/flag_rating
router.post('/rpc/flag_rating', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { rating_id, reason } = req.body;
    if (!rating_id || !reason) { res.status(400).json({ error: 'rating_id and reason required' }); return; }

    const flag = await prisma.rating_abuse_flags.create({
      data: { rating_id, flagged_by: userId || null, reason },
    });
    res.json(flag);
  } catch (error) {
    console.error('Error flagging rating:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /rpc/admin_remove_rating
router.post('/rpc/admin_remove_rating', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { rating_id } = req.body;
    if (!rating_id) { res.status(400).json({ error: 'rating_id required' }); return; }

    const rating = await prisma.song_ratings.findUnique({ where: { id: rating_id } });
    if (!rating) { res.status(404).json({ error: 'Rating not found' }); return; }

    await prisma.song_ratings.delete({ where: { id: rating_id } });

    // Update song average
    const agg = await prisma.song_ratings.aggregate({ where: { song_id: rating.song_id }, _avg: { rating: true }, _count: true });
    await prisma.songs.update({
      where: { id: rating.song_id },
      data: { average_rating: agg._avg.rating || 0, total_ratings: agg._count },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing rating:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /rating_abuse_flags/full
router.get('/rating_abuse_flags/full', authenticate, async (_req: Request, res: Response) => {
  try {
    const flags = await prisma.rating_abuse_flags.findMany({
      include: {
        song_ratings: { include: { songs: { select: { title: true } }, profiles: { select: { full_name: true } } } },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(flags);
  } catch (error) {
    console.error('Error fetching abuse flags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /rating_abuse_flags/:id
router.patch('/rating_abuse_flags/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const flag = await prisma.rating_abuse_flags.update({
      where: { id },
      data: { ...req.body, reviewed_by: req.user?.id || null, reviewed_at: new Date() },
    });
    res.json(flag);
  } catch (error) {
    console.error('Error updating abuse flag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
