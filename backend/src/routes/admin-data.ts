import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// ============ COUNTS ============

router.get('/profiles/count', authenticate, async (_req: Request, res: Response) => {
  try {
    const count = await prisma.profiles.count();
    res.json({ count });
  } catch (error) {
    console.error('Error counting profiles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/songs/count', authenticate, async (_req: Request, res: Response) => {
  try {
    const count = await prisma.songs.count();
    res.json({ count });
  } catch (error) {
    console.error('Error counting songs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/songs/pending/count', authenticate, async (_req: Request, res: Response) => {
  try {
    const count = await prisma.songs.count({ where: { status: 'pending' } });
    res.json({ count });
  } catch (error) {
    console.error('Error counting pending songs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/transactions/completed', authenticate, async (_req: Request, res: Response) => {
  try {
    const data = await prisma.transactions.findMany({ where: { payment_status: 'completed' } });
    const mapped = data.map((t: any) => ({ ...t, amount: Number(t.amount), seller_amount: Number(t.seller_amount), commission_amount: Number(t.commission_amount), commission_rate: Number(t.commission_rate) }));
    res.json({ count: data.length, data: mapped });
  } catch (error) {
    console.error('Error fetching completed transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/withdrawals/pending', authenticate, async (_req: Request, res: Response) => {
  try {
    const data = await prisma.withdrawal_requests.findMany({ where: { status: 'pending' } });
    const mapped = data.map((w: any) => ({ ...w, amount: Number(w.amount) }));
    res.json({ count: data.length, data: mapped });
  } catch (error) {
    console.error('Error fetching pending withdrawals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/disputes/active', authenticate, async (_req: Request, res: Response) => {
  try {
    const count = await prisma.disputes.count({ where: { status: 'open' } });
    res.json({ count });
  } catch (error) {
    console.error('Error counting disputes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ USERS ============

router.get('/users', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.query.role as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const where: any = {};
    if (status) where.account_status = status;
    if (search) where.OR = [{ full_name: { contains: search } }, { email: { contains: search } }];

    const profiles = await prisma.profiles.findMany({ where, orderBy: { created_at: 'desc' }, take: 100 });

    if (role) {
      const userRoles = await prisma.user_roles.findMany({ where: { role: role as any } });
      const roleUserIds = new Set(userRoles.map(r => r.user_id));
      const filtered = profiles.filter(p => roleUserIds.has(p.id));
      res.json(filtered);
      return;
    }

    res.json(profiles);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const profile = await prisma.profiles.findUnique({ where: { id } });
    if (!profile) { res.status(404).json({ error: 'User not found' }); return; }
    
    const rolesData = await prisma.user_roles.findMany({ where: { user_id: id } });
    const roles = rolesData.map(r => r.role);
    
    let wallet = null;
    let songStats = { total: 0, approved: 0, pending: 0, rejected: 0 };
    let totalSpent = 0;
    
    if (roles.includes('seller')) {
      const walletRecord = await prisma.seller_wallets.findFirst({ where: { user_id: id } });
      if (walletRecord) {
        wallet = {
          ...walletRecord,
          available_balance: Number(walletRecord.available_balance),
          pending_balance: Number(walletRecord.pending_balance),
          total_earnings: Number(walletRecord.total_earnings)
        };
      }
      
      const stats = await prisma.songs.groupBy({
        by: ['status'],
        where: { seller_id: id },
        _count: true
      });
      stats.forEach(s => {
        if (s.status === 'approved') songStats.approved = s._count;
        if (s.status === 'pending') songStats.pending = s._count;
        if (s.status === 'rejected') songStats.rejected = s._count;
      });
      songStats.total = songStats.approved + songStats.pending + songStats.rejected;
    } else {
      const spent = await prisma.transactions.aggregate({
        where: { buyer_id: id, payment_status: 'completed' },
        _sum: { amount: true }
      });
      totalSpent = Number(spent._sum.amount || 0);
    }
    
    res.json({ profile, roles, wallet, songStats, totalSpent });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/:id/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const { account_status, suspension_reason } = req.body;
    const profile = await prisma.profiles.update({
      where: { id },
      data: { account_status, suspension_reason: suspension_reason || null, suspended_at: account_status === 'suspended' ? new Date() : null },
    });
    res.json(profile);
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/:id/verify', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const profile = await prisma.profiles.update({ where: { id }, data: { is_verified: true } });
    res.json(profile);
  } catch (error) {
    console.error('Error verifying user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ SONGS (admin) ============

router.get('/songs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const sellerId = req.query.seller_id as string | undefined;
    const search = req.query.search as string | undefined;

    const where: any = {};
    if (status) where.status = status;
    if (sellerId) where.seller_id = sellerId;
    if (search) where.title = { contains: search };

    const songs = await prisma.songs.findMany({
      where, include: { genres: true, moods: true, profiles: { select: { id: true, full_name: true, email: true } } },
      orderBy: { created_at: 'desc' }, take: 100,
    });
    const mapped = songs.map((s: any) => ({ ...s, base_price: Number(s.base_price), genre: s.genres || null, mood: s.moods || null, seller: s.profiles || null }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching admin songs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/songs/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const song = await prisma.songs.findUnique({
      where: { id }, include: { genres: true, moods: true, license_tiers: true, profiles: { select: { id: true, full_name: true, email: true } } },
    });
    if (!song) { res.status(404).json({ error: 'Song not found' }); return; }
    res.json({ ...song, base_price: Number(song.base_price), genre: song.genres || null, mood: song.moods || null, seller: song.profiles || null });
  } catch (error) {
    console.error('Error fetching admin song:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/songs/:id/approve', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const song = await prisma.songs.update({ where: { id }, data: { status: 'approved', approved_at: new Date(), rejection_reason: null } });
    res.json({ ...song, base_price: Number(song.base_price) });
  } catch (error) {
    console.error('Error approving song:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/songs/:id/reject', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const { reason } = req.body;
    const song = await prisma.songs.update({ where: { id }, data: { status: 'rejected', rejection_reason: reason || 'Rejected by admin' } });
    res.json({ ...song, base_price: Number(song.base_price) });
  } catch (error) {
    console.error('Error rejecting song:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ TRANSACTIONS (admin) ============

router.get('/transactions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.payment_status as string | undefined;
    const where: any = {};
    if (status) where.payment_status = status;

    const txs = await prisma.transactions.findMany({
      where, include: { songs: { select: { title: true } }, license_tiers: { select: { license_type: true, price: true } } },
      orderBy: { created_at: 'desc' }, take: 100,
    });
    const mapped = txs.map((t: any) => ({ ...t, amount: Number(t.amount), seller_amount: Number(t.seller_amount), commission_amount: Number(t.commission_amount), commission_rate: Number(t.commission_rate) }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching admin transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ WITHDRAWALS (admin) ============

router.get('/withdrawals', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const where: any = {};
    if (status) where.status = status;

    const requests = await prisma.withdrawal_requests.findMany({ where, orderBy: { created_at: 'desc' }, take: 100 });
    const mapped = requests.map((r: any) => ({ ...r, amount: Number(r.amount) }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching admin withdrawals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/withdrawals/:id/process', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const { action, status: statusField, notes, paymentReference } = req.body;
    const rawAction = action || statusField;
    const status = rawAction === 'approve' ? 'approved' : rawAction === 'reject' ? 'rejected' : rawAction || 'processed';
    const request = await prisma.withdrawal_requests.update({
      where: { id }, data: { status: status as any, notes: notes || null, processed_at: new Date(), processed_by: req.user?.id || null, payment_reference: paymentReference || null },
    });
    res.json({ ...request, amount: Number(request.amount) });
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ DISPUTES (admin) ============

router.get('/disputes', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const where: any = {};
    if (status) where.status = status;
    const disputes = await prisma.disputes.findMany({ where, orderBy: { created_at: 'desc' }, take: 100 });
    res.json(disputes);
  } catch (error) {
    console.error('Error fetching disputes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/disputes/:id/resolve', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const { resolution } = req.body;
    const dispute = await prisma.disputes.update({
      where: { id }, data: { status: 'resolved', resolution: resolution || null, resolved_by: req.user?.id || null, resolved_at: new Date() },
    });
    res.json(dispute);
  } catch (error) {
    console.error('Error resolving dispute:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ FEATURED CONTENT ============

router.get('/featured-content', authenticate, async (_req: Request, res: Response) => {
  try {
    const featured = await prisma.songs.findMany({ where: { is_featured: true }, include: { genres: true }, orderBy: { created_at: 'desc' } });
    const mapped = featured.map((s: any) => ({ ...s, base_price: Number(s.base_price) }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching featured:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/featured-content', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { song_id } = req.body;
    const song = await prisma.songs.update({ where: { id: song_id }, data: { is_featured: true } });
    res.json({ ...song, base_price: Number(song.base_price) });
  } catch (error) {
    console.error('Error adding featured:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /featured-content/:id
router.patch('/featured-content/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const updateData: any = {};
    const allowedFields = ['is_featured', 'display_order'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }
    const song = await prisma.songs.update({ where: { id }, data: updateData });
    res.json({ ...song, base_price: Number(song.base_price) });
  } catch (error) {
    console.error('Error updating featured:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/featured-content/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const song = await prisma.songs.update({ where: { id }, data: { is_featured: false } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing featured:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ SETTINGS ============

router.get('/settings', authenticate, async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.platform_settings.findMany();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /settings - single setting update {key, value}
router.post('/settings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { key, value } = req.body;
    if (!key) { res.status(400).json({ error: 'key is required' }); return; }

    await prisma.platform_settings.upsert({
      where: { key }, create: { key, value }, update: { value, updated_at: new Date(), updated_by: req.user?.id || null },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /settings - bulk update [{key, value}, ...]
router.patch('/settings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const updates = req.body;
    if (Array.isArray(updates)) {
      for (const item of updates) {
        await prisma.platform_settings.upsert({
          where: { key: item.key }, create: { key: item.key, value: item.value }, update: { value: item.value, updated_at: new Date(), updated_by: req.user?.id || null },
        });
      }
    } else if (updates.key) {
      await prisma.platform_settings.upsert({
        where: { key: updates.key }, create: { key: updates.key, value: updates.value }, update: { value: updates.value, updated_at: new Date(), updated_by: req.user?.id || null },
      });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ ACTIVITY LOGS ============

router.get('/activity-logs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const entityType = req.query.entity_type as string | undefined;
    const userId = req.query.user_id as string | undefined;
    const where: any = {};
    if (entityType) where.entity_type = entityType;
    if (userId) where.user_id = userId;
    const logs = await prisma.activity_logs.findMany({ where, orderBy: { created_at: 'desc' }, take: 100 });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ FUND MANAGEMENT ============

router.post('/release-funds', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Release cleared funds for all sellers
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const uncleared = await prisma.transactions.findMany({
      where: { payment_status: 'completed', is_cleared: false, created_at: { lte: sevenDaysAgo } },
    });

    for (const tx of uncleared) {
      await prisma.transactions.update({ where: { id: tx.id }, data: { is_cleared: true, cleared_at: new Date() } });
      // Update seller wallet
      await prisma.seller_wallets.updateMany({
        where: { user_id: tx.seller_id },
        data: { available_balance: { increment: tx.seller_amount }, pending_balance: { decrement: tx.seller_amount } },
      });
    }

    res.json({ success: true, released: uncleared.length });
  } catch (error) {
    console.error('Error releasing funds:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/process-payout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { withdrawal_id } = req.body;
    if (!withdrawal_id) { res.status(400).json({ error: 'withdrawal_id required' }); return; }

    const wr = await prisma.withdrawal_requests.update({
      where: { id: withdrawal_id }, data: { status: 'processed', processed_at: new Date(), processed_by: req.user?.id || null },
    });
    res.json({ ...wr, amount: Number(wr.amount) });
  } catch (error) {
    console.error('Error processing payout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/rpc/instant_release_seller_funds', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const seller_id = req.body.seller_id || req.body.p_seller_id;
    if (!seller_id) { res.status(400).json({ error: 'seller_id required' }); return; }

    const uncleared = await prisma.transactions.findMany({
      where: { seller_id, payment_status: 'completed', is_cleared: false },
    });

    for (const tx of uncleared) {
      await prisma.transactions.update({ where: { id: tx.id }, data: { is_cleared: true, cleared_at: new Date() } });
    }

    const totalReleased = uncleared.reduce((sum, tx) => sum + Number(tx.seller_amount), 0);
    if (totalReleased > 0) {
      await prisma.seller_wallets.updateMany({
        where: { user_id: seller_id },
        data: { available_balance: { increment: totalReleased }, pending_balance: { decrement: totalReleased } },
      });
    }

    res.json({ success: true, released_count: uncleared.length, released_amount: totalReleased });
  } catch (error) {
    console.error('Error instant releasing funds:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
