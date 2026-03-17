import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// ============ CART ITEMS ============

// GET /cart_items?user_id=X
router.get('/cart_items', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req.query.user_id as string) || req.user?.id;
    const songId = req.query.song_id as string | undefined;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const where: any = { user_id: userId };
    if (songId) where.song_id = songId;

    const items = await prisma.cart_items.findMany({
      where, include: { songs: true, license_tiers: true }, orderBy: { created_at: 'desc' },
    });

    const mapped = items.map((i: any) => ({
      ...i,
      base_price: Number(i.base_price),
      platform_commission: Number(i.platform_commission),
      final_price: Number(i.final_price),
      song: i.songs ? { ...i.songs, base_price: Number(i.songs.base_price) } : null,
      license_tier: i.license_tiers ? { ...i.license_tiers, price: Number(i.license_tiers.price) } : null,
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching cart items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /cart_items/full?user_id=X
router.get('/cart_items/full', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req.query.user_id as string) || req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const items = await prisma.cart_items.findMany({
      where: { user_id: userId },
      include: {
        songs: { include: { genres: true, profiles: { select: { id: true, full_name: true, avatar_url: true } } } },
        license_tiers: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const mapped = items.map((i: any) => ({
      ...i,
      base_price: Number(i.base_price),
      platform_commission: Number(i.platform_commission),
      final_price: Number(i.final_price),
      song: i.songs ? { ...i.songs, base_price: Number(i.songs.base_price), genre: i.songs.genres || null, seller: i.songs.profiles || null } : null,
      license_tier: i.license_tiers ? { ...i.license_tiers, price: Number(i.license_tiers.price) } : null,
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching full cart items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /cart_items
router.post('/cart_items', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { song_id, license_tier_id, seller_id, base_price, platform_commission, final_price, is_exclusive } = req.body;

    if (!song_id || !license_tier_id) {
      res.status(400).json({ error: 'song_id and license_tier_id are required' });
      return;
    }

    const item = await prisma.cart_items.create({
      data: {
        user_id: userId,
        song_id,
        license_tier_id,
        seller_id: seller_id || null,
        base_price: base_price || 0,
        platform_commission: platform_commission || 0,
        final_price: final_price || 0,
        is_exclusive: is_exclusive || false,
      },
    });

    res.status(201).json({ ...item, base_price: Number(item.base_price), platform_commission: Number(item.platform_commission), final_price: Number(item.final_price) });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Item already in cart' });
      return;
    }
    console.error('Error adding cart item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /cart_items/:id
router.delete('/cart_items/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    await prisma.cart_items.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting cart item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /cart_items/:id
router.patch('/cart_items/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const item = await prisma.cart_items.update({ where: { id }, data: req.body });
    res.json(item);
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ FAVORITES ============

// GET /favorites?user_id=X&song_id=X
router.get('/favorites', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req.query.user_id as string) || req.user?.id;
    const songId = req.query.song_id as string | undefined;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const where: any = { user_id: userId };
    if (songId) where.song_id = songId;

    const favorites = await prisma.favorites.findMany({ where, orderBy: { created_at: 'desc' } });
    res.json(favorites);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /favorites/full?user_id=X
router.get('/favorites/full', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req.query.user_id as string) || req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const favorites = await prisma.favorites.findMany({
      where: { user_id: userId },
      include: {
        songs: { include: { genres: true, moods: true, license_tiers: true, profiles: { select: { id: true, full_name: true, avatar_url: true } } } },
      },
      orderBy: { created_at: 'desc' },
    });

    const mapped = favorites.map((f: any) => ({
      ...f,
      song: f.songs ? { ...f.songs, base_price: Number(f.songs.base_price), genre: f.songs.genres || null, mood: f.songs.moods || null, seller: f.songs.profiles || null } : null,
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching full favorites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /favorites
router.post('/favorites', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { song_id } = req.body;
    if (!song_id) { res.status(400).json({ error: 'song_id is required' }); return; }

    const fav = await prisma.favorites.create({ data: { user_id: userId, song_id } });
    res.status(201).json(fav);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Already in favorites' });
      return;
    }
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /favorites/:id
router.delete('/favorites/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    await prisma.favorites.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting favorite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ ORDERS ============

// GET /orders?buyer_id=X
router.get('/orders', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const buyerId = (req.query.buyer_id as string) || req.user?.id;
    if (!buyerId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const orders = await prisma.orders.findMany({
      where: { buyer_id: buyerId }, orderBy: { created_at: 'desc' },
    });

    const mapped = orders.map((o: any) => ({
      ...o, subtotal: Number(o.subtotal), platform_fee: Number(o.platform_fee), tax_amount: Number(o.tax_amount), total_amount: Number(o.total_amount),
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /orders/:id?buyer_id=X
router.get('/orders/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const buyerId = (req.query.buyer_id as string) || req.user?.id;

    const order = await prisma.orders.findUnique({ where: { id } });
    if (!order || order.buyer_id !== buyerId) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json({ ...order, subtotal: Number(order.subtotal), platform_fee: Number(order.platform_fee), tax_amount: Number(order.tax_amount), total_amount: Number(order.total_amount) });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ EXCLUSIVE RESERVATIONS ============

// GET /exclusive_reservations?song_ids=X,Y,Z
router.get('/exclusive_reservations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const songIds = req.query.song_ids as string | undefined;
    const where: any = { status: 'active' };
    if (songIds) where.song_id = { in: songIds.split(',') };

    const reservations = await prisma.exclusive_reservations.findMany({ where });
    res.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ ORDER PRICING SNAPSHOTS ============

// GET /order_pricing_snapshots?limit=N
router.get('/order_pricing_snapshots', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const limitStr = req.query.limit as string | undefined;
    const findArgs: any = { orderBy: { created_at: 'desc' as const } };
    if (limitStr) findArgs.take = parseInt(limitStr);

    // order_pricing_snapshots may not exist as a separate table — return empty for now
    res.json([]);
  } catch (error) {
    console.error('Error fetching pricing snapshots:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ ORDER ITEMS (full) ============

// GET /order_items/full?song_id=X&orders.buyer_id=X&orders.payment_status=X&limit=N
router.get('/order_items/full', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const songId = req.query.song_id as string | undefined;
    const limitStr = req.query.limit as string | undefined;

    const where: any = {};
    if (songId) where.song_id = songId;

    const findArgs: any = { where, orderBy: { created_at: 'desc' as const } };
    if (limitStr) findArgs.take = parseInt(limitStr);

    const items = await prisma.transactions.findMany({
      ...findArgs,
      include: { songs: { select: { title: true, cover_image_url: true } }, license_tiers: { select: { license_type: true, price: true } } },
    });

    const mapped = items.map((t: any) => ({
      ...t, amount: Number(t.amount), seller_amount: Number(t.seller_amount),
      song: t.songs || null, license_tier: t.license_tiers ? { ...t.license_tiers, price: Number(t.license_tiers.price) } : null,
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching full order items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
