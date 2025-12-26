import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGenres, useMoods, useSongLicenseTiers, useAddLicenseTier, useUpdateLicenseTier, useRemoveLicenseTier, LicenseTier } from '@/hooks/useSellerData';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, ArrowLeft, Save, Plus, X, AlertTriangle, ShoppingCart, Tag, Upload, Music, Server, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const LICENSE_TYPES = [
  { value: 'personal', label: 'Personal Use', description: 'For personal projects only', defaultPrice: 29.99 },
  { value: 'youtube', label: 'YouTube License', description: 'For YouTube content creators', defaultPrice: 49.99 },
  { value: 'commercial', label: 'Commercial', description: 'For commercial projects', defaultPrice: 99.99 },
  { value: 'film', label: 'Film/TV', description: 'For film and television', defaultPrice: 199.99 },
  { value: 'exclusive', label: 'Exclusive', description: 'Full rights transfer', defaultPrice: 499.99 },
] as const;

type LicenseType = typeof LICENSE_TYPES[number]['value'];

const editSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).optional(),
  genre_id: z.string().min(1, 'Genre is required'),
  mood_id: z.string().optional(),
  bpm: z.number().min(40).max(300).optional().or(z.literal('')),
  language: z.string().default('English'),
  base_price: z.number().min(0.01, 'Price required'),
  full_lyrics: z.string().optional(),
  preview_lyrics: z.string().optional(),
});

type EditForm = z.infer<typeof editSchema>;

export default function EditSong() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: genres } = useGenres();
  const { data: moods } = useMoods();
  const { data: licenseTiers, isLoading: tiersLoading, refetch: refetchTiers } = useSongLicenseTiers(id || '');
  
  const addLicenseTier = useAddLicenseTier();
  const updateLicenseTier = useUpdateLicenseTier();
  const removeLicenseTier = useRemoveLicenseTier();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [song, setSong] = useState<any>(null);
  const [tierToRemove, setTierToRemove] = useState<LicenseTier | null>(null);
  const [tierPrices, setTierPrices] = useState<Record<string, number>>({});
  
  // Audio/Preview regeneration state
  const [newAudioFile, setNewAudioFile] = useState<File | null>(null);
  const [isRegeneratingPreview, setIsRegeneratingPreview] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { language: 'English' },
  });

  useEffect(() => {
    const fetchSong = async () => {
      if (!id || !user?.id) return;

      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('id', id)
        .eq('seller_id', user.id)
        .single();

      if (error || !data) {
        toast({ title: 'Song not found', variant: 'destructive' });
        navigate('/seller/songs');
        return;
      }

      setSong(data);
      form.reset({
        title: data.title,
        description: data.description || '',
        genre_id: data.genre_id || '',
        mood_id: data.mood_id || '',
        bpm: data.bpm || '',
        language: data.language || 'English',
        base_price: Number(data.base_price),
        full_lyrics: data.full_lyrics || '',
        preview_lyrics: data.preview_lyrics || '',
      });
      setIsLoading(false);
    };

    fetchSong();
  }, [id, user?.id]);

  // Initialize tier prices when licenseTiers load
  useEffect(() => {
    if (licenseTiers) {
      const prices: Record<string, number> = {};
      licenseTiers.forEach(tier => {
        prices[tier.id] = tier.price;
      });
      setTierPrices(prices);
    }
  }, [licenseTiers]);

  const onSubmit = async (data: EditForm) => {
    if (!id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('songs')
        .update({
          title: data.title,
          description: data.description || null,
          genre_id: data.genre_id,
          mood_id: data.mood_id || null,
          bpm: data.bpm ? Number(data.bpm) : null,
          language: data.language,
          base_price: data.base_price,
          full_lyrics: data.full_lyrics || null,
          preview_lyrics: data.preview_lyrics || null,
          has_lyrics: !!data.full_lyrics,
        })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Song updated successfully' });
      navigate('/seller/songs');
    } catch (error: any) {
      toast({ title: 'Error updating song', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddLicenseTier = async (type: LicenseType) => {
    if (!id) return;
    
    const licenseInfo = LICENSE_TYPES.find(l => l.value === type);
    if (!licenseInfo) return;

    addLicenseTier.mutate({
      song_id: id,
      license_type: type,
      price: licenseInfo.defaultPrice,
    }, {
      onSuccess: () => refetchTiers(),
    });
  };

  const handleUpdateTierPrice = async (tierId: string) => {
    const newPrice = tierPrices[tierId];
    if (!newPrice || newPrice <= 0) return;

    updateLicenseTier.mutate({
      tier_id: tierId,
      price: newPrice,
    }, {
      onSuccess: () => refetchTiers(),
    });
  };

  const handleRemoveLicenseTier = async () => {
    if (!tierToRemove) return;

    removeLicenseTier.mutate(tierToRemove.id, {
      onSuccess: () => {
        setTierToRemove(null);
        refetchTiers();
      },
      onError: () => {
        setTierToRemove(null);
      },
    });
  };

  // Handle audio file selection for preview regeneration
  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      toast({ title: 'Invalid file type', description: 'Please select an audio file', variant: 'destructive' });
      return;
    }

    setNewAudioFile(file);
  };

  // Upload new audio and trigger server-side preview regeneration
  const handleRegeneratePreview = async () => {
    if (!newAudioFile || !id || !user?.id) return;

    setIsRegeneratingPreview(true);
    setIsUploadingAudio(true);
    
    try {
      // First, upload the new audio file
      const audioPath = `${user.id}/${Date.now()}-${newAudioFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('song-audio')
        .upload(audioPath, newAudioFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('song-audio')
        .getPublicUrl(audioPath);

      // Update song with new audio URL
      const { error: updateError } = await supabase
        .from('songs')
        .update({ 
          audio_url: publicUrl,
          has_audio: true,
          preview_status: 'pending' // Reset for regeneration
        })
        .eq('id', id);

      if (updateError) throw updateError;

      setIsUploadingAudio(false);

      // Trigger server-side preview generation
      console.log('[EditSong] Triggering server-side preview generation...');
      
      const { data: previewResult, error: previewError } = await supabase.functions.invoke('generate-preview', {
        body: { 
          songId: id, 
          audioPath: publicUrl 
        },
      });

      if (previewError) {
        console.error('[EditSong] Preview generation failed:', previewError);
        toast({ 
          title: 'Preview generation failed', 
          description: 'Audio was uploaded but preview generation failed. You can retry later.',
          variant: 'destructive' 
        });
      } else if (previewResult?.success) {
        console.log('[EditSong] Preview generated:', previewResult);
        
        // Refresh song data to get new preview URL
        const { data: updatedSong } = await supabase
          .from('songs')
          .select('preview_audio_url, preview_duration_seconds, preview_file_size_bytes, preview_status')
          .eq('id', id)
          .single();

        if (updatedSong) {
          setSong((prev: any) => ({ ...prev, ...updatedSong }));
        }

        toast({ title: 'Preview regenerated', description: 'Your song preview has been updated' });
      } else {
        toast({ 
          title: 'Preview generation issue', 
          description: previewResult?.error || 'Preview may not have been generated correctly',
          variant: 'destructive' 
        });
      }

      // Clear the file input
      setNewAudioFile(null);
      if (audioInputRef.current) {
        audioInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Preview regeneration failed:', error);
      toast({ 
        title: 'Preview regeneration failed', 
        description: error.message || 'Please try again', 
        variant: 'destructive' 
      });
    } finally {
      setIsRegeneratingPreview(false);
      setIsUploadingAudio(false);
    }
  };

  // Retry preview generation for failed previews
  const handleRetryPreview = async () => {
    if (!id || !song?.audio_url) return;

    setIsRegeneratingPreview(true);
    try {
      const { data: previewResult, error: previewError } = await supabase.functions.invoke('generate-preview', {
        body: { 
          songId: id, 
          audioPath: song.audio_url 
        },
      });

      if (previewError) throw previewError;

      if (previewResult?.success) {
        // Refresh song data
        const { data: updatedSong } = await supabase
          .from('songs')
          .select('preview_audio_url, preview_duration_seconds, preview_file_size_bytes, preview_status, preview_error')
          .eq('id', id)
          .single();

        if (updatedSong) {
          setSong((prev: any) => ({ ...prev, ...updatedSong }));
        }

        toast({ title: 'Preview generated', description: 'Your song preview is now ready' });
      } else {
        throw new Error(previewResult?.error || 'Preview generation failed');
      }
    } catch (error: any) {
      console.error('Preview retry failed:', error);
      toast({ 
        title: 'Preview generation failed', 
        description: error.message || 'Please try again later', 
        variant: 'destructive' 
      });
    } finally {
      setIsRegeneratingPreview(false);
    }
  };

  const existingLicenseTypes = licenseTiers?.map(t => t.license_type) || [];
  const availableLicenseTypes = LICENSE_TYPES.filter(l => !existingLicenseTypes.includes(l.value));

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/seller/songs">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Songs
          </Link>
        </Button>
        <h1 className="text-2xl lg:text-3xl font-bold font-display">Edit Song</h1>
        <p className="text-muted-foreground">Update your song details and license options.</p>
      </div>

      {/* Song Details Card */}
      <Card className="bg-card border-border mb-6">
        <CardHeader>
          <CardTitle>Song Details</CardTitle>
          <CardDescription>
            {song?.status === 'approved' 
              ? 'Changes to approved songs may require re-approval.'
              : 'Edit your song information below.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" {...form.register('title')} />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...form.register('description')} rows={3} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Genre *</Label>
                <Select
                  value={form.watch('genre_id')}
                  onValueChange={(v) => form.setValue('genre_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {genres?.map((genre) => (
                      <SelectItem key={genre.id} value={genre.id}>
                        {genre.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mood</Label>
                <Select
                  value={form.watch('mood_id')}
                  onValueChange={(v) => form.setValue('mood_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mood" />
                  </SelectTrigger>
                  <SelectContent>
                    {moods?.map((mood) => (
                      <SelectItem key={mood.id} value={mood.id}>
                        {mood.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bpm">BPM</Label>
                <Input
                  id="bpm"
                  type="number"
                  {...form.register('bpm', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Input id="language" {...form.register('language')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="base_price">Base Price (₹)</Label>
                <Input
                  id="base_price"
                  type="number"
                  step="0.01"
                  {...form.register('base_price', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_lyrics">Full Lyrics</Label>
              <Textarea id="full_lyrics" {...form.register('full_lyrics')} rows={8} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preview_lyrics">Preview Lyrics</Label>
              <Textarea id="preview_lyrics" {...form.register('preview_lyrics')} rows={3} />
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/seller/songs')}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Audio Preview Card */}
      {song?.has_audio && (
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Audio Preview
            </CardTitle>
            <CardDescription>
              Previews are generated on our servers for maximum reliability (45 seconds, compressed MP3).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current preview info */}
            {song?.preview_audio_url && song?.preview_status === 'ready' && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium mb-1">Current Preview</p>
                <div className="flex flex-wrap gap-4 text-muted-foreground">
                  {song.preview_duration_seconds && (
                    <span>Duration: {Math.round(song.preview_duration_seconds)}s</span>
                  )}
                  {song.preview_file_size_bytes && (
                    <span>Size: {Math.round(song.preview_file_size_bytes / 1024)} KB</span>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    <Server className="h-3 w-3 mr-1" />
                    Server generated
                  </Badge>
                </div>
              </div>
            )}

            {/* Preview status indicators */}
            {song?.preview_status === 'generating' && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Preview is being generated on our servers. This may take a moment...
                </AlertDescription>
              </Alert>
            )}

            {song?.preview_status === 'failed' && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Preview generation failed: {song.preview_error || 'Unknown error'}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRetryPreview}
                    disabled={isRegeneratingPreview}
                  >
                    {isRegeneratingPreview ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {song?.preview_status === 'pending' && !song?.preview_audio_url && (
              <Alert>
                <Server className="h-4 w-4" />
                <AlertDescription>
                  Preview pending generation. Upload new audio to generate a preview.
                </AlertDescription>
              </Alert>
            )}

            {!song?.preview_audio_url && song?.preview_status !== 'generating' && song?.preview_status !== 'pending' && (
              <Alert variant="default" className="border-amber-500/30 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-600">
                  No preview available for this song. Upload an audio file to generate one.
                </AlertDescription>
              </Alert>
            )}

            {/* Upload new audio */}
            <div className="space-y-3">
              <Label htmlFor="audio-file">Upload New Audio File</Label>
              <div className="flex items-center gap-3">
                <Input
                  ref={audioInputRef}
                  id="audio-file"
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioFileChange}
                  disabled={isRegeneratingPreview}
                  className="flex-1"
                />
                {newAudioFile && (
                  <Button
                    type="button"
                    onClick={handleRegeneratePreview}
                    disabled={isRegeneratingPreview}
                  >
                    {isRegeneratingPreview ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {isUploadingAudio ? 'Uploading...' : 'Upload & Generate Preview'}
                  </Button>
                )}
              </div>
              {isRegeneratingPreview && (
                <div className="space-y-2">
                  <Progress value={isUploadingAudio ? 50 : 90} />
                  <p className="text-xs text-muted-foreground text-center">
                    {isUploadingAudio ? 'Uploading audio...' : 'Generating preview on server...'}
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Upload a new audio file to replace the current one and regenerate the preview.
                The preview will be generated on our servers (45 seconds, 64kbps MP3).
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* License Tiers Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            License Tiers
          </CardTitle>
          <CardDescription>
            Manage the license options available for this song.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {tiersLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              {/* Existing Tiers */}
              {licenseTiers && licenseTiers.length > 0 ? (
                <div className="space-y-4">
                  {licenseTiers.map((tier) => {
                    const licenseInfo = LICENSE_TYPES.find(l => l.value === tier.license_type);
                    return (
                      <div key={tier.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{licenseInfo?.label || tier.license_type}</h4>
                            {tier.license_type === 'exclusive' && tier.current_sales && tier.current_sales > 0 && (
                              <Badge variant="secondary">
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                Sold
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{licenseInfo?.description}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">₹</span>
                            <Input
                              type="number"
                              step="0.01"
                              value={tierPrices[tier.id] || tier.price}
                              onChange={(e) => setTierPrices(prev => ({ 
                                ...prev, 
                                [tier.id]: parseFloat(e.target.value) || 0 
                              }))}
                              className="w-24"
                            />
                            {tierPrices[tier.id] !== tier.price && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateTierPrice(tier.id)}
                                disabled={updateLicenseTier.isPending}
                              >
                                {updateLicenseTier.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Save'
                                )}
                              </Button>
                            )}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setTierToRemove(tier)}
                            disabled={tier.license_type === 'exclusive' && tier.current_sales && tier.current_sales > 0}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No license tiers configured. Add one below.
                </p>
              )}

              <Separator />

              {/* Add New Tier */}
              {availableLicenseTypes.length > 0 && (
                <div className="space-y-2">
                  <Label>Add License Tier</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableLicenseTypes.map((lt) => (
                      <Button
                        key={lt.value}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddLicenseTier(lt.value)}
                        disabled={addLicenseTier.isPending}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        {lt.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Remove Tier Confirmation Dialog */}
      <AlertDialog open={!!tierToRemove} onOpenChange={() => setTierToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove License Tier?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the {LICENSE_TYPES.find(l => l.value === tierToRemove?.license_type)?.label} license tier? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveLicenseTier}>
              {removeLicenseTier.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
