import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// ============ CMS CONTENT ============

// GET /cms_content?slug=X&type=X&status=X
router.get('/cms_content', async (req: Request, res: Response) => {
  try {
    const slug = req.query.slug as string | undefined;
    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;

    const where: any = {};
    if (slug) where.slug = slug;
    if (type) where.type = type;
    if (status) where.status = status;

    const content = await prisma.cms_content.findMany({ where, orderBy: { created_at: 'desc' } });
    res.json(content);
  } catch (error) {
    console.error('Error fetching cms content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /cms_content/full?type=X&status=X&id=X
router.get('/cms_content/full', async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;
    const id = req.query.id as string | undefined;

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (id) where.id = id;

    const content = await prisma.cms_content.findMany({
      where,
      include: { profiles: { select: { id: true, full_name: true } } },
      orderBy: { published_at: 'desc' },
    });

    const mapped = content.map((c: any) => ({ ...c, author: c.profiles || null }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching full cms content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /cms_content
router.post('/cms_content', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;
    data.author_id = data.author_id || req.user?.id || null;
    const content = await prisma.cms_content.create({ data });
    res.status(201).json(content);
  } catch (error: any) {
    if (error.code === 'P2002') { res.status(400).json({ error: 'Slug already exists' }); return; }
    console.error('Error creating cms content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /cms_content/:id
router.patch('/cms_content/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const content = await prisma.cms_content.update({ where: { id }, data: { ...req.body, updated_at: new Date() } });
    res.json(content);
  } catch (error) {
    console.error('Error updating cms content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /cms_content/:id
router.delete('/cms_content/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    await prisma.cms_content.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting cms content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ CMS CATEGORIES ============

router.get('/cms_categories', async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.cms_categories.findMany({ orderBy: { name: 'asc' } });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching cms categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/cms_categories', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const category = await prisma.cms_categories.create({ data: req.body });
    res.status(201).json(category);
  } catch (error: any) {
    if (error.code === 'P2002') { res.status(400).json({ error: 'Category already exists' }); return; }
    console.error('Error creating cms category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/cms_categories/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    await prisma.cms_categories.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting cms category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Content-category mapping stubs (table may not exist in schema — return empty)
router.get('/cms_content_categories/full', async (_req: Request, res: Response) => { res.json([]); });
router.get('/cms_content_category_map', async (_req: Request, res: Response) => { res.json([]); });
router.post('/cms_content_category_map', authenticate, async (_req: AuthRequest, res: Response) => { res.json({ success: true }); });
router.delete('/cms_content_category_map', authenticate, async (_req: AuthRequest, res: Response) => { res.json({ success: true }); });

// ============ CMS MEDIA ============

router.get('/cms_media', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const media = await prisma.cms_media.findMany({ orderBy: { created_at: 'desc' } });
    res.json(media);
  } catch (error) {
    console.error('Error fetching cms media:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/cms_media', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;
    data.uploaded_by = data.uploaded_by || req.user?.id || null;
    const media = await prisma.cms_media.create({ data });
    res.status(201).json(media);
  } catch (error) {
    console.error('Error creating cms media:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/cms_media/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const media = await prisma.cms_media.update({ where: { id }, data: req.body });
    res.json(media);
  } catch (error) {
    console.error('Error updating cms media:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/cms_media/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    await prisma.cms_media.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting cms media:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
