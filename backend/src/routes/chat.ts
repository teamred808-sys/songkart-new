import { Router, Response } from 'express';
import prisma from '../db/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get chat messages
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const messages = await prisma.chat_logs.findMany({
      orderBy: { created_at: 'asc' }
      // The old schema expected 'sender' relation, but our generated schema might not have mapped it correctly yet
      // so we will just return the base chat_logs
    });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send a new message
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.user?.id;
    if (!senderId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { content } = req.body;

    if (!content) {
      res.status(400).json({ error: 'Message content is required' });
      return;
    }

    const message = await prisma.chat_logs.create({
      data: {
        user_id: senderId,
        content,
        session_id: 'default-session', // required by our schema
        role: req.user?.role || 'user', // required by our schema
      }
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending chat message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
