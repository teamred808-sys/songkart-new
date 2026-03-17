import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /seller_payout_profiles?seller_id=X&is_active=true&verification_status=X
router.get('/seller_payout_profiles', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.query.seller_id as string | undefined;
    const isActive = req.query.is_active as string | undefined;
    const verificationStatus = req.query.verification_status as string | undefined;

    const where: any = {};
    if (sellerId) where.seller_id = sellerId;
    if (isActive !== undefined) where.is_active = isActive === 'true';
    if (verificationStatus) where.verification_status = verificationStatus;

    const profiles = await prisma.seller_payout_profiles.findMany({ where, orderBy: { created_at: 'desc' } });
    res.json(profiles);
  } catch (error) {
    console.error('Error fetching payout profiles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /seller_payout_profiles
router.post('/seller_payout_profiles', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const data = req.body;
    if (!data.seller_id || !data.account_holder_name || !data.bank_name || !data.ifsc_code) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const profile = await prisma.seller_payout_profiles.create({ data });
    res.status(201).json(profile);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Payout profile already exists for this seller' });
      return;
    }
    console.error('Error creating payout profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /seller_payout_profiles/:id
router.patch('/seller_payout_profiles/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const profileId = req.params['id'] as string;
    const updateData = req.body;

    const profile = await prisma.seller_payout_profiles.update({
      where: { id: profileId },
      data: updateData,
    });

    res.json(profile);
  } catch (error) {
    console.error('Error updating payout profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /activity_logs
router.post('/activity_logs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const log = await prisma.activity_logs.create({ data: req.body });
    res.status(201).json(log);
  } catch (error) {
    console.error('Error creating activity log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /payout_profile_change_logs?seller_id=X&limit=N
router.get('/payout_profile_change_logs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.query.seller_id as string | undefined;
    const limitStr = req.query.limit as string | undefined;

    const where: any = {};
    if (sellerId) where.seller_id = sellerId;

    const findArgs: any = { where, orderBy: { created_at: 'desc' as const } };
    if (limitStr) findArgs.take = parseInt(limitStr);

    const logs = await prisma.payout_profile_change_logs.findMany(findArgs);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching payout change logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
