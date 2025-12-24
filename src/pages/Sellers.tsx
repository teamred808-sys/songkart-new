import { useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Music, CheckCircle, User } from "lucide-react";

interface SellerProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean | null;
  songCount: number;
}

export default function Sellers() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: sellers, isLoading } = useQuery({
    queryKey: ["sellers"],
    queryFn: async () => {
      // Get all users with seller role
      const { data: sellerRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "seller");

      if (rolesError) throw rolesError;
      if (!sellerRoles || sellerRoles.length === 0) return [];

      const sellerIds = sellerRoles.map((r) => r.user_id);

      // Get profiles for these sellers
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, bio, is_verified")
        .in("id", sellerIds);

      if (profilesError) throw profilesError;

      // Get song counts for each seller
      const { data: songs, error: songsError } = await supabase
        .from("songs")
        .select("seller_id")
        .eq("status", "approved")
        .in("seller_id", sellerIds);

      if (songsError) throw songsError;

      // Count songs per seller
      const songCounts: Record<string, number> = {};
      songs?.forEach((song) => {
        if (song.seller_id) {
          songCounts[song.seller_id] = (songCounts[song.seller_id] || 0) + 1;
        }
      });

      // Combine data
      return (profiles || []).map((profile) => ({
        ...profile,
        songCount: songCounts[profile.id] || 0,
      })) as SellerProfile[];
    },
  });

  const filteredSellers = sellers?.filter((seller) =>
    seller.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Our <span className="text-gradient">Sellers</span>
          </h1>
          <p className="text-muted-foreground mb-6">
            Discover talented artists and musicians on SongKart
          </p>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sellers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Sellers Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl p-6 border border-border">
                <div className="flex flex-col items-center text-center">
                  <Skeleton className="h-20 w-20 rounded-full mb-4" />
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-24 mb-4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredSellers && filteredSellers.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {filteredSellers.length} seller{filteredSellers.length !== 1 ? "s" : ""} found
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredSellers.map((seller) => (
                <Link
                  key={seller.id}
                  to={`/seller/${seller.id}`}
                  className="bg-card hover:bg-card/80 rounded-xl p-6 border border-border transition-all hover:border-primary/50 hover:shadow-lg group"
                >
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="h-20 w-20 mb-4 ring-2 ring-border group-hover:ring-primary/50 transition-all">
                      <AvatarImage src={seller.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xl">
                        {seller.full_name?.charAt(0) || <User className="h-8 w-8" />}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex items-center gap-1.5 mb-1">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {seller.full_name || "Anonymous Artist"}
                      </h3>
                      {seller.is_verified && (
                        <CheckCircle className="h-4 w-4 text-primary fill-primary/20" />
                      )}
                    </div>
                    
                    <Badge variant="secondary" className="mb-3 gap-1">
                      <Music className="h-3 w-3" />
                      {seller.songCount} song{seller.songCount !== 1 ? "s" : ""}
                    </Badge>
                    
                    {seller.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {seller.bio}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No sellers found</h3>
            <p className="text-muted-foreground max-w-md">
              {searchQuery
                ? "Try adjusting your search to find sellers."
                : "No sellers have joined the platform yet."}
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
