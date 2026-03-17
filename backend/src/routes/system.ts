import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// ============ BUG REPORTS ============

router.get('/admin_bug_reports', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const where: any = {};

    if (status) {
      const inMatch = (status as string).match(/^in\.\((.+)\)$/);
      if (inMatch && inMatch[1]) {
        where.status = { in: inMatch[1].split(',') };
      } else {
        where.status = status;
      }
    }

    const reports = await prisma.admin_bug_reports.findMany({ where, orderBy: { created_at: 'desc' }, take: 100 });
    res.json(reports);
  } catch (error) {
    console.error('Error fetching bug reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/admin_bug_reports', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;
    data.reporter_id = data.reporter_id || req.user?.id || null;
    const report = await prisma.admin_bug_reports.create({ data });
    res.status(201).json(report);
  } catch (error) {
    console.error('Error creating bug report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/admin_bug_reports/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const report = await prisma.admin_bug_reports.update({ where: { id }, data: { ...req.body, updated_at: new Date() } });
    res.json(report);
  } catch (error) {
    console.error('Error updating bug report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ SYSTEM ERROR LOGS ============

router.get('/system_error_logs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const resolved = req.query.resolved as string | undefined;
    const createdAt = req.query.created_at as string | undefined;
    const where: any = {};

    if (resolved !== undefined) where.resolved = resolved === 'true';

    if (createdAt) {
      const gteMatch = createdAt.match(/^gte\.(.+)$/);
      if (gteMatch && gteMatch[1]) where.created_at = { gte: new Date(gteMatch[1]) };
    }

    const logs = await prisma.system_error_logs.findMany({ where, orderBy: { created_at: 'desc' }, take: 100 });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching error logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/system_error_logs/full', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const module = req.query.module as string | undefined;
    const severity = req.query.severity as string | undefined;
    const resolved = req.query.resolved as string | undefined;
    const where: any = {};

    if (module) where.module = module;
    if (severity) where.severity = severity;
    if (resolved !== undefined) where.resolved = resolved === 'true';

    const logs = await prisma.system_error_logs.findMany({
      where,
      include: { profiles: { select: { id: true, full_name: true, email: true } } },
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    const mapped = logs.map((l: any) => ({ ...l, user: l.profiles || null }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching full error logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/system_error_logs', async (req: Request, res: Response) => {
  try {
    const log = await prisma.system_error_logs.create({ data: req.body });
    res.status(201).json(log);
  } catch (error) {
    console.error('Error creating error log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/system_error_logs/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const log = await prisma.system_error_logs.update({ where: { id }, data: req.body });
    res.json(log);
  } catch (error) {
    console.error('Error updating error log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ PLATFORM SETTINGS (extended) ============

router.get('/platform_settings/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const setting = await prisma.platform_settings.findUnique({ where: { id } });
    if (!setting) { res.status(404).json({ error: 'Setting not found' }); return; }
    res.json(setting);
  } catch (error) {
    console.error('Error fetching platform setting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/platform_settings/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const setting = await prisma.platform_settings.update({
      where: { id }, data: { value: req.body.value, updated_at: new Date(), updated_by: req.user?.id || null },
    });
    res.json(setting);
  } catch (error) {
    console.error('Error updating platform setting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
