import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Browse from "./pages/Browse";
import SongDetail from "./pages/SongDetail";
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
import Favorites from "./pages/buyer/Favorites";
import BuyerSettings from "./pages/buyer/BuyerSettings";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SongModeration from "./pages/admin/SongModeration";
import UserManagement from "./pages/admin/UserManagement";
import TransactionManagement from "./pages/admin/TransactionManagement";
import WithdrawalManagement from "./pages/admin/WithdrawalManagement";
import DisputeManagement from "./pages/admin/DisputeManagement";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import FeaturedContent from "./pages/admin/FeaturedContent";
import PlatformSettings from "./pages/admin/PlatformSettings";
import ActivityLogs from "./pages/admin/ActivityLogs";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/song/:id" element={<SongDetail />} />
            
            {/* Buyer Dashboard Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={['buyer', 'seller']}>
                <BuyerLayout />
              </ProtectedRoute>
            }>
              <Route index element={<BuyerDashboard />} />
              <Route path="purchases" element={<MyPurchases />} />
              <Route path="downloads" element={<MyDownloads />} />
              <Route path="cart" element={<Cart />} />
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
              <Route path="users" element={<UserManagement />} />
              <Route path="transactions" element={<TransactionManagement />} />
              <Route path="withdrawals" element={<WithdrawalManagement />} />
              <Route path="disputes" element={<DisputeManagement />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="featured" element={<FeaturedContent />} />
              <Route path="settings" element={<PlatformSettings />} />
              <Route path="logs" element={<ActivityLogs />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
