import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  useNewUploadsSettings, 
  useUpdateNewUploadsSetting, 
  useAdminNewUploadsEligible,
  useManageNewUpload
} from '@/hooks/useNewUploads';
import { useToast } from '@/hooks/use-toast';
import { 
  Sparkles,
  Settings, 
  Pin, 
  PinOff, 
  EyeOff, 
  Eye, 
  Clock,
  BadgeCheck,
  Save
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useCurrency } from '@/contexts/CurrencyContext';

export default function NewUploadsManagement() {
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const { data: settings, isLoading: loadingSettings } = useNewUploadsSettings();
  const { data: eligibleSongs, isLoading: loadingSongs, refetch } = useAdminNewUploadsEligible();
  const updateSetting = useUpdateNewUploadsSetting();
  const manageSong = useManageNewUpload();

  const [localSettings, setLocalSettings] = useState<{
    visibility_hours: number;
    max_per_seller: number;
    upload_rate_limit: number;
    section_enabled: boolean;
    scoring_weights: {
      freshness: number;
      tier: number;
      verification: number;
      engagement: number;
      quality: number;
    };
  } | null>(null);

  // Initialize local settings when data loads
  const currentSettings = localSettings || settings;

  const handleSaveSettings = async () => {
    if (!currentSettings) return;

    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: 'new_uploads_visibility_hours', value: currentSettings.visibility_hours }),
        updateSetting.mutateAsync({ key: 'new_uploads_max_per_seller', value: currentSettings.max_per_seller }),
        updateSetting.mutateAsync({ key: 'new_uploads_upload_rate_limit', value: currentSettings.upload_rate_limit }),
        updateSetting.mutateAsync({ key: 'new_uploads_section_enabled', value: currentSettings.section_enabled }),
        updateSetting.mutateAsync({ key: 'new_uploads_scoring_weights', value: currentSettings.scoring_weights }),
      ]);

      toast({
        title: 'Settings Saved',
        description: 'New Uploads settings have been updated.',
      });
      setLocalSettings(null);
      refetch();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings.',
        variant: 'destructive',
      });
    }
  };

  const handleManageSong = async (songId: string, action: 'pin' | 'unpin' | 'exclude' | 'include') => {
    try {
      await manageSong.mutateAsync({ songId, action });
      toast({
        title: 'Success',
        description: `Song ${action === 'pin' ? 'pinned' : action === 'unpin' ? 'unpinned' : action === 'exclude' ? 'excluded' : 'included'}.`,
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update song.',
        variant: 'destructive',
      });
    }
  };

  const updateLocalSetting = <K extends keyof NonNullable<typeof localSettings>>(
    key: K, 
    value: NonNullable<typeof localSettings>[K]
  ) => {
    setLocalSettings(prev => ({
      ...(prev || settings!),
      [key]: value
    }));
  };

  const updateWeight = (key: keyof NonNullable<typeof localSettings>['scoring_weights'], value: number) => {
    setLocalSettings(prev => ({
      ...(prev || settings!),
      scoring_weights: {
        ...(prev?.scoring_weights || settings!.scoring_weights),
        [key]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">New Uploads Management</h1>
              <p className="text-muted-foreground">Configure the Fresh Uploads homepage section</p>
            </div>
          </div>
          {localSettings && (
            <Button onClick={handleSaveSettings} disabled={updateSetting.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          )}
        </div>

        {/* Settings Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                General Settings
              </CardTitle>
              <CardDescription>Configure visibility and limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingSettings ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : currentSettings ? (
                <>
                  {/* Section Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Section Enabled</Label>
                      <p className="text-xs text-muted-foreground">Show New Uploads on homepage</p>
                    </div>
                    <Switch
                      checked={currentSettings.section_enabled}
                      onCheckedChange={(checked) => updateLocalSetting('section_enabled', checked)}
                    />
                  </div>

                  {/* Visibility Window */}
                  <div className="space-y-2">
                    <Label>Visibility Window: {currentSettings.visibility_hours} hours</Label>
                    <Slider
                      value={[currentSettings.visibility_hours]}
                      onValueChange={([value]) => updateLocalSetting('visibility_hours', value)}
                      min={24}
                      max={168}
                      step={12}
                    />
                    <p className="text-xs text-muted-foreground">
                      Songs appear in New Uploads for this duration after approval
                    </p>
                  </div>

                  {/* Max Per Seller */}
                  <div className="space-y-2">
                    <Label>Max Songs Per Seller: {currentSettings.max_per_seller}</Label>
                    <Slider
                      value={[currentSettings.max_per_seller]}
                      onValueChange={([value]) => updateLocalSetting('max_per_seller', value)}
                      min={1}
                      max={5}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum songs from same seller in New Uploads
                    </p>
                  </div>

                  {/* Upload Rate Limit */}
                  <div className="space-y-2">
                    <Label>Upload Rate Limit</Label>
                    <Input
                      type="number"
                      value={currentSettings.upload_rate_limit}
                      onChange={(e) => updateLocalSetting('upload_rate_limit', parseInt(e.target.value) || 5)}
                      min={1}
                      max={20}
                    />
                    <p className="text-xs text-muted-foreground">
                      Max uploads per seller per 24 hours
                    </p>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          {/* Scoring Weights */}
          <Card>
            <CardHeader>
              <CardTitle>Scoring Weights</CardTitle>
              <CardDescription>Adjust how songs are ranked (should sum to ~1.0)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingSettings ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : currentSettings ? (
                <>
                  <div className="space-y-2">
                    <Label>Freshness: {(currentSettings.scoring_weights.freshness * 100).toFixed(0)}%</Label>
                    <Slider
                      value={[currentSettings.scoring_weights.freshness * 100]}
                      onValueChange={([value]) => updateWeight('freshness', value / 100)}
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Seller Tier: {(currentSettings.scoring_weights.tier * 100).toFixed(0)}%</Label>
                    <Slider
                      value={[currentSettings.scoring_weights.tier * 100]}
                      onValueChange={([value]) => updateWeight('tier', value / 100)}
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Verification: {(currentSettings.scoring_weights.verification * 100).toFixed(0)}%</Label>
                    <Slider
                      value={[currentSettings.scoring_weights.verification * 100]}
                      onValueChange={([value]) => updateWeight('verification', value / 100)}
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Engagement: {(currentSettings.scoring_weights.engagement * 100).toFixed(0)}%</Label>
                    <Slider
                      value={[currentSettings.scoring_weights.engagement * 100]}
                      onValueChange={([value]) => updateWeight('engagement', value / 100)}
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Content Quality: {(currentSettings.scoring_weights.quality * 100).toFixed(0)}%</Label>
                    <Slider
                      value={[currentSettings.scoring_weights.quality * 100]}
                      onValueChange={([value]) => updateWeight('quality', value / 100)}
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      Total: {(
                        (currentSettings.scoring_weights.freshness +
                        currentSettings.scoring_weights.tier +
                        currentSettings.scoring_weights.verification +
                        currentSettings.scoring_weights.engagement +
                        currentSettings.scoring_weights.quality) * 100
                      ).toFixed(0)}%
                    </p>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Eligible Songs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Eligible Songs</CardTitle>
            <CardDescription>
              Songs currently within the visibility window. Pin to promote, exclude to hide.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSongs ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : eligibleSongs && eligibleSongs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Song</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eligibleSongs.map((song) => (
                    <TableRow key={song.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {song.cover_image_url ? (
                            <img 
                              src={song.cover_image_url} 
                              alt={song.title}
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                              <Sparkles className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium truncate max-w-[150px]">{song.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-sm truncate max-w-[100px]">
                            {song.profiles?.full_name || 'Unknown'}
                          </span>
                          {song.profiles?.is_verified && (
                            <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {song.approved_at ? formatDistanceToNow(new Date(song.approved_at), { addSuffix: true }) : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>{formatPrice(song.base_price)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {song.has_audio && <Badge variant="outline" className="text-xs">Audio</Badge>}
                          {song.has_lyrics && <Badge variant="outline" className="text-xs">Lyrics</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {song.new_uploads_pinned && (
                            <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                              <Pin className="h-3 w-3 mr-1" />
                              Pinned
                            </Badge>
                          )}
                          {song.new_uploads_excluded && (
                            <Badge variant="destructive">
                              <EyeOff className="h-3 w-3 mr-1" />
                              Excluded
                            </Badge>
                          )}
                          {!song.new_uploads_pinned && !song.new_uploads_excluded && (
                            <Badge variant="secondary">Normal</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {song.new_uploads_pinned ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleManageSong(song.id, 'unpin')}
                              disabled={manageSong.isPending}
                            >
                              <PinOff className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleManageSong(song.id, 'pin')}
                              disabled={manageSong.isPending}
                            >
                              <Pin className="h-4 w-4" />
                            </Button>
                          )}
                          {song.new_uploads_excluded ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleManageSong(song.id, 'include')}
                              disabled={manageSong.isPending}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleManageSong(song.id, 'exclude')}
                              disabled={manageSong.isPending}
                            >
                              <EyeOff className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No songs currently eligible for New Uploads</p>
                <p className="text-sm">Songs appear here when approved within the visibility window</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
