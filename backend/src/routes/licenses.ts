import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// ============ LICENSE TIER DEFINITIONS ============

router.get('/license_tier_definitions', async (req: Request, res: Response) => {
  try {
    const isActive = req.query.is_active as string | undefined;
    const where: any = {};
    if (isActive !== undefined) where.is_active = isActive === 'true';

    const defs = await prisma.license_tier_definitions.findMany({ where, orderBy: { display_order: 'asc' } });
    res.json(defs);
  } catch (error) {
    console.error('Error fetching license tier definitions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ LICENSE RIGHTS LABELS ============

router.get('/license_rights_labels', async (req: Request, res: Response) => {
  try {
    const isActive = req.query.is_active as string | undefined;
    const where: any = {};
    if (isActive !== undefined) where.is_active = isActive === 'true';

    const labels = await prisma.license_rights_labels.findMany({ where, orderBy: { display_order: 'asc' } });
    res.json(labels);
  } catch (error) {
    console.error('Error fetching license rights labels:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ LICENSE DOCUMENTS ============

router.get('/license_documents', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const buyerId = req.query.buyer_id as string | undefined;
    const orderItemId = req.query.order_item_id as string | undefined;

    // license_documents table may not exist in current schema — return empty
    res.json([]);
  } catch (error) {
    console.error('Error fetching license documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/license_documents', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Stub — license document creation
    res.status(201).json({ success: true, message: 'License document created' });
  } catch (error) {
    console.error('Error creating license document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ LICENSE OPERATIONS ============

router.post('/download-license', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { transaction_id, order_item_id } = req.body;
    // Stub — in production, generate and return PDF URL
    res.json({ success: true, url: null, message: 'License download not yet configured' });
  } catch (error) {
    console.error('Error downloading license:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/generate-license-pdf', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { transaction_id } = req.body;
    // Stub — in production, generate PDF
    res.json({ success: true, url: null, message: 'PDF generation not yet configured' });
  } catch (error) {
    console.error('Error generating license PDF:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/revoke-license', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { transaction_id } = req.body;
    // Stub — in production, revoke license access
    res.json({ success: true, message: 'License revocation not yet configured' });
  } catch (error) {
    console.error('Error revoking license:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ FEATURED CONTENT (public) ============

router.get('/featured_content', async (_req: Request, res: Response) => {
  try {
    const featured = await prisma.songs.findMany({
      where: { is_featured: true, status: 'approved' },
      include: { genres: true, moods: true, license_tiers: true, profiles: { select: { id: true, full_name: true, avatar_url: true } } },
      orderBy: { created_at: 'desc' },
      take: 20,
    });

    const mapped = featured.map((s: any) => ({
      ...s, base_price: Number(s.base_price), genre: s.genres || null, mood: s.moods || null, seller: s.profiles || null,
    }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching featured content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
