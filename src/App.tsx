import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import HomepageGuard from "@/components/auth/HomepageGuard";

// Eagerly loaded public pages (critical path)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Browse from "./pages/Browse";
import SongDetail from "./pages/SongDetail";
import Sellers from "./pages/Sellers";
import SellerProfile from "./pages/SellerProfile";
import NotFound from "./pages/NotFound";
import ContentPage from "./pages/ContentPage";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import LicensesPage from "./pages/LicensesPage";
import { SongRedirect } from "./components/redirects/SongRedirect";
import { SellerRedirect } from "./components/redirects/SellerRedirect";
import VerifyEmail from "./pages/VerifyEmail";
import ChatWidget from "./components/chat/ChatWidget";

// Retry wrapper: reloads page once on stale chunk errors
function lazyRetry(importFn: () => Promise<any>) {
  return lazy(() =>
    importFn().catch((error) => {
      const hasRefreshed = sessionStorage.getItem('chunk_retry');
      if (!hasRefreshed) {
        sessionStorage.setItem('chunk_retry', '1');
        window.location.reload();
        return new Promise(() => {}); // never resolves, page reloads
      }
      sessionStorage.removeItem('chunk_retry');
      throw error;
    })
  );
}

// Lazy loaded sitemap page
const Sitemap = lazyRetry(() => import("./pages/Sitemap"));

// Lazy loaded seller pages
const SellerDashboard = lazyRetry(() => import("./pages/seller/SellerDashboard"));
const MySongs = lazyRetry(() => import("./pages/seller/MySongs"));
const UploadSong = lazyRetry(() => import("./pages/seller/UploadSong"));
const EditSong = lazyRetry(() => import("./pages/seller/EditSong"));
const SalesOrders = lazyRetry(() => import("./pages/seller/SalesOrders"));
const Wallet = lazyRetry(() => import("./pages/seller/Wallet"));
const Analytics = lazyRetry(() => import("./pages/seller/Analytics"));
const SellerSettings = lazyRetry(() => import("./pages/seller/SellerSettings"));
const PayoutSettings = lazyRetry(() => import("./pages/seller/PayoutSettings"));
const AccountHealth = lazyRetry(() => import("./pages/seller/AccountHealth"));
const SellerPromoCodes = lazyRetry(() => import("./pages/seller/PromoCodes"));

// Lazy loaded buyer pages
const BuyerDashboard = lazyRetry(() => import("./pages/buyer/BuyerDashboard"));
const MyPurchases = lazyRetry(() => import("./pages/buyer/MyPurchases"));
const MyDownloads = lazyRetry(() => import("./pages/buyer/MyDownloads"));
const Cart = lazyRetry(() => import("./pages/buyer/Cart"));
const OrderConfirmation = lazyRetry(() => import("./pages/buyer/OrderConfirmation"));
const FreeCheckoutSuccess = lazyRetry(() => import("./pages/buyer/FreeCheckoutSuccess"));
const Favorites = lazyRetry(() => import("./pages/buyer/Favorites"));
const BuyerSettings = lazyRetry(() => import("./pages/buyer/BuyerSettings"));

// Lazy loaded admin pages
const AdminDashboard = lazyRetry(() => import("./pages/admin/AdminDashboard"));
const SongModeration = lazyRetry(() => import("./pages/admin/SongModeration"));
const SongReview = lazyRetry(() => import("./pages/admin/SongReview"));
const UserManagement = lazyRetry(() => import("./pages/admin/UserManagement"));
const UserDetail = lazyRetry(() => import("./pages/admin/UserDetail"));
const TransactionManagement = lazyRetry(() => import("./pages/admin/TransactionManagement"));
const OrderManagement = lazyRetry(() => import("./pages/admin/OrderManagement"));
const LicenseManagement = lazyRetry(() => import("./pages/admin/LicenseManagement"));
const WithdrawalManagement = lazyRetry(() => import("./pages/admin/WithdrawalManagement"));
const DisputeManagement = lazyRetry(() => import("./pages/admin/DisputeManagement"));
const AdminAnalytics = lazyRetry(() => import("./pages/admin/AdminAnalytics"));
const FeaturedContent = lazyRetry(() => import("./pages/admin/FeaturedContent"));
const PlatformSettings = lazyRetry(() => import("./pages/admin/PlatformSettings"));
const ActivityLogs = lazyRetry(() => import("./pages/admin/ActivityLogs"));
const BugReports = lazyRetry(() => import("./pages/admin/BugReports"));
const SystemMonitoring = lazyRetry(() => import("./pages/admin/SystemMonitoring"));
const ContentManagement = lazyRetry(() => import("./pages/admin/ContentManagement"));
const ContentEditor = lazyRetry(() => import("./pages/admin/ContentEditor"));
const NewUploadsManagement = lazyRetry(() => import("./pages/admin/NewUploadsManagement"));
const RatingModeration = lazyRetry(() => import("./pages/admin/RatingModeration"));
const PayoutVerification = lazyRetry(() => import("./pages/admin/PayoutVerification"));
const ContentReviewQueue = lazyRetry(() => import("./pages/admin/ContentReviewQueue"));
const StrikeManagement = lazyRetry(() => import("./pages/admin/StrikeManagement"));
const PromoManagement = lazyRetry(() => import("./pages/admin/PromoManagement"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes garbage collection
      retry: 1,
      refetchOnWindowFocus: false, // Reduce unnecessary refetches
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CurrencyProvider>
            <AudioPlayerProvider>
            <Routes>
            {/* Sitemap routes - must be before SPA catch-all */}
            <Route path="/sitemap.xml" element={<Suspense fallback={null}><Sitemap type="index" /></Suspense>} />
            <Route path="/sitemap-songs.xml" element={<Suspense fallback={null}><Sitemap type="songs" /></Suspense>} />
            <Route path="/sitemap-sellers.xml" element={<Suspense fallback={null}><Sitemap type="sellers" /></Suspense>} />
            <Route path="/sitemap-blog.xml" element={<Suspense fallback={null}><Sitemap type="blog" /></Suspense>} />
            <Route path="/sitemap-pages.xml" element={<Suspense fallback={null}><Sitemap type="pages" /></Suspense>} />
            
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<HomepageGuard><Auth /></HomepageGuard>} />
            <Route path="/browse" element={<HomepageGuard><Browse /></HomepageGuard>} />
            <Route path="/sellers" element={<HomepageGuard><Sellers /></HomepageGuard>} />
            
            {/* SEO-friendly seller routes */}
            <Route path="/sellers/:identifier" element={<HomepageGuard><SellerProfile /></HomepageGuard>} />
            <Route path="/seller/:id" element={<HomepageGuard><SellerRedirect /></HomepageGuard>} />
            
            {/* SEO-friendly song routes */}
            <Route path="/songs/:identifier" element={<HomepageGuard><SongDetail /></HomepageGuard>} />
            <Route path="/song/:id" element={<HomepageGuard><SongRedirect /></HomepageGuard>} />
            
            {/* License information pages */}
            <Route path="/licenses" element={<HomepageGuard><LicensesPage /></HomepageGuard>} />
            <Route path="/licenses/:type" element={<HomepageGuard><LicensesPage /></HomepageGuard>} />
            
            {/* Buyer Dashboard Routes */}
            <Route path="/buyer" element={
              <ProtectedRoute allowedRoles={['buyer', 'seller', 'admin']}>
                <BuyerLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Suspense fallback={<PageLoader />}><BuyerDashboard /></Suspense>} />
              <Route path="purchases" element={<Suspense fallback={<PageLoader />}><MyPurchases /></Suspense>} />
              <Route path="downloads" element={<Suspense fallback={<PageLoader />}><MyDownloads /></Suspense>} />
              <Route path="cart" element={<Suspense fallback={<PageLoader />}><Cart /></Suspense>} />
              <Route path="order-confirmation" element={<Suspense fallback={<PageLoader />}><OrderConfirmation /></Suspense>} />
              <Route path="free-checkout-success" element={<Suspense fallback={<PageLoader />}><FreeCheckoutSuccess /></Suspense>} />
              <Route path="favorites" element={<Suspense fallback={<PageLoader />}><Favorites /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<PageLoader />}><BuyerSettings /></Suspense>} />
            </Route>
            
            {/* Seller Dashboard Routes */}
            <Route path="/seller" element={
              <ProtectedRoute role="seller">
                <SellerLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Suspense fallback={<PageLoader />}><SellerDashboard /></Suspense>} />
              <Route path="songs" element={<Suspense fallback={<PageLoader />}><MySongs /></Suspense>} />
              <Route path="songs/upload" element={<Suspense fallback={<PageLoader />}><UploadSong /></Suspense>} />
              <Route path="songs/:id/edit" element={<Suspense fallback={<PageLoader />}><EditSong /></Suspense>} />
              <Route path="sales" element={<Suspense fallback={<PageLoader />}><SalesOrders /></Suspense>} />
              <Route path="wallet" element={<Suspense fallback={<PageLoader />}><Wallet /></Suspense>} />
              <Route path="analytics" element={<Suspense fallback={<PageLoader />}><Analytics /></Suspense>} />
              <Route path="payout" element={<Suspense fallback={<PageLoader />}><PayoutSettings /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<PageLoader />}><SellerSettings /></Suspense>} />
              <Route path="account-health" element={<Suspense fallback={<PageLoader />}><AccountHealth /></Suspense>} />
              <Route path="promo-codes" element={<Suspense fallback={<PageLoader />}><SellerPromoCodes /></Suspense>} />
            </Route>
            
            {/* Admin Dashboard Routes */}
            <Route path="/admin" element={
              <ProtectedRoute role="admin">
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>} />
              <Route path="songs" element={<Suspense fallback={<PageLoader />}><SongModeration /></Suspense>} />
              <Route path="songs/:id/review" element={<Suspense fallback={<PageLoader />}><SongReview /></Suspense>} />
              <Route path="users" element={<Suspense fallback={<PageLoader />}><UserManagement /></Suspense>} />
              <Route path="users/:userId" element={<Suspense fallback={<PageLoader />}><UserDetail /></Suspense>} />
              <Route path="transactions" element={<Suspense fallback={<PageLoader />}><TransactionManagement /></Suspense>} />
              <Route path="orders" element={<Suspense fallback={<PageLoader />}><OrderManagement /></Suspense>} />
              <Route path="licenses" element={<Suspense fallback={<PageLoader />}><LicenseManagement /></Suspense>} />
              <Route path="withdrawals" element={<Suspense fallback={<PageLoader />}><WithdrawalManagement /></Suspense>} />
              <Route path="payout-verification" element={<Suspense fallback={<PageLoader />}><PayoutVerification /></Suspense>} />
              <Route path="disputes" element={<Suspense fallback={<PageLoader />}><DisputeManagement /></Suspense>} />
              <Route path="analytics" element={<Suspense fallback={<PageLoader />}><AdminAnalytics /></Suspense>} />
              <Route path="featured" element={<Suspense fallback={<PageLoader />}><FeaturedContent /></Suspense>} />
              <Route path="new-uploads" element={<Suspense fallback={<PageLoader />}><NewUploadsManagement /></Suspense>} />
              <Route path="ratings" element={<Suspense fallback={<PageLoader />}><RatingModeration /></Suspense>} />
              <Route path="content-review" element={<Suspense fallback={<PageLoader />}><ContentReviewQueue /></Suspense>} />
              <Route path="strikes" element={<Suspense fallback={<PageLoader />}><StrikeManagement /></Suspense>} />
              <Route path="promo-codes" element={<Suspense fallback={<PageLoader />}><PromoManagement /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<PageLoader />}><PlatformSettings /></Suspense>} />
              <Route path="logs" element={<Suspense fallback={<PageLoader />}><ActivityLogs /></Suspense>} />
              <Route path="bugs" element={<Suspense fallback={<PageLoader />}><BugReports /></Suspense>} />
              <Route path="monitoring" element={<Suspense fallback={<PageLoader />}><SystemMonitoring /></Suspense>} />
              {/* CMS Content Management */}
              <Route path="content" element={<Suspense fallback={<PageLoader />}><ContentManagement /></Suspense>} />
              <Route path="content/new" element={<Suspense fallback={<PageLoader />}><ContentEditor /></Suspense>} />
              <Route path="content/:id/edit" element={<Suspense fallback={<PageLoader />}><ContentEditor /></Suspense>} />
            </Route>
            
            {/* Blog Routes - must be before /:slug */}
            <Route path="/blog" element={<HomepageGuard><Blog /></HomepageGuard>} />
            <Route path="/blog/:slug" element={<HomepageGuard><BlogPost /></HomepageGuard>} />
            
            {/* Email Verification */}
            <Route path="/verify-email" element={<VerifyEmail />} />
            
            {/* Public CMS Pages */}
            <Route path="/:slug" element={<HomepageGuard><ContentPage /></HomepageGuard>} />
            
            <Route path="*" element={<NotFound />} />
            </Routes>
            </AudioPlayerProvider>
          </CurrencyProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
