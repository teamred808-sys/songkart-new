import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// ============ PRICING ZONES ============

router.get('/pricing_zones', async (_req: Request, res: Response) => {
  try {
    const zones = await prisma.pricing_zones.findMany({ orderBy: { zone_name: 'asc' } });
    const mapped = zones.map((z: any) => ({ ...z, multiplier: Number(z.multiplier) }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching pricing zones:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/pricing_zones', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const zone = await prisma.pricing_zones.create({ data: req.body });
    res.status(201).json({ ...zone, multiplier: Number(zone.multiplier) });
  } catch (error) {
    console.error('Error creating pricing zone:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/pricing_zones/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const zone = await prisma.pricing_zones.update({ where: { id }, data: { ...req.body, updated_at: new Date() } });
    res.json({ ...zone, multiplier: Number(zone.multiplier) });
  } catch (error) {
    console.error('Error updating pricing zone:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/pricing_zones/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    await prisma.pricing_zones.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting pricing zone:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ PRICING ZONE COUNTRIES ============

router.get('/pricing_zone_countries', async (req: Request, res: Response) => {
  try {
    const countryCode = req.query.country_code as string | undefined;
    const where: any = {};
    if (countryCode) where.country_code = countryCode;

    const countries = await prisma.pricing_zone_countries.findMany({
      where, include: { pricing_zones: true }, orderBy: { country_name: 'asc' },
    });
    const mapped = countries.map((c: any) => ({ ...c, zone: c.pricing_zones ? { ...c.pricing_zones, multiplier: Number(c.pricing_zones.multiplier) } : null }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching pricing zone countries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/pricing_zone_countries', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const country = await prisma.pricing_zone_countries.create({ data: req.body });
    res.status(201).json(country);
  } catch (error) {
    console.error('Error creating pricing zone country:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/pricing_zone_countries/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const country = await prisma.pricing_zone_countries.update({ where: { id }, data: req.body });
    res.json(country);
  } catch (error) {
    console.error('Error updating pricing zone country:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/pricing_zone_countries/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    await prisma.pricing_zone_countries.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting pricing zone country:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ CURRENCY EXCHANGE RATES ============

router.get('/currency_exchange_rates', async (req: Request, res: Response) => {
  try {
    const currencyCode = req.query.currency_code as string | undefined;
    const where: any = {};
    if (currencyCode) where.currency_code = currencyCode;

    const rates = await prisma.currency_exchange_rates.findMany({ where, orderBy: { currency_name: 'asc' } });
    const mapped = rates.map((r: any) => ({ ...r, rate_from_inr: Number(r.rate_from_inr) }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/currency_exchange_rates', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const rate = await prisma.currency_exchange_rates.create({ data: req.body });
    res.status(201).json({ ...rate, rate_from_inr: Number(rate.rate_from_inr) });
  } catch (error) {
    console.error('Error creating exchange rate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/currency_exchange_rates/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const rate = await prisma.currency_exchange_rates.update({ where: { id }, data: { ...req.body, last_updated: new Date() } });
    res.json({ ...rate, rate_from_inr: Number(rate.rate_from_inr) });
  } catch (error) {
    console.error('Error updating exchange rate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/currency_exchange_rates/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params['id'] as string;
    await prisma.currency_exchange_rates.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting exchange rate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ DYNAMIC PRICING RPCs ============

// POST /rpc/get_country_pricing
router.post('/rpc/get_country_pricing', async (req: Request, res: Response) => {
  try {
    const { country_code } = req.body;
    if (!country_code) { res.json({ multiplier: 1, currency_code: 'INR' }); return; }

    const country = await prisma.pricing_zone_countries.findUnique({
      where: { country_code }, include: { pricing_zones: true },
    });

    if (!country || !country.pricing_zones) {
      res.json({ multiplier: 1, currency_code: country?.currency_code || 'INR', zone: null });
      return;
    }

    const exchangeRate = await prisma.currency_exchange_rates.findUnique({ where: { currency_code: country.currency_code } });

    res.json({
      multiplier: Number(country.pricing_zones.multiplier),
      currency_code: country.currency_code,
      zone_name: country.pricing_zones.zone_name,
      exchange_rate: exchangeRate ? Number(exchangeRate.rate_from_inr) : 1,
    });
  } catch (error) {
    console.error('Error getting country pricing:', error);
    res.json({ multiplier: 1, currency_code: 'INR' });
  }
});

// POST /rpc/calculate_dynamic_price
router.post('/rpc/calculate_dynamic_price', async (req: Request, res: Response) => {
  try {
    const { base_price_inr, country_code, seller_dynamic_pricing_enabled } = req.body;
    const basePrice = Number(base_price_inr || 0);

    if (!country_code || !seller_dynamic_pricing_enabled) {
      res.json({ final_price: basePrice, currency: 'INR', multiplier: 1 });
      return;
    }

    const country = await prisma.pricing_zone_countries.findUnique({
      where: { country_code }, include: { pricing_zones: true },
    });

    const multiplier = country?.pricing_zones ? Number(country.pricing_zones.multiplier) : 1;
    const exchangeRate = await prisma.currency_exchange_rates.findUnique({ where: { currency_code: country?.currency_code || 'INR' } });
    const rate = exchangeRate ? Number(exchangeRate.rate_from_inr) : 1;

    const finalPrice = Math.round(basePrice * multiplier * rate * 100) / 100;

    res.json({
      final_price: finalPrice,
      currency: country?.currency_code || 'INR',
      multiplier,
      exchange_rate: rate,
      base_price_inr: basePrice,
    });
  } catch (error) {
    console.error('Error calculating dynamic price:', error);
    res.json({ final_price: Number(req.body.base_price_inr || 0), currency: 'INR', multiplier: 1 });
  }
});

export default router;
