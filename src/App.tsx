import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SellerLayout } from "@/components/seller/SellerLayout";
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
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
