import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Browse from "./pages/Browse";
import SongDetail from "./pages/SongDetail";
import Sellers from "./pages/Sellers";
import SellerProfile from "./pages/SellerProfile";
import NotFound from "./pages/NotFound";
import SellerDashboard from "./pages/seller/SellerDashboard";
import MySongs from "./pages/seller/MySongs";
import UploadSong from "./pages/seller/UploadSong";
import EditSong from "./pages/seller/EditSong";
import SalesOrders from "./pages/seller/SalesOrders";
import Wallet from "./pages/seller/Wallet";
import Analytics from "./pages/seller/Analytics";
import SellerSettings from "./pages/seller/SellerSettings";
import BuyerDashboard from "./pages/buyer/BuyerDashboard";
import MyPurchases from "./pages/buyer/MyPurchases";
import MyDownloads from "./pages/buyer/MyDownloads";
import Cart from "./pages/buyer/Cart";
import OrderConfirmation from "./pages/buyer/OrderConfirmation";
import Favorites from "./pages/buyer/Favorites";
import BuyerSettings from "./pages/buyer/BuyerSettings";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SongModeration from "./pages/admin/SongModeration";
import SongReview from "./pages/admin/SongReview";
import UserManagement from "./pages/admin/UserManagement";
import TransactionManagement from "./pages/admin/TransactionManagement";
import OrderManagement from "./pages/admin/OrderManagement";
import LicenseManagement from "./pages/admin/LicenseManagement";
import WithdrawalManagement from "./pages/admin/WithdrawalManagement";
import DisputeManagement from "./pages/admin/DisputeManagement";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import FeaturedContent from "./pages/admin/FeaturedContent";
import PlatformSettings from "./pages/admin/PlatformSettings";
import ActivityLogs from "./pages/admin/ActivityLogs";
import BugReports from "./pages/admin/BugReports";
import SystemMonitoring from "./pages/admin/SystemMonitoring";
import ContentManagement from "./pages/admin/ContentManagement";
import ContentEditor from "./pages/admin/ContentEditor";
import NewUploadsManagement from "./pages/admin/NewUploadsManagement";
import ContentPage from "./pages/ContentPage";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import VerifyEmail from "./pages/VerifyEmail";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
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
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/sellers" element={<Sellers />} />
            <Route path="/seller/:id" element={<SellerProfile />} />
            <Route path="/song/:id" element={<SongDetail />} />
            
            {/* Buyer Dashboard Routes */}
            <Route path="/buyer" element={
              <ProtectedRoute allowedRoles={['buyer', 'seller', 'admin']}>
                <BuyerLayout />
              </ProtectedRoute>
            }>
              <Route index element={<BuyerDashboard />} />
              <Route path="purchases" element={<MyPurchases />} />
              <Route path="downloads" element={<MyDownloads />} />
              <Route path="cart" element={<Cart />} />
              <Route path="order-confirmation" element={<OrderConfirmation />} />
              <Route path="favorites" element={<Favorites />} />
              <Route path="settings" element={<BuyerSettings />} />
            </Route>
            
            {/* Seller Dashboard Routes */}
            <Route path="/seller" element={
              <ProtectedRoute role="seller">
                <SellerLayout />
              </ProtectedRoute>
            }>
              <Route index element={<SellerDashboard />} />
              <Route path="songs" element={<MySongs />} />
              <Route path="songs/upload" element={<UploadSong />} />
              <Route path="songs/:id/edit" element={<EditSong />} />
              <Route path="sales" element={<SalesOrders />} />
              <Route path="wallet" element={<Wallet />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<SellerSettings />} />
            </Route>
            
            {/* Admin Dashboard Routes */}
            <Route path="/admin" element={
              <ProtectedRoute role="admin">
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="songs" element={<SongModeration />} />
              <Route path="songs/:id/review" element={<SongReview />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="transactions" element={<TransactionManagement />} />
              <Route path="orders" element={<OrderManagement />} />
              <Route path="licenses" element={<LicenseManagement />} />
              <Route path="withdrawals" element={<WithdrawalManagement />} />
              <Route path="disputes" element={<DisputeManagement />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="featured" element={<FeaturedContent />} />
              <Route path="new-uploads" element={<NewUploadsManagement />} />
              <Route path="settings" element={<PlatformSettings />} />
              <Route path="logs" element={<ActivityLogs />} />
              <Route path="bugs" element={<BugReports />} />
              <Route path="monitoring" element={<SystemMonitoring />} />
              {/* CMS Content Management */}
              <Route path="content" element={<ContentManagement />} />
              <Route path="content/new" element={<ContentEditor />} />
              <Route path="content/:id/edit" element={<ContentEditor />} />
            </Route>
            
            {/* Blog Routes - must be before /:slug */}
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            
            {/* Email Verification */}
            <Route path="/verify-email" element={<VerifyEmail />} />
            
            {/* Public CMS Pages */}
            <Route path="/:slug" element={<ContentPage />} />
            
            <Route path="*" element={<NotFound />} />
            </Routes>
          </CurrencyProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
