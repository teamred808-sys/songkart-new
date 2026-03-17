import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /promo_codes?created_by=X&creator_role=X
router.get('/promo_codes', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const createdBy = req.query.created_by as string | undefined;
    const creatorRole = req.query.creator_role as string | undefined;

    const where: any = {};
    if (createdBy) where.created_by = createdBy;
    if (creatorRole) where.creator_role = creatorRole;

    const codes = await prisma.promo_codes.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    const mapped = codes.map((c: any) => ({
      ...c,
      discount_value: Number(c.discount_value),
      min_purchase_amount: Number(c.min_purchase_amount),
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /promo_codes
router.post('/promo_codes', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { code, creator_role, discount_type, discount_value, song_id, license_type, min_purchase_amount, usage_limit, expires_at, created_by } = req.body;

    if (!code || !discount_type || discount_value === undefined) {
      res.status(400).json({ error: 'code, discount_type, and discount_value are required' });
      return;
    }

    const promo = await prisma.promo_codes.create({
      data: {
        code: code.trim().toUpperCase(),
        created_by: created_by || userId,
        creator_role: creator_role || 'seller',
        discount_type,
        discount_value,
        song_id: song_id || null,
        license_type: license_type || null,
        min_purchase_amount: min_purchase_amount || 0,
        usage_limit: usage_limit || null,
        expires_at: expires_at ? new Date(expires_at) : null,
      },
    });

    res.status(201).json({ ...promo, discount_value: Number(promo.discount_value) });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'duplicate key: This promo code already exists' });
      return;
    }
    console.error('Error creating promo code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /promo_codes/:id
router.patch('/promo_codes/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const updateData: any = {};

    const allowedFields = ['is_active', 'usage_limit', 'expires_at', 'discount_value', 'song_id', 'license_type'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }

    const promo = await prisma.promo_codes.update({ where: { id }, data: updateData });
    res.json({ ...promo, discount_value: Number(promo.discount_value) });
  } catch (error) {
    console.error('Error updating promo code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /validate-promo-code
router.post('/validate-promo-code', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { code, cart_items } = req.body;
    if (!code) { res.status(400).json({ valid: false, message: 'Promo code is required' }); return; }

    const promo = await prisma.promo_codes.findUnique({ where: { code: code.trim().toUpperCase() } });

    if (!promo || !promo.is_active) {
      res.json({ valid: false, message: 'Invalid or inactive promo code' });
      return;
    }

    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      res.json({ valid: false, message: 'This promo code has expired' });
      return;
    }

    if (promo.usage_limit && (promo.usage_count || 0) >= promo.usage_limit) {
      res.json({ valid: false, message: 'This promo code has reached its usage limit' });
      return;
    }

    // Calculate discount
    let discountAmount = 0;
    const discountValue = Number(promo.discount_value);

    if (cart_items && cart_items.length > 0) {
      const applicableItems = cart_items.filter((item: any) => {
        if (promo.song_id && item.song_id !== promo.song_id) return false;
        if (promo.license_type && item.license_type !== promo.license_type) return false;
        return true;
      });

      const subtotal = applicableItems.reduce((sum: number, item: any) => sum + Number(item.license_price || 0), 0);

      if (promo.discount_type === 'percentage') {
        discountAmount = subtotal * (discountValue / 100);
      } else {
        discountAmount = Math.min(discountValue, subtotal);
      }
    }

    res.json({
      valid: true,
      message: 'Promo code applied',
      promo_code_id: promo.id,
      discount_amount: discountAmount,
      discount_type: promo.discount_type,
      discount_value: discountValue,
      applied_to_song_id: promo.song_id,
      applied_to_license_type: promo.license_type,
    });
  } catch (error) {
    console.error('Error validating promo code:', error);
    res.status(500).json({ valid: false, message: 'Internal server error' });
  }
});

export default router;
