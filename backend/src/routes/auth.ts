import { Router, Request, Response, RequestHandler } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import prisma from '../db/prisma';
import { JWT_SECRET } from '../config';

const router = Router();

const checkName: RequestHandler = async (req, res, next) => {
  try {
    const { name, exclude_user_id } = req.body;
    
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const query: any = { full_name: name };
    
    if (exclude_user_id) {
      query.id = { not: exclude_user_id };
    }

    const existingName = await prisma.profiles.findFirst({ where: query });
    
    res.json(!existingName);
  } catch (error) {
    console.error('Error checking display name:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const signup: RequestHandler = async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const existingUser = await prisma.users.findFirst({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'A user with this email already exists' });
      return;
    }

    if (name) {
      const existingName = await prisma.profiles.findFirst({ where: { full_name: name } });
      if (existingName) {
        res.status(400).json({ error: 'Name already taken' });
        return;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const baseUser = await prisma.users.create({
      data: {
        email,
        password_hash: hashedPassword,
      }
    });
    
    console.log("Attempting to create user profile with specialties array...");
    const user = await prisma.profiles.create({
      data: {
        id: baseUser.id,
        email,
        full_name: name,
        social_links: {},
        fraud_flags: [],
        kyc_documents: [],
        specialties: [],
        role: role || 'buyer'
      },
    });
    console.log("Profile created successfully!");
    
    await prisma.user_roles.create({
      data: {
        user_id: user.id,
        role: role || 'buyer'
      }
    });

    const token = jwt.sign({ id: user.id, role: role || 'buyer' }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: role || 'buyer',
      },
    });
  } catch (error: any) {
    console.error('Signup database error:', error);
    
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'A user with this email or username already exists' });
      return;
    }
    
    res.status(500).json({ error: 'Database error occurred during signup' });
  }
};

const login: RequestHandler = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.profiles.findFirst({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const baseUser = await prisma.users.findFirst({ where: { id: user.id } });
    if (!baseUser || !baseUser.password_hash) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, baseUser.password_hash); 
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    
    const userRole = await prisma.user_roles.findFirst({
      where: { user_id: user.id }
    });
    
    let roleStr = 'buyer';
    if (userRole && userRole.role) {
      roleStr = typeof userRole.role === 'string' ? userRole.role : 'buyer';
    }

    const token = jwt.sign({ id: user.id, role: roleStr }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: roleStr,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

router.post('/check-name', checkName);
router.post('/signup', signup);
router.post('/login', login);

export default router;
