import { Link } from 'react-router-dom';
import { BuyerStats } from '@/components/buyer/BuyerStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRecentPurchases } from '@/hooks/useBuyerData';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Music, ArrowRight, ShoppingBag, FileText, Heart, Settings } from 'lucide-react';
import { format } from 'date-fns';

const quickActions = [
  { label: "Browse Songs", icon: Music, to: "/browse", color: "bg-primary/10 text-primary" },
  { label: "License Vault", icon: FileText, to: "/buyer/downloads", color: "bg-emerald-500/10 text-emerald-500" },
  { label: "Favorites", icon: Heart, to: "/buyer/favorites", color: "bg-pink-500/10 text-pink-500" },
  { label: "Settings", icon: Settings, to: "/buyer/settings", color: "bg-amber-500/10 text-amber-500" },
];

export default function BuyerDashboard() {
  const { data: recentPurchases, isLoading } = useRecentPurchases(5);
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}! 👋
          </h1>
          <p className="text-muted-foreground">Here's your activity overview.</p>
        </div>
        <Button asChild>
          <Link to="/browse">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Browse Songs
          </Link>
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action) => (
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

      {/* Stats */}
      <BuyerStats />

      {/* Recent Purchases */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
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
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recentPurchases && recentPurchases.length > 0 ? (
            <div className="space-y-4">
              {recentPurchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center overflow-hidden">
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
                    <p className="text-sm text-muted-foreground">
                      {purchase.license_tiers?.license_type} License
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹{Number(purchase.amount).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(purchase.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No purchases yet</p>
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
