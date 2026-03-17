import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';

const router = Router();

// Equivalent to `download-order-audio` and `download-purchased`
// Purpose: Allows buyers to download the high-quality source audio files for songs they have successfully purchased.
router.get('/audio/:orderId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const orderId = req.params['orderId'];
    
    if (!orderId) {
      res.status(400).json({ error: 'Missing orderId' });
      return;
    }

    // Verify user owns this order, then generate download URL or stream
    res.json({ url: 'https://storage.example.com/downloads/full-audio.wav' });
  } catch (error) {
    console.error('Error in download-audio:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Equivalent to `download-license` and `generate-license-pdf`
// Purpose: Generates and provides a download link for a PDF document proving the buyer's legal right to use the purchased song.
router.get('/license/:orderId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const orderId = req.params['orderId'];

    // Verify ownership and generate/fetch PDF
    res.json({ url: 'https://storage.example.com/licenses/license-123.pdf' });
  } catch (error) {
    console.error('Error in download-license:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Equivalent to `revoke-license`
// Purpose: Invalidates a license if an order is refunded, cancelled, or disputed.
router.post('/revoke-license', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.body;
    
    // Revoke access in DB
    res.json({ success: true, message: 'License revoked.' });
  } catch (error) {
    console.error('Error in revoke-license:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
