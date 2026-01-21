import { useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  Music, FileText, Play, Heart, Share2, ShoppingCart, 
  Clock, Gauge, Globe, User, BadgeCheck, ChevronRight, AlertTriangle, Loader2, Shield
} from "lucide-react";
import { MiniHealthMeter } from "@/components/seller/MiniHealthMeter";
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
import { Price } from "@/components/ui/Price";
import { RatingDisplay } from "@/components/songs/RatingDisplay";
import { RatingInput } from "@/components/songs/RatingInput";
import { RatingsList } from "@/components/songs/RatingsList";
import { useSong, useLicenseTiers } from "@/hooks/useSongs";
import { useValidatedAddToCart } from "@/hooks/useCheckout";
import { useAuth } from "@/hooks/useAuth";
import { useSellerTier } from "@/hooks/useSellerTier";
import { useIsMobile } from "@/hooks/use-mobile";
import { useViewTracking } from "@/hooks/useViewTracking";
import { LICENSE_TYPES } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SongSEOHead } from "@/components/seo/SongSEOHead";
import { MusicRecordingSchema, BreadcrumbSchema, ProductSchema, FAQSchema } from "@/components/seo/SchemaOrg";
import { SEOContentSection } from "@/components/seo/SEOContentSection";
import { RelatedSongs } from "@/components/songs/RelatedSongs";
import { MobileActionBar } from "@/components/mobile/MobileActionBar";

export default function SongDetail() {
  const { id, identifier } = useParams<{ id?: string; identifier?: string }>();
  const songIdentifier = identifier || id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedLicense, setSelectedLicense] = useState<string | null>(null);

  const { data: song, isLoading: songLoading } = useSong(songIdentifier!);
  const { data: licenseTiers, isLoading: tiersLoading } = useLicenseTiers(song?.id || songIdentifier!);
  const { data: sellerTier } = useSellerTier(song?.seller?.id);
  const addToCart = useValidatedAddToCart();
  
  // View tracking - only counts authenticated, non-seller views after 5s playback
  const { startTracking, checkAndRecordView } = useViewTracking(song?.id, song?.seller_id);
  
  // Get selected license price for mobile action bar
  const selectedLicenseData = licenseTiers?.find(t => t.id === selectedLicense);

  const handlePlay = useCallback(async () => {
    // Start view tracking when playback begins
    startTracking();
    
    // Also track play count (separate metric)
    if (song?.id) {
      await supabase.rpc("increment_play_count", { song_uuid: song.id });
    }
  }, [song?.id, startTracking]);

  // Called when playback reaches 5+ seconds threshold
  const handleViewThreshold = useCallback(() => {
    checkAndRecordView();
  }, [checkAndRecordView]);

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

    addToCart.mutate({ songId: song?.id || songIdentifier!, licenseTierId: selectedLicense });
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

  // Prepare SEO data
  const primaryUseCase = (song as any).use_cases?.[0] || 'YouTube & Commercial Use';
  const genreName = song.genres?.name || 'Music';

  return (
    <MainLayout>
      {/* SEO Head */}
      <SongSEOHead song={{
        id: song.id,
        title: song.title,
        description: song.description,
        seo_title: (song as any).seo_title,
        seo_description: (song as any).seo_description,
        cover_art_url: song.cover_image_url,
        genre: song.genres ? { name: song.genres.name } : undefined,
        mood: song.moods ? { name: song.moods.name } : undefined,
        language: song.language,
        use_cases: (song as any).use_cases,
        base_price: song.base_price,
        seller: song.seller ? { full_name: song.seller.full_name } : undefined
      }} />

      {/* Structured Data */}
      <BreadcrumbSchema items={[
        { name: 'Home', url: window.location.origin },
        { name: 'Browse', url: `${window.location.origin}/browse` },
        { name: song.title, url: window.location.href }
      ]} />
      
      <MusicRecordingSchema
        name={song.title}
        artist={song.seller?.full_name || 'Unknown Artist'}
        genre={song.genres?.name}
        duration={song.duration || undefined}
        description={song.description}
        image={song.cover_image_url}
        datePublished={song.created_at}
        offers={licenseTiers?.map(tier => ({
          price: tier.price,
          currency: 'INR'
        }))}
      />

      {licenseTiers && licenseTiers.length > 0 && (
        <ProductSchema
          name={`${song.title} - Music License`}
          description={`License "${song.title}" for commercial use. Available in Personal, Commercial, and Exclusive license options.`}
          image={song.cover_image_url}
          offers={licenseTiers.map(tier => ({
            name: `${LICENSE_TYPES[tier.license_type as keyof typeof LICENSE_TYPES]?.label || tier.license_type} License`,
            price: tier.price,
            currency: 'INR'
          }))}
        />
      )}

      <FAQSchema items={[
        { question: `Can I use "${song.title}" in YouTube videos?`, answer: 'Yes! With any license tier, you can use this track in YouTube videos. Commercial licenses allow full monetization.' },
        { question: 'Is this music copyright-safe?', answer: 'Absolutely. Your purchase includes a legally binding license certificate that protects you from copyright claims.' },
        { question: 'What files do I receive after purchase?', answer: `You receive high-quality audio files${song.has_lyrics ? ', full lyrics document,' : ''} and a PDF license certificate.` }
      ]} />

      <div className="container py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
          <Link to="/browse" className="hover:text-foreground">Browse</Link>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
          {song.genres && (
            <>
              <Link to={`/browse?genre=${song.genre_id}`} className="hover:text-foreground">
                {song.genres.name}
              </Link>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
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
                  alt={`${song.title} - Licensed ${genreName} track cover art`}
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
                onViewThreshold={handleViewThreshold}
              />
            )}

            {/* Title & Meta - Single H1 with licensing intent */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    {song.title} - Licensed {genreName} for {primaryUseCase}
                  </h1>
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
                    {/* Rating Display */}
                    <RatingDisplay 
                      averageRating={song.average_rating || 0} 
                      totalRatings={song.total_ratings || 0}
                      showStars={true}
                    />
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

            {/* Tabs: Description, Lyrics Preview & Reviews */}
            <Tabs defaultValue={song.has_lyrics ? "lyrics" : "description"} className="w-full">
              <TabsList>
                <TabsTrigger value="description">Description</TabsTrigger>
                {song.has_lyrics && <TabsTrigger value="lyrics">Lyrics Preview</TabsTrigger>}
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
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
              <TabsContent value="reviews" className="mt-4 space-y-6">
                {/* Rating Input */}
                <RatingInput songId={id!} sellerId={song.seller?.id} />
                
                {/* Ratings List */}
                <RatingsList songId={id!} />
              </TabsContent>
            </Tabs>

            {/* SEO Content Section - Crawlable content for Google */}
            <SEOContentSection song={{
              id: song.id,
              title: song.title,
              description: song.description,
              seo_content: (song as any).seo_content,
              genre: song.genres ? { id: song.genre_id || '', name: song.genres.name } : undefined,
              mood: song.moods ? { id: song.mood_id || '', name: song.moods.name } : undefined,
              language: song.language,
              use_cases: (song as any).use_cases,
              has_audio: song.has_audio,
              has_lyrics: song.has_lyrics
            }} />

            {/* Related Songs - Internal linking */}
            <RelatedSongs 
              currentSongId={song.id} 
              genreId={song.genre_id} 
              moodId={song.mood_id}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Seller Card */}
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  Seller
                  {song.seller?.is_verified && (
                    <Badge variant="secondary" className="gap-1 text-xs bg-blue-500/10 border-blue-500/30 text-blue-500">
                      <Shield className="h-3 w-3 animate-pulse" />
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold group-hover:text-primary transition-colors">
                        {song.seller?.full_name || "Unknown"}
                      </span>
                      {song.seller?.is_verified && (
                        <BadgeCheck className="h-4 w-4 text-blue-500 animate-pulse" />
                      )}
                      {song.seller?.id && (
                        <MiniHealthMeter 
                          sellerId={song.seller.id}
                          size={24}
                        />
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
                            <Price amount={tier.price} />
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

      {/* Mobile Sticky Action Bar */}
      {isMobile && (
        <MobileActionBar>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">
                {selectedLicenseData 
                  ? LICENSE_TYPES[selectedLicenseData.license_type as keyof typeof LICENSE_TYPES]?.label || 'License'
                  : 'Select a license'}
              </p>
              <p className="text-lg font-bold text-primary">
                {selectedLicenseData ? <Price amount={selectedLicenseData.price} /> : '--'}
              </p>
            </div>
            <Button 
              size="lg"
              onClick={handleAddToCart}
              disabled={!selectedLicense || addToCart.isPending}
              className="min-w-[140px]"
            >
              {addToCart.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4 mr-2" />
              )}
              {addToCart.isPending ? 'Adding...' : 'Add to Cart'}
            </Button>
          </div>
        </MobileActionBar>
      )}
    </MainLayout>
  );
}
