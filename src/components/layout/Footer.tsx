import { Link } from 'react-router-dom';
import { Twitter, Instagram, Youtube, Mail } from 'lucide-react';
import songkartLogo from '@/assets/songkart-logo.png';

export function Footer() {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src={songkartLogo} alt="SongKart" className="h-12 w-12 object-contain" />
              <span className="font-display text-xl text-white tracking-tight">
                <span className="font-extrabold">SONG</span>
                <span className="font-normal">KART</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm">
              The premier marketplace for buying and selling song lyrics and audio compositions.
            </p>
            <div className="flex items-center gap-4 mt-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Youtube className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Marketplace */}
          <div>
            <h4 className="font-display font-semibold mb-4">Marketplace</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/browse" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Browse Songs
                </Link>
              </li>
              <li>
                <Link to="/browse?type=lyrics" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Lyrics Only
                </Link>
              </li>
              <li>
                <Link to="/browse?type=audio" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Audio Tracks
                </Link>
              </li>
              <li>
                <Link to="/sellers" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Top Sellers
                </Link>
              </li>
            </ul>
          </div>

          {/* For Sellers */}
          <div>
            <h4 className="font-display font-semibold mb-4">For Sellers</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/auth?tab=signup" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Start Selling
                </Link>
              </li>
              <li>
                <Link to="/seller" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Seller Dashboard
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Pricing Guide
                </Link>
              </li>
              <li>
                <Link to="/licensing" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  License Types
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-display font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/help" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} SongKart. All rights reserved.
          </p>
          <p className="text-muted-foreground text-sm">
            Made with ♪ for musicians and creators worldwide
          </p>
        </div>
      </div>
    </footer>
  );
}
