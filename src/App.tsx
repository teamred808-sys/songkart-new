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

// Lazy loaded seller pages
const SellerDashboard = lazy(() => import("./pages/seller/SellerDashboard"));
const MySongs = lazy(() => import("./pages/seller/MySongs"));
const UploadSong = lazy(() => import("./pages/seller/UploadSong"));
const EditSong = lazy(() => import("./pages/seller/EditSong"));
const SalesOrders = lazy(() => import("./pages/seller/SalesOrders"));
const Wallet = lazy(() => import("./pages/seller/Wallet"));
const Analytics = lazy(() => import("./pages/seller/Analytics"));
const SellerSettings = lazy(() => import("./pages/seller/SellerSettings"));
const PayoutSettings = lazy(() => import("./pages/seller/PayoutSettings"));

// Lazy loaded buyer pages
const BuyerDashboard = lazy(() => import("./pages/buyer/BuyerDashboard"));
const MyPurchases = lazy(() => import("./pages/buyer/MyPurchases"));
const MyDownloads = lazy(() => import("./pages/buyer/MyDownloads"));
const Cart = lazy(() => import("./pages/buyer/Cart"));
const OrderConfirmation = lazy(() => import("./pages/buyer/OrderConfirmation"));
const FreeCheckoutSuccess = lazy(() => import("./pages/buyer/FreeCheckoutSuccess"));
const Favorites = lazy(() => import("./pages/buyer/Favorites"));
const BuyerSettings = lazy(() => import("./pages/buyer/BuyerSettings"));

// Lazy loaded admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const SongModeration = lazy(() => import("./pages/admin/SongModeration"));
const SongReview = lazy(() => import("./pages/admin/SongReview"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const TransactionManagement = lazy(() => import("./pages/admin/TransactionManagement"));
const OrderManagement = lazy(() => import("./pages/admin/OrderManagement"));
const LicenseManagement = lazy(() => import("./pages/admin/LicenseManagement"));
const WithdrawalManagement = lazy(() => import("./pages/admin/WithdrawalManagement"));
const DisputeManagement = lazy(() => import("./pages/admin/DisputeManagement"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const FeaturedContent = lazy(() => import("./pages/admin/FeaturedContent"));
const PlatformSettings = lazy(() => import("./pages/admin/PlatformSettings"));
const ActivityLogs = lazy(() => import("./pages/admin/ActivityLogs"));
const BugReports = lazy(() => import("./pages/admin/BugReports"));
const SystemMonitoring = lazy(() => import("./pages/admin/SystemMonitoring"));
const ContentManagement = lazy(() => import("./pages/admin/ContentManagement"));
const ContentEditor = lazy(() => import("./pages/admin/ContentEditor"));
const NewUploadsManagement = lazy(() => import("./pages/admin/NewUploadsManagement"));
const RatingModeration = lazy(() => import("./pages/admin/RatingModeration"));
const PayoutVerification = lazy(() => import("./pages/admin/PayoutVerification"));
const ContentReviewQueue = lazy(() => import("./pages/admin/ContentReviewQueue"));

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
