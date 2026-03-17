import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { sendVerificationEmail, verifyVerificationToken } from '../../utils/email';
import prisma from '../../db/prisma';

const router = Router();

// Rate limiting map: userId -> last sent timestamp
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

router.post('/send-verification', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check if user exists and get profile
    const profile = await prisma.profiles.findUnique({
      where: { id: userId }
    });

    if (!profile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if already verified
    if (profile.is_verified) {
      res.json({ 
        error: 'Already verified',
        already_verified: true 
      });
      return;
    }

    // Rate limiting check
    const lastSent = rateLimitMap.get(userId);
    const now = Date.now();
    
    if (lastSent && (now - lastSent) < RATE_LIMIT_MS) {
      const remainingMs = RATE_LIMIT_MS - (now - lastSent);
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      
      res.json({ 
        error: `Please wait ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''} before requesting another verification email.`,
        rate_limited: true 
      });
      return;
    }

    // Send verification email
    const emailSent = await sendVerificationEmail({
      email: profile.email,
      userId: profile.id,
      name: profile.full_name || undefined
    });

    if (!emailSent) {
      res.status(500).json({ error: 'Failed to send verification email. Please try again later.' });
      return;
    }

    // Update rate limit
    rateLimitMap.set(userId, now);

    res.json({ 
      success: true, 
      message: 'Verification email sent successfully.' 
    });
  } catch (error) {
    console.error('Error in send-verification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Missing verification token' });
      return;
    }

    // Verify token
    const decoded = verifyVerificationToken(token);
    
    if (!decoded) {
      res.status(400).json({ error: 'Invalid or expired verification token' });
      return;
    }

    // Check if user exists
    const profile = await prisma.profiles.findUnique({
      where: { id: decoded.userId }
    });

    if (!profile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if already verified
    if (profile.is_verified) {
      res.json({ 
        success: true, 
        message: 'Email already verified',
        already_verified: true 
      });
      return;
    }

    // Update verification status
    await prisma.profiles.update({
      where: { id: decoded.userId },
      data: { is_verified: true }
    });

    console.log(`User ${decoded.userId} email verified successfully`);

    res.json({ 
      success: true, 
      message: 'Email verified successfully!' 
    });
  } catch (error) {
    console.error('Error in verify:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
