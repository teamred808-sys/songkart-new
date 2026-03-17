import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import songRoutes from './routes/songs';
import purchaseRoutes from './routes/purchases';
import chatRoutes from './routes/chat';
import cartRoutes from './routes/cart';

import adminRoutes from './routes/admin';
import audioRoutes from './routes/audio';
import paymentRoutes from './routes/payments';
import downloadRoutes from './routes/downloads';
import contentRoutes from './routes/content';
import verificationRoutes from './routes/users/verification';
import analyticsRoutes from './routes/analytics';
import sellerDataRoutes from './routes/seller-data';
import storageRoutes from './routes/storage';
import payoutProfileRoutes from './routes/payout-profiles';
import platformSettingsRoutes from './routes/platform-settings';
import promoCodeRoutes from './routes/promo-codes';
import strikesRoutes from './routes/strikes';
import sellerTierRoutes from './routes/seller-tiers';
import adminDataRoutes from './routes/admin-data';
import buyerDataRoutes from './routes/buyer-data';
import ratingsRoutes from './routes/ratings';
import cmsRoutes from './routes/cms';
import commerceRoutes from './routes/commerce';
import licensesRoutes from './routes/licenses';
import newUploadsRoutes from './routes/new-uploads';
import pricingRoutes from './routes/pricing';
import systemRoutes from './routes/system';

dotenv.config();

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/users/verification', verificationRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/cart', cartRoutes);

// Edge Function Equivalents
app.use('/api/admin', adminRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/downloads', downloadRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/analytics', analyticsRoutes);

// Seller data endpoints (genres, moods, transactions, wallets, license tiers, etc.)
app.use('/api', sellerDataRoutes);

// Storage upload endpoints
app.use('/api/storage', storageRoutes);

// Payout profiles, platform settings, promo codes, strikes, seller tiers
app.use('/api', payoutProfileRoutes);
app.use('/api', platformSettingsRoutes);
app.use('/api', promoCodeRoutes);
app.use('/api', strikesRoutes);
app.use('/api', sellerTierRoutes);

// Admin data (full CRUD for admin panel)
app.use('/api/admin', adminDataRoutes);

// Buyer data (cart, favorites, orders, reservations)
app.use('/api', buyerDataRoutes);

// Ratings system
app.use('/api', ratingsRoutes);

// CMS content, categories, media
app.use('/api', cmsRoutes);

// Commerce (checkout, free-checkout, validate, verify, record-view)
app.use('/api', commerceRoutes);

// Licenses, tier definitions, rights labels, featured content
app.use('/api', licensesRoutes);

// New uploads feed, content review, fingerprints
app.use('/api', newUploadsRoutes);

// Pricing zones, currencies, dynamic pricing
app.use('/api', pricingRoutes);

// System (bug reports, error logs, platform settings extended)
app.use('/api', systemRoutes);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
