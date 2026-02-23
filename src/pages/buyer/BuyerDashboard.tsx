import { Link } from 'react-router-dom';
import { BuyerStats } from '@/components/buyer/BuyerStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRecentPurchases } from '@/hooks/useBuyerData';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Price } from '@/components/ui/Price';
import { 
  Music, 
  ArrowRight, 
  ShoppingBag, 
  FileText, 
  Heart, 
  Download,
  ScrollText,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

// Primary content actions (most important)
const contentActions = [
  { 
    label: "License Vault", 
    description: "Access purchased content & licenses",
    icon: ScrollText, 
    to: "/buyer/downloads", 
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    accent: true 
  },
  { 
    label: "My Purchases", 
    description: "View transaction history",
    icon: FileText, 
    to: "/buyer/purchases", 
    color: "bg-primary/10 text-primary border-primary/20" 
  },
];

// Secondary exploration actions
const exploreActions = [
  { label: "Browse Songs", icon: Music, to: "/browse", color: "bg-accent/10 text-accent" },
  { label: "Favorites", icon: Heart, to: "/buyer/favorites", color: "bg-pink-500/10 text-pink-500" },
];

// License type descriptions for quick understanding
const licenseDescriptions: Record<string, string> = {
  personal: "Personal use only",
  youtube: "YouTube & streaming",
  commercial: "Commercial projects",
  film: "Film & broadcast",
  exclusive: "Full ownership rights",
};

export default function BuyerDashboard() {
  const { data: recentPurchases, isLoading } = useRecentPurchases(5);
  const { profile } = useAuth();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">Here's your activity overview.</p>
        </div>
        <Button asChild className="btn-glow">
          <Link to="/browse">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Browse Songs
          </Link>
        </Button>
      </div>

      {/* Primary Content Access Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Your Content</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contentActions.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className={`group relative flex items-center gap-4 p-5 rounded-xl border-2 ${action.color} bg-card hover:shadow-lg transition-all duration-300 ${action.accent ? 'hover:scale-[1.02]' : ''}`}
            >
              <div className={`p-3 rounded-xl ${action.color} group-hover:scale-110 transition-transform`}>
                <action.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <span className="text-lg font-semibold block">{action.label}</span>
                <span className="text-sm text-muted-foreground">{action.description}</span>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              {action.accent && (
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-500 text-xs">
                    <Download className="h-3 w-3 mr-1" />
                    Downloads
                  </Badge>
                </div>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Explore Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Music className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-muted-foreground">Explore</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {exploreActions.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 transition-all group"
            >
              <div className={`p-3 rounded-xl ${action.color} group-hover:scale-110 transition-transform`}>
                <action.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Stats - Below content access */}
      <BuyerStats />

      {/* Recent Purchases with License Info */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 bg-muted/30">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Recent Purchases
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/buyer/purchases">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : recentPurchases && recentPurchases.length > 0 ? (
            <div className="divide-y divide-border/50">
              {recentPurchases.map((purchase) => {
                const licenseType = purchase.license_tiers?.license_type || 'commercial';
                return (
                  <div
                    key={purchase.id}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {purchase.songs?.cover_image_url ? (
                        <img
                          src={purchase.songs.cover_image_url}
                          alt={purchase.songs.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Music className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{purchase.songs?.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs capitalize">
                          {licenseType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {licenseDescriptions[licenseType] || 'Standard license'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold"><Price amount={Number(purchase.amount)} /></p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(purchase.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 px-4">
              <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No purchases yet</p>
              <p className="text-muted-foreground text-sm mt-1">
                Start exploring our catalog to find your perfect song
              </p>
              <Button asChild className="mt-4">
                <Link to="/browse">Start Shopping</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
