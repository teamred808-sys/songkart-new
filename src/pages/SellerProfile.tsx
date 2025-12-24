import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { SongCard } from "@/components/songs/SongCard";
import { SellerTierBadge } from "@/components/seller/SellerTierBadge";
import { useSellerTier } from "@/hooks/useSellerTier";
import { CheckCircle, Music, Play, Eye, Globe, ExternalLink } from "lucide-react";

interface SellerProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean | null;
  website: string | null;
  social_links: Record<string, string> | null;
}

interface Song {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  preview_audio_url: string | null;
  base_price: number;
  play_count: number | null;
  view_count: number | null;
  has_lyrics: boolean | null;
  has_audio: boolean | null;
  seller_id: string | null;
  genres: { name: string } | null;
  moods: { name: string } | null;
}

const SellerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { data: sellerTier } = useSellerTier(id);

  const { data: seller, isLoading: isLoadingSeller } = useQuery({
    queryKey: ["seller-profile", id],
    queryFn: async () => {
      if (!id) throw new Error("Seller ID required");

      // Verify this user has seller role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", id)
        .eq("role", "seller")
        .maybeSingle();

      if (roleError) throw roleError;
      if (!roleData) return null;

      // Fetch profile
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, bio, is_verified, website, social_links")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as SellerProfile | null;
    },
    enabled: !!id,
  });

  const { data: songs, isLoading: isLoadingSongs } = useQuery({
    queryKey: ["seller-songs", id],
    queryFn: async () => {
      if (!id) return [];

      const { data, error } = await supabase
        .from("songs")
        .select("id, title, description, cover_image_url, preview_audio_url, base_price, play_count, view_count, has_lyrics, has_audio, seller_id, genres(name), moods(name)")
        .eq("seller_id", id)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Song[];
    },
    enabled: !!id,
  });

  // Calculate stats
  const totalSongs = songs?.length || 0;
  const totalPlays = songs?.reduce((sum, song) => sum + (song.play_count || 0), 0) || 0;
  const totalViews = songs?.reduce((sum, song) => sum + (song.view_count || 0), 0) || 0;

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  if (isLoadingSeller) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-6 mb-8">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!seller) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Seller Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This seller profile doesn't exist or is no longer available.
          </p>
          <Link to="/sellers" className="text-primary hover:underline">
            Browse all sellers
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/sellers" className="hover:text-foreground">Sellers</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{seller.full_name || "Seller"}</span>
        </nav>

        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start gap-6 mb-8">
          <Avatar className="h-24 w-24 md:h-32 md:w-32">
            <AvatarImage src={seller.avatar_url || undefined} alt={seller.full_name || "Seller"} />
            <AvatarFallback className="text-2xl">
              {seller.full_name?.charAt(0)?.toUpperCase() || "S"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-3xl font-bold">{seller.full_name || "Anonymous Seller"}</h1>
              {seller.is_verified && (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Verified
                </Badge>
              )}
              {sellerTier && (
                <SellerTierBadge
                  tierLevel={sellerTier.tier_level}
                  tierName={sellerTier.tier_name}
                  badgeColor={sellerTier.badge_color}
                  size="md"
                />
              )}
            </div>

            {seller.bio && (
              <p className="text-muted-foreground mb-4 max-w-2xl">{seller.bio}</p>
            )}

            <div className="flex flex-wrap gap-4">
              {seller.website && (
                <a
                  href={seller.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  Website
                </a>
              )}
              {seller.social_links && Object.entries(seller.social_links).map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline capitalize"
                >
                  <ExternalLink className="h-4 w-4" />
                  {platform}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <Music className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{totalSongs}</div>
              <div className="text-sm text-muted-foreground">Songs</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Play className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{formatNumber(totalPlays)}</div>
              <div className="text-sm text-muted-foreground">Plays</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Eye className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{formatNumber(totalViews)}</div>
              <div className="text-sm text-muted-foreground">Views</div>
            </CardContent>
          </Card>
        </div>

        {/* Songs Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Songs by {seller.full_name || "this seller"}</h2>

          {isLoadingSongs ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : songs && songs.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {songs.map((song) => (
                <SongCard
                  key={song.id}
                  id={song.id}
                  title={song.title}
                  sellerName={seller.full_name || "Unknown Artist"}
                  genre={song.genres?.name}
                  mood={song.moods?.name}
                  coverUrl={song.cover_image_url}
                  basePrice={song.base_price}
                  hasLyrics={song.has_lyrics || false}
                  hasAudio={song.has_audio || false}
                  playCount={song.play_count || 0}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>This seller hasn't uploaded any songs yet.</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default SellerProfile;
