import { Router, Response } from 'express';
import prisma from '../db/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get purchases for current user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const purchases = await prisma.orders.findMany({
      where: { buyer_id: userId },
      // Include logic will depend on relation mappings. Leaving out includes for now to fix compile.
    });

    res.json(purchases);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new purchase
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { songId, amount } = req.body;

    if (!songId || amount === undefined) {
      res.status(400).json({ error: 'Song ID and amount are required' });
      return;
    }

    // Verify song exists
    const song = await prisma.songs.findUnique({ where: { id: songId } });
    if (!song) {
      res.status(404).json({ error: 'Song not found' });
      return;
    }

    const purchase = await prisma.orders.create({
      data: {
        buyer_id: userId,
        order_number: `ORD-${Date.now()}`,
        subtotal: amount,
        platform_fee: 0,
        total_amount: amount,
      },
    });

    res.status(201).json(purchase);
  } catch (error) {
    console.error('Error creating purchase:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
