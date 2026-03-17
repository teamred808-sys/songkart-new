import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /seller_tiers - list all tier definitions
router.get('/seller_tiers', async (_req: Request, res: Response) => {
  try {
    const tiers = await prisma.seller_tiers.findMany({ orderBy: { tier_level: 'asc' } });
    const mapped = tiers.map((t: any) => ({
      ...t,
      min_lifetime_sales: Number(t.min_lifetime_sales),
      max_price_lyrics_only: t.max_price_lyrics_only ? Number(t.max_price_lyrics_only) : null,
      max_price_with_audio: t.max_price_with_audio ? Number(t.max_price_with_audio) : null,
    }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching seller tiers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /rpc/get_seller_tier - get a seller's current tier info
router.post('/rpc/get_seller_tier', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.body.p_seller_id || req.user?.id;
    if (!sellerId) { res.json([]); return; }

    // Get seller tier status
    const tierStatus = await prisma.seller_tier_status.findUnique({
      where: { seller_id: sellerId },
      include: { seller_tiers: true },
    });

    if (!tierStatus) {
      // No tier status - return default tier 1
      const defaultTier = await prisma.seller_tiers.findUnique({ where: { tier_level: 1 } });
      if (!defaultTier) {
        res.json([{
          tier_level: 1,
          tier_name: 'Starter',
          badge_label: 'Starter',
          badge_color: 'gray',
          lifetime_sales: 0,
          max_price_lyrics_only: null,
          max_price_with_audio: null,
          next_tier_threshold: null,
          amount_to_next_tier: null,
          is_frozen: false,
          frozen_reason: null,
        }]);
        return;
      }

      // Find next tier
      const nextTier = await prisma.seller_tiers.findFirst({
        where: { tier_level: { gt: 1 } },
        orderBy: { tier_level: 'asc' },
      });

      res.json([{
        tier_level: defaultTier.tier_level,
        tier_name: defaultTier.name,
        badge_label: defaultTier.badge_label,
        badge_color: defaultTier.badge_color || 'gray',
        lifetime_sales: 0,
        max_price_lyrics_only: defaultTier.max_price_lyrics_only ? Number(defaultTier.max_price_lyrics_only) : null,
        max_price_with_audio: defaultTier.max_price_with_audio ? Number(defaultTier.max_price_with_audio) : null,
        next_tier_threshold: nextTier ? Number(nextTier.min_lifetime_sales) : null,
        amount_to_next_tier: nextTier ? Number(nextTier.min_lifetime_sales) : null,
        is_frozen: false,
        frozen_reason: null,
      }]);
      return;
    }

    const currentTier = tierStatus.seller_tiers;
    const lifetimeSales = Number(tierStatus.lifetime_sales_amount);

    // Find next tier
    const nextTier = await prisma.seller_tiers.findFirst({
      where: { tier_level: { gt: currentTier.tier_level } },
      orderBy: { tier_level: 'asc' },
    });

    const nextThreshold = nextTier ? Number(nextTier.min_lifetime_sales) : null;
    const amountToNext = nextThreshold !== null ? Math.max(0, nextThreshold - lifetimeSales) : null;

    res.json([{
      tier_level: currentTier.tier_level,
      tier_name: currentTier.name,
      badge_label: currentTier.badge_label,
      badge_color: currentTier.badge_color || 'gray',
      lifetime_sales: lifetimeSales,
      max_price_lyrics_only: currentTier.max_price_lyrics_only ? Number(currentTier.max_price_lyrics_only) : null,
      max_price_with_audio: currentTier.max_price_with_audio ? Number(currentTier.max_price_with_audio) : null,
      next_tier_threshold: nextThreshold,
      amount_to_next_tier: amountToNext,
      is_frozen: tierStatus.tier_frozen || false,
      frozen_reason: tierStatus.frozen_reason || null,
    }]);
  } catch (error) {
    console.error('Error fetching seller tier:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /rpc/validate_song_price - validate price against tier limits
router.post('/rpc/validate_song_price', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.body.p_seller_id || req.user?.id;
    const price = Number(req.body.p_price);
    const hasAudio = req.body.p_has_audio === true;

    if (!sellerId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    // Get seller tier status
    const tierStatus = await prisma.seller_tier_status.findUnique({
      where: { seller_id: sellerId },
      include: { seller_tiers: true },
    });

    if (!tierStatus) {
      // Default tier - get tier 1 limits
      const defaultTier = await prisma.seller_tiers.findUnique({ where: { tier_level: 1 } });
      if (!defaultTier) {
        res.json({ valid: true, max_allowed: null, tier_name: 'Starter', tier_level: 1, message: 'Price is valid' });
        return;
      }

      const maxAllowed = hasAudio
        ? (defaultTier.max_price_with_audio ? Number(defaultTier.max_price_with_audio) : null)
        : (defaultTier.max_price_lyrics_only ? Number(defaultTier.max_price_lyrics_only) : null);

      if (maxAllowed !== null && price > maxAllowed) {
        res.json({
          valid: false,
          max_allowed: maxAllowed,
          requested_price: price,
          tier_name: defaultTier.name,
          tier_level: defaultTier.tier_level,
          message: `Maximum price for ${defaultTier.name} tier is ₹${maxAllowed}`,
        });
        return;
      }

      res.json({ valid: true, max_allowed: maxAllowed, tier_name: defaultTier.name, tier_level: defaultTier.tier_level, message: 'Price is valid' });
      return;
    }

    const currentTier = tierStatus.seller_tiers;
    const maxAllowed = hasAudio
      ? (currentTier.max_price_with_audio ? Number(currentTier.max_price_with_audio) : null)
      : (currentTier.max_price_lyrics_only ? Number(currentTier.max_price_lyrics_only) : null);

    if (maxAllowed !== null && price > maxAllowed) {
      const nextTier = await prisma.seller_tiers.findFirst({
        where: { tier_level: { gt: currentTier.tier_level } },
        orderBy: { tier_level: 'asc' },
      });

      const amountToNext = nextTier ? Math.max(0, Number(nextTier.min_lifetime_sales) - Number(tierStatus.lifetime_sales_amount)) : undefined;

      res.json({
        valid: false,
        max_allowed: maxAllowed,
        requested_price: price,
        tier_name: currentTier.name,
        tier_level: currentTier.tier_level,
        amount_to_next_tier: amountToNext,
        message: `Maximum price for ${currentTier.name} tier is ₹${maxAllowed}`,
      });
      return;
    }

    res.json({ valid: true, max_allowed: maxAllowed, tier_name: currentTier.name, tier_level: currentTier.tier_level, message: 'Price is valid' });
  } catch (error) {
    console.error('Error validating song price:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /rpc/get_pending_clearance_info - get uncleared transactions
router.post('/rpc/get_pending_clearance_info', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.body.p_seller_id || req.user?.id;
    if (!sellerId) { res.json([]); return; }

    // Find transactions that are completed but not yet cleared (within 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const pendingTransactions = await prisma.transactions.findMany({
      where: {
        seller_id: sellerId,
        payment_status: 'completed',
        is_cleared: false,
        created_at: { gte: sevenDaysAgo },
      },
      orderBy: { created_at: 'asc' },
    });

    const result = pendingTransactions.map((tx: any) => {
      const createdAt = new Date(tx.created_at);
      const clearsAt = new Date(createdAt);
      clearsAt.setDate(clearsAt.getDate() + 7);

      const now = new Date();
      const diffMs = clearsAt.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      return {
        transaction_id: tx.id,
        amount: Number(tx.seller_amount),
        created_at: tx.created_at,
        clears_at: clearsAt.toISOString(),
        days_remaining: daysRemaining,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching pending clearance:', error);
    res.json([]);
  }
});

// POST /rpc/can_seller_withdraw - check withdrawal eligibility
router.post('/rpc/can_seller_withdraw', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.json({ can_withdraw: false, reason: 'not_authenticated', message: 'Please sign in.' });
      return;
    }

    // Check payout profile
    const payoutProfile = await prisma.seller_payout_profiles.findUnique({ where: { seller_id: userId } });

    if (!payoutProfile) {
      res.json({ can_withdraw: false, reason: 'no_payout_profile', message: 'Please add your bank details first.' });
      return;
    }

    if (payoutProfile.verification_status !== 'verified') {
      res.json({
        can_withdraw: false,
        reason: 'payout_not_verified',
        status: payoutProfile.verification_status,
        message: 'Your bank details are pending verification.',
      });
      return;
    }

    // Check account health
    const health = await prisma.seller_account_health.findUnique({ where: { seller_id: userId } });
    if (health?.is_frozen || health?.is_deactivated) {
      res.json({ can_withdraw: false, reason: 'account_restricted', message: 'Your account is currently restricted.' });
      return;
    }

    // Check pending withdrawal
    const pendingWithdrawal = await prisma.withdrawal_requests.findFirst({
      where: { user_id: userId, status: { in: ['pending', 'approved'] } },
    });

    res.json({
      can_withdraw: true,
      reason: null,
      message: 'You are eligible to withdraw.',
      has_pending_withdrawal: !!pendingWithdrawal,
      account_last4: payoutProfile.account_number_last4,
      bank_name: payoutProfile.bank_name,
    });
  } catch (error) {
    console.error('Error checking withdrawal eligibility:', error);
    res.json({ can_withdraw: false, reason: 'error', message: 'Unable to check eligibility.' });
  }
});

export default router;
