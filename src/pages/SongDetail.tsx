import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  Music, FileText, Play, Heart, Share2, ShoppingCart, 
  Clock, Gauge, Globe, User, BadgeCheck, ChevronRight, AlertTriangle, Loader2, Shield
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AudioPlayer } from "@/components/audio/AudioPlayer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { LicenseComparisonTable } from "@/components/songs/LicenseComparisonTable";
import { SellerTierBadge } from "@/components/seller/SellerTierBadge";
import { useSong, useLicenseTiers } from "@/hooks/useSongs";
import { useValidatedAddToCart } from "@/hooks/useCheckout";
import { useAuth } from "@/hooks/useAuth";
import { useSellerTier } from "@/hooks/useSellerTier";
import { LICENSE_TYPES } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function SongDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedLicense, setSelectedLicense] = useState<string | null>(null);

  const { data: song, isLoading: songLoading } = useSong(id!);
  const { data: licenseTiers, isLoading: tiersLoading } = useLicenseTiers(id!);
  const { data: sellerTier } = useSellerTier(song?.seller?.id);
  const addToCart = useValidatedAddToCart();

  const handlePlay = async () => {
    if (id) {
      await supabase.rpc("increment_play_count", { song_uuid: id });
    }
  };

  const handleAddToCart = () => {
    if (!user) {
      toast.error("Please sign in to add items to cart");
      navigate("/auth");
      return;
    }

    if (!selectedLicense) {
      toast.error("Please select a license tier before adding to cart");
      return;
    }

    addToCart.mutate({ songId: id!, licenseTierId: selectedLicense });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (songLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="aspect-video rounded-xl" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!song) {
    return (
      <MainLayout>
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Song not found</h1>
          <Link to="/browse">
            <Button>Browse Songs</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link to="/browse" className="hover:text-foreground">Browse</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{song.title}</span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cover & Audio */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
              {song.cover_image_url ? (
                <img
                  src={song.cover_image_url}
                  alt={song.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="h-24 w-24 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Audio Player */}
            {song.preview_audio_url && (
              <AudioPlayer
                src={song.preview_audio_url}
                duration={song.duration || undefined}
                onPlay={handlePlay}
              />
            )}

            {/* Title & Meta */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{song.title}</h1>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {song.has_audio && (
                        <Badge variant="secondary">
                          <Music className="h-3 w-3 mr-1" />
                          Audio
                        </Badge>
                      )}
                      {song.has_lyrics && (
                        <Badge variant="secondary">
                          <FileText className="h-3 w-3 mr-1" />
                          Lyrics
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon">
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-4 mt-4 text-sm">
                {song.genres && (
                  <Badge variant="outline">{song.genres.name}</Badge>
                )}
                {song.moods && (
                  <Badge variant="outline" className="bg-accent/10 border-accent/30 text-accent">
                    {song.moods.name}
                  </Badge>
                )}
                {song.bpm && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Gauge className="h-4 w-4" />
                    {song.bpm} BPM
                  </span>
                )}
                {song.duration && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {formatDuration(song.duration)}
                  </span>
                )}
                {song.language && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    {song.language}
                  </span>
                )}
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Play className="h-4 w-4" />
                  {(song.play_count || 0).toLocaleString()} plays
                </span>
              </div>
            </div>

            {/* Tabs: Description & Lyrics Preview */}
            <Tabs defaultValue="description" className="w-full">
              <TabsList>
                <TabsTrigger value="description">Description</TabsTrigger>
                {song.has_lyrics && <TabsTrigger value="lyrics">Lyrics Preview</TabsTrigger>}
              </TabsList>
              <TabsContent value="description" className="mt-4">
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {song.description || "No description available."}
                </p>
              </TabsContent>
              {song.has_lyrics && (
                <TabsContent value="lyrics" className="mt-4">
                  <Card className="bg-card/50">
                    <CardContent className="pt-6">
                      <pre className="whitespace-pre-wrap font-sans text-muted-foreground">
                        {song.preview_lyrics || "Lyrics preview not available."}
                      </pre>
                      <div className="mt-4 pt-4 border-t border-border/50 text-center">
                        <p className="text-sm text-muted-foreground">
                          Purchase to see full lyrics
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Seller Card */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  Seller
                  {song.seller?.is_verified && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Shield className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link to={`/seller/${song.seller?.id}`} className="flex items-center gap-3 group">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={song.seller?.avatar_url || undefined} />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold group-hover:text-primary transition-colors">
                        {song.seller?.full_name || "Unknown"}
                      </span>
                      {song.seller?.is_verified && (
                        <BadgeCheck className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {song.seller?.bio || "Music Creator"}
                    </p>
                  </div>
                </Link>
                {sellerTier && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <SellerTierBadge
                      tierLevel={sellerTier.tier_level}
                      tierName={sellerTier.tier_name}
                      badgeColor={sellerTier.badge_color}
                      size="md"
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
                  This seller is verified by SongKart
                </p>
              </CardContent>
            </Card>

            {/* License Comparison */}
            <LicenseComparisonTable />

            {/* License Tiers */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">License Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tiersLoading ? (
                  <>
                    <Skeleton className="h-20 rounded-lg" />
                    <Skeleton className="h-20 rounded-lg" />
                  </>
                ) : licenseTiers && licenseTiers.length > 0 ? (
                  licenseTiers.map((tier) => {
                    const licenseInfo = LICENSE_TYPES[tier.license_type as keyof typeof LICENSE_TYPES];
                    const isSelected = selectedLicense === tier.id;
                    const isExclusive = tier.license_type === 'exclusive';
                    const isSoldOut = tier.max_sales && tier.current_sales >= tier.max_sales;
                    
                    return (
                      <button
                        key={tier.id}
                        onClick={() => !isSoldOut && setSelectedLicense(tier.id)}
                        disabled={isSoldOut}
                        className={`w-full p-4 rounded-lg border text-left transition-all ${
                          isSoldOut
                            ? "opacity-50 cursor-not-allowed bg-muted"
                            : isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border/50 bg-background/50 hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{licenseInfo?.label || tier.license_type}</span>
                            {isExclusive && (
                              <Badge variant="default" className="bg-amber-500 text-xs">
                                Exclusive
                              </Badge>
                            )}
                          </div>
                          <span className="text-lg font-bold text-primary">
                            ₹{tier.price.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {tier.description || licenseInfo?.description}
                        </p>
                        {isExclusive && !isSoldOut && (
                          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Full ownership - song removed from marketplace
                          </p>
                        )}
                        {tier.max_sales && (
                          <p className={`text-xs mt-1 ${isSoldOut ? 'text-destructive' : 'text-accent'}`}>
                            {isSoldOut 
                              ? 'Sold out' 
                              : `${tier.max_sales - (tier.current_sales || 0)} of ${tier.max_sales} remaining`
                            }
                          </p>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No license options available
                  </p>
                )}

                <Button 
                  className="w-full mt-4" 
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={!selectedLicense || addToCart.isPending}
                >
                  {addToCart.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ShoppingCart className="h-4 w-4 mr-2" />
                  )}
                  {addToCart.isPending ? 'Adding...' : 'Add to Cart'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
