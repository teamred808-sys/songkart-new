import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /rpc/get_new_uploads
router.post('/rpc/get_new_uploads', async (req: Request, res: Response) => {
  try {
    const { limit: limitVal, offset, genre_id, mood_id } = req.body;

    const where: any = { status: 'approved', new_uploads_excluded: { not: true } };
    if (genre_id) where.genre_id = genre_id;
    if (mood_id) where.mood_id = mood_id;

    // Get recently approved songs
    const songs = await prisma.songs.findMany({
      where,
      include: {
        genres: true,
        moods: true,
        license_tiers: true,
        profiles: { select: { id: true, full_name: true, avatar_url: true } },
      },
      orderBy: [
        { new_uploads_pinned: 'desc' },
        { approved_at: 'desc' },
        { created_at: 'desc' },
      ],
      take: limitVal || 20,
      skip: offset || 0,
    });

    const mapped = songs.map((s: any) => ({
      ...s,
      base_price: Number(s.base_price),
      genre: s.genres || null,
      mood: s.moods || null,
      seller: s.profiles || null,
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching new uploads:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /rpc/admin_manage_new_upload
router.post('/rpc/admin_manage_new_upload', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { song_id, action, pin_until } = req.body;
    if (!song_id || !action) {
      res.status(400).json({ error: 'song_id and action required' });
      return;
    }

    const updateData: any = {};
    switch (action) {
      case 'pin':
        updateData.new_uploads_pinned = true;
        if (pin_until) updateData.new_uploads_pinned_until = new Date(pin_until);
        break;
      case 'unpin':
        updateData.new_uploads_pinned = false;
        updateData.new_uploads_pinned_until = null;
        break;
      case 'exclude':
        updateData.new_uploads_excluded = true;
        break;
      case 'include':
        updateData.new_uploads_excluded = false;
        break;
    }

    const song = await prisma.songs.update({ where: { id: song_id }, data: updateData });
    res.json({ ...song, base_price: Number(song.base_price) });
  } catch (error) {
    console.error('Error managing new upload:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ CONTENT REVIEW QUEUE ============

router.get('/content_review_queue', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const queueType = req.query.queue_type as string | undefined;
    const where: any = {};
    if (status) where.status = status;
    if (queueType) where.queue_type = queueType;

    const queue = await prisma.content_review_queue.findMany({
      where,
      include: {
        songs_content_review_queue_song_idTosongs: { select: { id: true, title: true, seller_id: true, cover_image_url: true } },
      },
      orderBy: [{ priority: 'asc' }, { created_at: 'asc' }],
      take: 100,
    });

    const mapped = queue.map((q: any) => ({
      ...q,
      confidence_score: q.confidence_score ? Number(q.confidence_score) : null,
      song: q.songs_content_review_queue_song_idTosongs || null,
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching content review queue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/content_review_queue', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.content_review_queue.create({ data: req.body });
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating review queue item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/content_review_queue/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const item = await prisma.content_review_queue.update({
      where: { id },
      data: { ...req.body, resolved_by: req.body.resolved_by || req.user?.id || null },
    });
    res.json(item);
  } catch (error) {
    console.error('Error updating review queue item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ CONTENT FINGERPRINTS ============

router.get('/content_fingerprints', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const songId = req.query.song_id as string | undefined;
    const where: any = {};
    if (songId) where.song_id = songId;

    const fingerprints = await prisma.content_fingerprints.findMany({ where, orderBy: { created_at: 'desc' } });
    const mapped = fingerprints.map((f: any) => ({
      ...f,
      audio_match_confidence: f.audio_match_confidence ? Number(f.audio_match_confidence) : null,
      lyrics_similarity_score: f.lyrics_similarity_score ? Number(f.lyrics_similarity_score) : null,
    }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching content fingerprints:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
