import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /create-checkout-session
router.post('/create-checkout-session', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { cart_items, promo_code_id, promo_discount } = req.body;
    if (!cart_items || cart_items.length === 0) {
      res.status(400).json({ error: 'Cart is empty' });
      return;
    }

    const subtotal = cart_items.reduce((sum: number, item: any) => sum + Number(item.final_price || item.price || 0), 0);
    const platformFee = subtotal * 0.1;
    const discount = Number(promo_discount || 0);
    const totalAmount = Math.max(0, subtotal + platformFee - discount);

    const session = await prisma.checkout_sessions.create({
      data: {
        buyer_id: userId,
        cart_snapshot: cart_items,
        subtotal,
        platform_fee: platformFee,
        total_amount: totalAmount,
        promo_code_id: promo_code_id || null,
        promo_discount: discount,
        status: 'pending',
      },
    });

    res.json({
      session_id: session.id,
      subtotal: Number(session.subtotal),
      platform_fee: Number(session.platform_fee),
      total_amount: Number(session.total_amount),
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /free-checkout
router.post('/free-checkout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { cart_items } = req.body;
    if (!cart_items || cart_items.length === 0) {
      res.status(400).json({ error: 'Cart is empty' });
      return;
    }

    // Create order
    const order = await prisma.orders.create({
      data: {
        buyer_id: userId,
        order_number: `FREE-${Date.now()}`,
        subtotal: 0,
        platform_fee: 0,
        total_amount: 0,
        payment_status: 'completed',
        payment_method: 'free',
        paid_at: new Date(),
        fulfilled_at: new Date(),
        fulfillment_status: 'fulfilled',
      },
    });

    // Create transactions for each cart item
    for (const item of cart_items) {
      await prisma.transactions.create({
        data: {
          buyer_id: userId,
          seller_id: item.seller_id,
          song_id: item.song_id,
          license_tier_id: item.license_tier_id,
          amount: 0,
          commission_rate: 0,
          commission_amount: 0,
          seller_amount: 0,
          payment_status: 'completed',
          payment_method: 'free',
        },
      });

      // Update license tier sales count
      await prisma.license_tiers.update({
        where: { id: item.license_tier_id },
        data: { current_sales: { increment: 1 } },
      });
    }

    // Clear cart
    await prisma.cart_items.deleteMany({ where: { user_id: userId } });

    res.json({ success: true, order_id: order.id, order_number: order.order_number });
  } catch (error) {
    console.error('Error in free checkout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /validate-cart-item
router.post('/validate-cart-item', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { song_id, license_tier_id } = req.body;

    if (!song_id || !license_tier_id) {
      res.json({ valid: false, message: 'song_id and license_tier_id required' });
      return;
    }

    const song = await prisma.songs.findUnique({ where: { id: song_id } });
    if (!song || song.status !== 'approved') {
      res.json({ valid: false, message: 'Song not available' });
      return;
    }

    // Check self-purchase
    if (userId && song.seller_id === userId) {
      res.json({ valid: false, message: 'Cannot purchase your own song' });
      return;
    }

    const tier = await prisma.license_tiers.findUnique({ where: { id: license_tier_id } });
    if (!tier || !tier.is_available) {
      res.json({ valid: false, message: 'License tier not available' });
      return;
    }

    // Check existing purchase
    if (userId) {
      const existing = await prisma.transactions.findFirst({
        where: { buyer_id: userId, song_id, license_tier_id, payment_status: 'completed' },
      });
      if (existing) {
        res.json({ valid: false, message: 'Already purchased this license' });
        return;
      }
    }

    // Check exclusive sold
    if (tier.license_type === 'exclusive' && song.exclusive_sold) {
      res.json({ valid: false, message: 'Exclusive license already sold' });
      return;
    }

    res.json({ valid: true, message: 'Item is valid', price: Number(tier.price) });
  } catch (error) {
    console.error('Error validating cart item:', error);
    res.json({ valid: false, message: 'Validation error' });
  }
});

// POST /verify-payment
router.post('/verify-payment', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { session_id, payment_id } = req.body;
    if (!session_id) { res.status(400).json({ error: 'session_id required' }); return; }

    const session = await prisma.checkout_sessions.findUnique({ where: { id: session_id } });
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

    // For now, mark as completed (in production, verify with payment gateway)
    await prisma.checkout_sessions.update({
      where: { id: session_id },
      data: { status: 'completed', completed_at: new Date(), cashfree_payment_session_id: payment_id || null },
    });

    res.json({ verified: true, status: 'completed' });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /detect-buyer-country
router.post('/detect-buyer-country', async (req: Request, res: Response) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    // Default to India for now
    res.json({ country_code: 'IN', currency_code: 'INR', country_name: 'India' });
  } catch (error) {
    console.error('Error detecting country:', error);
    res.json({ country_code: 'IN', currency_code: 'INR', country_name: 'India' });
  }
});

// POST /record-view
router.post('/record-view', async (req: Request, res: Response) => {
  try {
    const { song_id, user_id } = req.body;
    if (!song_id) { res.status(400).json({ error: 'song_id required' }); return; }

    // Basic anti-fraud: only count one view per user per song per day
    if (user_id) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existing = await prisma.song_views.findFirst({
        where: { song_id, user_id, viewed_at: { gte: today } },
      });

      if (existing) {
        res.json({ recorded: false, message: 'Already viewed today' });
        return;
      }
    }

    await prisma.song_views.create({
      data: {
        song_id,
        user_id: user_id || '00000000-0000-0000-0000-000000000000',
        ip_address: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
        user_agent: req.headers['user-agent'] || null,
      },
    });

    // Increment view count on song
    await prisma.songs.update({ where: { id: song_id }, data: { view_count: { increment: 1 } } });

    res.json({ recorded: true });
  } catch (error) {
    console.error('Error recording view:', error);
    res.json({ recorded: false });
  }
});

// POST /release-reservation
router.post('/release-reservation', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { reservation_id, song_id } = req.body;
    if (reservation_id) {
      await prisma.exclusive_reservations.update({
        where: { id: reservation_id },
        data: { status: 'released', released_at: new Date(), released_reason: 'Manual release' },
      });
    } else if (song_id) {
      await prisma.exclusive_reservations.updateMany({
        where: { song_id, status: 'active' },
        data: { status: 'released', released_at: new Date(), released_reason: 'Manual release' },
      });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error releasing reservation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /admin-review-content — fetch full song details for admin review
router.post('/admin-review-content', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { songId } = req.body;
    if (!songId) { res.status(400).json({ error: 'songId required' }); return; }

    const song = await prisma.songs.findUnique({
      where: { id: songId },
      include: {
        genres: true,
        moods: true,
        license_tiers: true,
        profiles: { select: { id: true, full_name: true, email: true, avatar_url: true } },
      },
    });

    if (!song) { res.status(404).json({ error: 'Song not found' }); return; }

    const mapped = {
      ...song,
      base_price: Number(song.base_price),
      genre: (song as any).genres || null,
      mood: (song as any).moods || null,
      seller: (song as any).profiles || null,
      full_audio_url: song.audio_url,
      license_tiers: ((song as any).license_tiers || []).map((t: any) => ({
        ...t,
        price: Number(t.price),
        current_sales: t.current_sales || 0,
      })),
    };

    res.json({ song: mapped });
  } catch (error) {
    console.error('Error in admin-review-content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /check-abuse — abuse detection (returns safe defaults)
router.post('/check-abuse', async (req: Request, res: Response) => {
  try {
    const { action } = req.body;

    if (action === 'report') {
      res.json({ success: true });
      return;
    }

    // Default: not blocked
    res.json({
      blocked: false,
      requiresCaptcha: false,
      warnings: [],
      severity: 'none',
    });
  } catch (error) {
    console.error('Error in check-abuse:', error);
    res.json({ blocked: false, requiresCaptcha: false, warnings: [], severity: 'none' });
  }
});

// POST /compress-image — stub
router.post('/compress-image', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { imageUrl } = req.body;
    res.json({ success: true, compressedUrl: imageUrl });
  } catch (error) {
    console.error('Error in compress-image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
