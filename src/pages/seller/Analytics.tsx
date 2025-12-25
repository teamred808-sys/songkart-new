import { useSellerStats, useSellerSongs, useSellerTransactions } from '@/hooks/useSellerData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Eye, Play, TrendingUp, DollarSign, Music } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';

const COLORS = ['hsl(270, 95%, 65%)', 'hsl(185, 95%, 55%)', 'hsl(150, 85%, 45%)', 'hsl(38, 95%, 55%)', 'hsl(0, 75%, 55%)'];

export default function Analytics() {
  const { data: stats, isLoading: statsLoading } = useSellerStats();
  const { data: songs, isLoading: songsLoading } = useSellerSongs();
  const { data: transactions, isLoading: txLoading } = useSellerTransactions();
  const { formatPrice, currencySymbol } = useCurrency();

  const totalViews = songs?.reduce((sum, s) => sum + (s.view_count || 0), 0) || 0;
  const totalPlays = songs?.reduce((sum, s) => sum + (s.play_count || 0), 0) || 0;
  const conversionRate = totalViews > 0 ? ((transactions?.length || 0) / totalViews * 100).toFixed(1) : '0';

  // Genre distribution
  const genreData = songs?.reduce((acc, song) => {
    const genre = song.genre?.name || 'Other';
    acc[genre] = (acc[genre] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(genreData || {}).map(([name, value]) => ({ name, value }));

  // Top songs by engagement
  const topSongs = [...(songs || [])]
    .filter(s => s.status === 'approved')
    .sort((a, b) => ((b.play_count || 0) + (b.view_count || 0)) - ((a.play_count || 0) + (a.view_count || 0)))
    .slice(0, 5);

  const isLoading = statsLoading || songsLoading || txLoading;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold font-display">Analytics</h1>
        <p className="text-muted-foreground">Track your content performance and engagement.</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            {isLoading ? <Skeleton className="h-16 w-full" /> : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Views</span>
                  <Eye className="h-4 w-4 text-primary" />
                </div>
                <p className="text-2xl font-bold font-display">{totalViews.toLocaleString()}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            {isLoading ? <Skeleton className="h-16 w-full" /> : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Plays</span>
                  <Play className="h-4 w-4 text-accent" />
                </div>
                <p className="text-2xl font-bold font-display">{totalPlays.toLocaleString()}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            {isLoading ? <Skeleton className="h-16 w-full" /> : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Conversion Rate</span>
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
                <p className="text-2xl font-bold font-display">{conversionRate}%</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            {isLoading ? <Skeleton className="h-16 w-full" /> : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Avg. per Song</span>
                  <DollarSign className="h-4 w-4 text-success" />
                </div>
                <p className="text-2xl font-bold font-display">
                  {formatPrice(songs?.length ? (stats?.totalEarnings || 0) / songs.length : 0)}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-display">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.monthlyEarnings || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 15%)" />
                    <XAxis dataKey="month" stroke="hsl(240, 5%, 55%)" fontSize={12} />
                    <YAxis stroke="hsl(240, 5%, 55%)" fontSize={12} tickFormatter={(v) => `${currencySymbol}${v}`} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(240, 10%, 8%)',
                        border: '1px solid hsl(240, 10%, 15%)',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [formatPrice(value), 'Revenue']}
                    />
                    <Bar dataKey="amount" fill="hsl(270, 95%, 65%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Genre Distribution */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-display">Genre Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : pieData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Music className="h-8 w-8 mx-auto mb-2" />
                  <p>No songs yet</p>
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex items-center">
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(240, 10%, 8%)',
                        border: '1px solid hsl(240, 10%, 15%)',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {pieData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm">{entry.name}</span>
                      <span className="text-sm text-muted-foreground ml-auto">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Content */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-display">Top Performing Content</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : topSongs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No approved songs yet.
            </p>
          ) : (
            <div className="space-y-4">
              {topSongs.map((song, index) => (
                <div key={song.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold">
                    {index + 1}
                  </div>
                  <Avatar className="h-10 w-10 rounded-md">
                    <AvatarImage src={song.cover_image_url || ''} className="object-cover" />
                    <AvatarFallback className="rounded-md bg-muted">{song.title.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{song.title}</p>
                    <Badge variant="secondary" className="text-xs">{song.genre?.name || 'Uncategorized'}</Badge>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" /> {song.view_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Play className="h-4 w-4" /> {song.play_count || 0}
                    </span>
                    <span className="font-semibold text-foreground w-16 text-right">
                      ₹{Number(song.base_price).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
