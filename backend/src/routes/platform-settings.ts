import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /platform_settings?key=X or ?key=in.(a,b,c)
router.get('/platform_settings', async (req: Request, res: Response) => {
  try {
    const key = req.query.key as string | undefined;
    const where: any = {};

    if (key) {
      const inMatch = key.match(/^in\.\((.+)\)$/);
      if (inMatch && inMatch[1]) {
        where.key = { in: inMatch[1].split(',') };
      } else {
        where.key = key;
      }
    }

    const settings = await prisma.platform_settings.findMany({ where });
    res.json(settings);
  } catch (error) {
    console.error('Error fetching platform settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /platform_settings — upsert a single setting {key, value}
router.post('/platform_settings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { key, value } = req.body;
    if (!key) { res.status(400).json({ error: 'key is required' }); return; }

    const setting = await prisma.platform_settings.upsert({
      where: { key },
      create: { key, value },
      update: { value, updated_at: new Date(), updated_by: req.user?.id || null },
    });
    res.json(setting);
  } catch (error) {
    console.error('Error upserting platform setting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /platform_settings/:id
router.patch('/platform_settings/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const setting = await prisma.platform_settings.update({
      where: { id },
      data: { value: req.body.value, updated_at: new Date(), updated_by: req.user?.id || null },
    });
    res.json(setting);
  } catch (error) {
    console.error('Error updating platform setting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
