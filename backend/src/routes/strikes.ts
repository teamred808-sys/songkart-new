import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /seller_account_health?seller_id=X
router.get('/seller_account_health', async (req: Request, res: Response) => {
  try {
    const sellerId = req.query.seller_id as string | undefined;
    const where: any = {};
    if (sellerId) where.seller_id = sellerId;

    const records = await prisma.seller_account_health.findMany({ where });
    const mapped = records.map((r: any) => ({
      ...r,
      forfeited_amount: r.forfeited_amount ? Number(r.forfeited_amount) : 0,
    }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching seller account health:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /seller_account_health/full - with profile info (admin)
router.get('/seller_account_health/full', async (_req: Request, res: Response) => {
  try {
    const records = await prisma.seller_account_health.findMany({
      orderBy: { updated_at: 'desc' },
    });
    res.json(records);
  } catch (error) {
    console.error('Error fetching all seller health:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /seller_strikes/full?seller_id=X&status=X&strike_type=X
router.get('/seller_strikes/full', async (req: Request, res: Response) => {
  try {
    const sellerId = req.query.seller_id as string | undefined;
    const status = req.query.status as string | undefined;
    const strikeType = req.query.strike_type as string | undefined;

    const where: any = {};
    if (sellerId) where.seller_id = sellerId;
    if (status) where.status = status;
    if (strikeType) where.strike_type = strikeType;

    const strikes = await prisma.seller_strikes.findMany({
      where,
      include: {
        songs: { select: { title: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const mapped = strikes.map((s: any) => ({
      ...s,
      song: s.songs ? { title: s.songs.title } : null,
      evidence_urls: s.evidence_urls || [],
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching seller strikes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /strike_notifications?seller_id=X&is_read=X&limit=N
router.get('/strike_notifications', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.query.seller_id as string | undefined;
    const isRead = req.query.is_read as string | undefined;
    const limitStr = req.query.limit as string | undefined;

    const where: any = {};
    if (sellerId) where.seller_id = sellerId;
    if (isRead !== undefined) where.is_read = isRead === 'true';

    const findArgs: any = { where, orderBy: { created_at: 'desc' as const } };
    if (limitStr) findArgs.take = parseInt(limitStr);

    const notifications = await prisma.strike_notifications.findMany(findArgs);
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching strike notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /strike_notifications/:id
router.patch('/strike_notifications/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const notification = await prisma.strike_notifications.update({
      where: { id },
      data: req.body,
    });
    res.json(notification);
  } catch (error) {
    console.error('Error updating strike notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /rpc/submit_strike_appeal
router.post('/rpc/submit_strike_appeal', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { strike_id, reason } = req.body;
    if (!strike_id || !reason) {
      res.status(400).json({ error: 'strike_id and reason are required' });
      return;
    }

    const strike = await prisma.seller_strikes.update({
      where: { id: strike_id },
      data: {
        appeal_status: 'pending',
        appeal_reason: reason,
        appeal_submitted_at: new Date(),
        status: 'appealed',
        updated_at: new Date(),
      },
    });

    res.json(strike);
  } catch (error) {
    console.error('Error submitting strike appeal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /rpc/issue_seller_strike (admin)
router.post('/rpc/issue_seller_strike', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { seller_id, strike_type, reason, details, evidence_urls, song_id } = req.body;

    if (!seller_id || !strike_type || !reason) {
      res.status(400).json({ error: 'seller_id, strike_type, and reason are required' });
      return;
    }

    // Create the strike
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + (strike_type === 'copyright' ? 2 : 1));

    const strike = await prisma.seller_strikes.create({
      data: {
        seller_id,
        strike_type,
        reason,
        details: details || null,
        evidence_urls: evidence_urls || [],
        song_id: song_id || null,
        issued_by: userId || null,
        expires_at: expiresAt,
      },
    });

    // Update account health
    const health = await prisma.seller_account_health.findUnique({ where: { seller_id } });
    if (health) {
      const updateData: any = {
        last_strike_at: new Date(),
        last_health_update: new Date(),
        updated_at: new Date(),
      };

      if (strike_type === 'copyright') {
        updateData.copyright_strikes_active = health.copyright_strikes_active + 1;
      } else {
        updateData.community_strikes_active = health.community_strikes_active + 1;
      }

      // Calculate new health score
      const communityStrikes = updateData.community_strikes_active ?? health.community_strikes_active;
      const copyrightStrikes = updateData.copyright_strikes_active ?? health.copyright_strikes_active;
      updateData.health_score = Math.max(0, 100 - (communityStrikes * 15) - (copyrightStrikes * 25));

      // Check for freeze/deactivation
      if (copyrightStrikes >= 3) {
        updateData.is_deactivated = true;
        updateData.deactivated_at = new Date();
        updateData.deactivation_reason = 'Three copyright strikes';
      } else if (communityStrikes >= 3) {
        updateData.is_frozen = true;
        updateData.frozen_at = new Date();
        const frozenUntil = new Date();
        frozenUntil.setMonth(frozenUntil.getMonth() + 1);
        updateData.frozen_until = frozenUntil;
        updateData.freeze_reason = 'Three community strikes';
      }

      await prisma.seller_account_health.update({ where: { seller_id }, data: updateData });
    } else {
      // Create health record if doesn't exist
      const score = strike_type === 'copyright' ? 75 : 85;
      await prisma.seller_account_health.create({
        data: {
          seller_id,
          health_score: score,
          community_strikes_active: strike_type === 'community' ? 1 : 0,
          copyright_strikes_active: strike_type === 'copyright' ? 1 : 0,
          last_strike_at: new Date(),
        },
      });
    }

    // Create notification
    await prisma.strike_notifications.create({
      data: {
        seller_id,
        strike_id: strike.id,
        notification_type: 'strike_issued',
        title: `${strike_type === 'copyright' ? 'Copyright' : 'Community'} Strike Issued`,
        message: reason,
      },
    });

    res.status(201).json(strike);
  } catch (error) {
    console.error('Error issuing strike:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /rpc/reverse_seller_strike (admin)
router.post('/rpc/reverse_seller_strike', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { strike_id, reason } = req.body;

    if (!strike_id || !reason) {
      res.status(400).json({ error: 'strike_id and reason are required' });
      return;
    }

    const strike = await prisma.seller_strikes.update({
      where: { id: strike_id },
      data: {
        status: 'reversed',
        reversed_by: userId || null,
        reversed_at: new Date(),
        reversal_reason: reason,
        updated_at: new Date(),
      },
    });

    // Update account health
    const health = await prisma.seller_account_health.findUnique({ where: { seller_id: strike.seller_id } });
    if (health) {
      const updateData: any = { last_health_update: new Date(), updated_at: new Date() };

      if (strike.strike_type === 'copyright') {
        updateData.copyright_strikes_active = Math.max(0, health.copyright_strikes_active - 1);
      } else {
        updateData.community_strikes_active = Math.max(0, health.community_strikes_active - 1);
      }

      const communityStrikes = updateData.community_strikes_active ?? health.community_strikes_active;
      const copyrightStrikes = updateData.copyright_strikes_active ?? health.copyright_strikes_active;
      updateData.health_score = Math.max(0, 100 - (communityStrikes * 15) - (copyrightStrikes * 25));

      await prisma.seller_account_health.update({ where: { seller_id: strike.seller_id }, data: updateData });
    }

    res.json(strike);
  } catch (error) {
    console.error('Error reversing strike:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /rpc/restore_seller_account (admin)
router.post('/rpc/restore_seller_account', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { seller_id, notes } = req.body;

    if (!seller_id) {
      res.status(400).json({ error: 'seller_id is required' });
      return;
    }

    const health = await prisma.seller_account_health.update({
      where: { seller_id },
      data: {
        is_frozen: false,
        frozen_at: null,
        frozen_until: null,
        freeze_reason: null,
        is_deactivated: false,
        deactivated_at: null,
        deactivation_reason: null,
        restored_by: userId || null,
        restored_at: new Date(),
        restoration_notes: notes || null,
        health_score: 70,
        updated_at: new Date(),
      },
    });

    res.json(health);
  } catch (error) {
    console.error('Error restoring seller account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /rpc/check_seller_can_upload
router.post('/rpc/check_seller_can_upload', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.json({ can_upload: false, reason: 'Not authenticated' }); return; }

    const health = await prisma.seller_account_health.findUnique({ where: { seller_id: userId } });

    if (!health) {
      res.json({ can_upload: true, reason: null });
      return;
    }

    if (health.is_deactivated) {
      res.json({ can_upload: false, reason: 'Your account has been deactivated' });
      return;
    }

    if (health.is_frozen) {
      res.json({ can_upload: false, reason: `Your account is frozen until ${health.frozen_until?.toISOString() || 'further notice'}` });
      return;
    }

    res.json({ can_upload: true, reason: null });
  } catch (error) {
    console.error('Error checking upload ability:', error);
    res.json({ can_upload: true, reason: null });
  }
});

// POST /rpc/check_seller_can_withdraw
router.post('/rpc/check_seller_can_withdraw', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.json({ can_withdraw: false, reason: 'Not authenticated' }); return; }

    const health = await prisma.seller_account_health.findUnique({ where: { seller_id: userId } });

    if (health?.is_deactivated) {
      res.json({ can_withdraw: false, reason: 'Account deactivated' });
      return;
    }

    if (health?.is_frozen) {
      res.json({ can_withdraw: false, reason: 'Account frozen' });
      return;
    }

    res.json({ can_withdraw: true, reason: null });
  } catch (error) {
    console.error('Error checking withdraw ability:', error);
    res.json({ can_withdraw: true, reason: null });
  }
});

export default router;
