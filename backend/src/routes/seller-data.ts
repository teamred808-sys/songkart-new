import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// ============ GENRES ============
router.get('/genres', async (_req: Request, res: Response) => {
  try {
    const genres = await prisma.genres.findMany({ orderBy: { name: 'asc' } });
    res.json(genres);
  } catch (error) {
    console.error('Error fetching genres:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ MOODS ============
router.get('/moods', async (_req: Request, res: Response) => {
  try {
    const moods = await prisma.moods.findMany({ orderBy: { name: 'asc' } });
    res.json(moods);
  } catch (error) {
    console.error('Error fetching moods:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ SONGS (extended) ============

// GET /songs/full?seller_id=X&status=X&is_free=X&limit=N - songs with genre, mood, license_tiers
router.get('/songs/full', async (req: Request, res: Response) => {
  try {
    const sellerId = req.query.seller_id as string | undefined;
    const status = req.query.status as string | undefined;
    const isFree = req.query.is_free as string | undefined;
    const limitStr = req.query.limit as string | undefined;

    const where: any = {};
    if (sellerId) where.seller_id = sellerId;
    if (status) where.status = status;
    if (isFree === 'true') where.is_free = true;

    const findArgs: any = {
      where,
      include: { genres: true, moods: true, license_tiers: true },
      orderBy: { created_at: 'desc' as const },
    };
    if (limitStr) findArgs.take = parseInt(limitStr);

    const songs = await prisma.songs.findMany(findArgs);

    // Map to frontend-expected shape
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

// ============ TRANSACTIONS ============

// GET /transactions?seller_id=X&payment_status=Y
router.get('/transactions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.query.seller_id as string | undefined;
    const buyerId = req.query.buyer_id as string | undefined;
    const paymentStatus = req.query.payment_status as string | undefined;

    const where: any = {};
    if (sellerId) where.seller_id = sellerId;
    if (buyerId) where.buyer_id = buyerId;
    if (paymentStatus) where.payment_status = paymentStatus;

    const transactions = await prisma.transactions.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    // Convert Decimals to numbers
    const mapped = transactions.map((t: any) => ({
      ...t,
      amount: Number(t.amount),
      seller_amount: Number(t.seller_amount),
      commission_amount: Number(t.commission_amount),
      commission_rate: Number(t.commission_rate),
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /transactions/full?seller_id=X - transactions with song and license_tier details
router.get('/transactions/full', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.query.seller_id as string | undefined;
    const buyerId = req.query.buyer_id as string | undefined;

    const where: any = {};
    if (sellerId) where.seller_id = sellerId;
    if (buyerId) where.buyer_id = buyerId;

    const transactions = await prisma.transactions.findMany({
      where,
      include: {
        songs: {
          select: {
            id: true,
            title: true,
            cover_image_url: true,
            artwork_cropped_url: true,
          },
        },
        license_tiers: {
          select: {
            license_type: true,
            price: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const mapped = transactions.map((t: any) => ({
      ...t,
      amount: Number(t.amount),
      seller_amount: Number(t.seller_amount),
      commission_amount: Number(t.commission_amount),
      commission_rate: Number(t.commission_rate),
      song: t.songs || null,
      license_tier: t.license_tiers ? { ...t.license_tiers, price: Number(t.license_tiers.price) } : null,
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching full transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ SELLER WALLETS ============

// GET /seller_wallets?user_id=X
router.get('/seller_wallets', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req.query.user_id as string) || req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const wallets = await prisma.seller_wallets.findMany({
      where: { user_id: userId },
    });

    const mapped = wallets.map((w: any) => ({
      ...w,
      total_earnings: Number(w.total_earnings),
      available_balance: Number(w.available_balance),
      pending_balance: Number(w.pending_balance),
      withdrawal_threshold: Number(w.withdrawal_threshold),
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching seller wallets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ WITHDRAWAL REQUESTS ============

// GET /withdrawal_requests?user_id=X&status=Y
router.get('/withdrawal_requests', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req.query.user_id as string) || req.user?.id;
    const status = req.query.status as string | undefined;

    const where: any = {};
    if (userId) where.user_id = userId;

    // Handle PostgREST-style "in.(pending,approved)" syntax
    if (status) {
      const inMatch = (status as string).match(/^in\.\((.+)\)$/);
      if (inMatch && inMatch[1]) {
        where.status = { in: inMatch[1].split(',') };
      } else {
        where.status = status;
      }
    }

    const limitStr = req.query.limit as string | undefined;
    const limit = limitStr ? parseInt(limitStr) : null;

    const findArgs: any = {
      where,
      orderBy: { created_at: 'desc' },
    };
    if (limit) findArgs.take = limit;

    const requests = await prisma.withdrawal_requests.findMany(findArgs);

    const mapped = requests.map((r: any) => ({
      ...r,
      amount: Number(r.amount),
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching withdrawal requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /withdrawal_requests
router.post('/withdrawal_requests', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { amount, payout_method, payout_details } = req.body;

    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Invalid amount' });
      return;
    }

    const request = await prisma.withdrawal_requests.create({
      data: {
        user_id: req.body.user_id || userId,
        amount,
        payout_method,
        payout_details: payout_details || {},
      },
    });

    res.status(201).json({ ...request, amount: Number(request.amount) });
  } catch (error) {
    console.error('Error creating withdrawal request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ LICENSE TIERS ============

// GET /license_tiers?song_id=X or ?id=X
router.get('/license_tiers', async (req: Request, res: Response) => {
  try {
    const songId = req.query.song_id as string | undefined;
    const id = req.query.id as string | undefined;

    const where: any = {};
    if (songId) where.song_id = songId;
    if (id) where.id = id;

    const tiers = await prisma.license_tiers.findMany({
      where,
      orderBy: { price: 'asc' },
    });

    const mapped = tiers.map((t: any) => ({
      ...t,
      price: Number(t.price),
      current_sales: t.current_sales || 0,
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching license tiers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /license_tiers/:id
router.get('/license_tiers/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const tier = await prisma.license_tiers.findUnique({
      where: { id },
    });
    if (!tier) { res.status(404).json({ error: 'License tier not found' }); return; }
    res.json({ ...tier, price: Number(tier.price), current_sales: tier.current_sales || 0 });
  } catch (error) {
    console.error('Error fetching license tier:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /license_tiers
router.post('/license_tiers', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Handle both array and single object input
    const isArray = Array.isArray(req.body);
    const tiers = isArray ? req.body : [req.body];

    // Validate all tiers
    for (const tier of tiers) {
      if (!tier.song_id || !tier.license_type || tier.price === undefined) {
        res.status(400).json({ error: 'song_id, license_type, and price are required for all tiers' });
        return;
      }
    }

    if (isArray) {
      // Bulk insert for array
      const data = tiers.map((tier: any) => ({
        song_id: tier.song_id,
        license_type: tier.license_type,
        price: tier.price,
        terms: tier.terms || null,
        max_sales: tier.max_sales || null,
      }));

      await prisma.license_tiers.createMany({ data });

      // Fetch created tiers to return with proper formatting
      const created = await prisma.license_tiers.findMany({
        where: { song_id: tiers[0].song_id },
        orderBy: { created_at: 'desc' },
        take: tiers.length,
      });

      const mapped = created.map(t => ({ ...t, price: Number(t.price) }));
      res.status(201).json(mapped);
    } else {
      // Single insert for object
      const { song_id, license_type, price, terms, max_sales } = req.body;

      const tier = await prisma.license_tiers.create({
        data: {
          song_id,
          license_type,
          price,
          terms: terms || null,
          max_sales: max_sales || null,
        },
      });

      res.status(201).json({ ...tier, price: Number(tier.price) });
    }
  } catch (error) {
    console.error('Error creating license tier:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /license_tiers/:id
router.patch('/license_tiers/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const tierId = req.params['id'] as string;
    const updateData: any = {};

    if (req.body.price !== undefined) updateData.price = req.body.price;
    if (req.body.terms !== undefined) updateData.terms = req.body.terms;
    if (req.body.is_available !== undefined) updateData.is_available = req.body.is_available;

    const tier = await prisma.license_tiers.update({
      where: { id: tierId },
      data: updateData,
    });

    res.json({ ...tier, price: Number(tier.price) });
  } catch (error) {
    console.error('Error updating license tier:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /license_tiers/:id
router.delete('/license_tiers/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const tierId = req.params['id'] as string;

    await prisma.license_tiers.delete({
      where: { id: tierId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting license tier:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ ORDER ITEMS ============

// GET /order_items?song_id=X&limit=N
router.get('/order_items', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const songId = req.query.song_id as string | undefined;
    const limitStr = req.query.limit as string | undefined;
    const limit = limitStr ? parseInt(limitStr) : null;

    // order_items are transactions in our schema
    const where: any = {};
    if (songId) where.song_id = songId;

    const findArgs: any = {
      where,
      orderBy: { created_at: 'desc' },
    };
    if (limit) findArgs.take = limit;

    const items = await prisma.transactions.findMany(findArgs);

    res.json(items);
  } catch (error) {
    console.error('Error fetching order items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ USER ROLES (public) ============

// GET /user_roles?role=seller — returns user_ids with the given role
router.get('/user_roles', async (req: Request, res: Response) => {
  try {
    const role = req.query.role as string | undefined;
    const userId = req.query.user_id as string | undefined;
    const where: any = {};
    if (role) where.role = role;
    if (userId) where.user_id = userId;

    const roles = await prisma.user_roles.findMany({ where });
    res.json(roles);
  } catch (error) {
    console.error('Error fetching user roles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ PROFILES ============

// GET /profiles?ids=X,Y,Z (bulk) or /profiles?id=in.(X,Y) (Supabase-style) or /profiles/:id (single)
router.get('/profiles', async (req: Request, res: Response) => {
  try {
    const ids = req.query.ids as string | undefined;
    const idParam = req.query.id as string | undefined;
    
    let idList: string[] = [];
    
    if (ids) {
      idList = ids.split(',').map(id => id.trim()).filter(Boolean);
    } else if (idParam) {
      // Support Supabase-style "in.(id1,id2,id3)" syntax
      const inMatch = idParam.match(/^in\.\((.+)\)$/);
      if (inMatch && inMatch[1]) {
        idList = inMatch[1].split(',').map(id => id.trim()).filter(Boolean);
      } else {
        idList = [idParam];
      }
    }
    
    if (idList.length === 0) { res.json([]); return; }

    const profiles = await prisma.profiles.findMany({
      where: { id: { in: idList } },
      select: { id: true, full_name: true, avatar_url: true, bio: true, website: true, is_verified: true, username: true, role: true, specialties: true },
    });
    res.json(profiles);
  } catch (error) {
    console.error('Error fetching bulk profiles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /profiles/:id
router.get('/profiles/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const profile = await prisma.profiles.findUnique({ where: { id } });
    if (!profile) { res.status(404).json({ error: 'Profile not found' }); return; }
    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /profiles/:id
router.patch('/profiles/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const profileId = req.params['id'] as string;
    const userId = req.user?.id;

    // Only allow users to update their own profile
    if (!userId || profileId !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const updateData: any = {};
    const allowedFields = [
      'full_name', 'avatar_url', 'bio', 'website', 'social_links',
      'dynamic_pricing_enabled', 'username', 'role', 'specialties',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const profile = await prisma.profiles.update({
      where: { id: profileId as string },
      data: updateData,
    });

    res.json(profile);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
