import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all users (admin only or simplified for everyone)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.profiles.findMany({
      select: {
        id: true,
        email: true,
        full_name: true,
        created_at: true,
      },
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.profiles.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        full_name: true,
        avatar_url: true,
        bio: true,
        website: true,
        is_verified: true,
        dynamic_pricing_enabled: true,
        created_at: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userRoles = await prisma.user_roles.findMany({
      where: { user_id: userId }
    });
    
    let roleStr = 'buyer';
    const rolesArray = userRoles.map(ur => typeof ur.role === 'string' ? ur.role : 'buyer');
    
    // Set primary role based on priority: admin > seller > buyer
    if (rolesArray.includes('admin')) roleStr = 'admin';
    else if (rolesArray.includes('seller')) roleStr = 'seller';
    else if (rolesArray.length > 0) roleStr = rolesArray[0] || 'buyer';

    res.json({
      ...user,
      role: roleStr,
      roles: rolesArray.length > 0 ? rolesArray : ['buyer']
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
