import { useState, useEffect } from 'react';
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
import { Loader2, ArrowLeft, Save, Plus, X, AlertTriangle, ShoppingCart, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const LICENSE_TYPES = [
  { value: 'personal', label: 'Personal Use', description: 'For personal projects only', defaultPrice: 29.99 },
  { value: 'commercial', label: 'Commercial', description: 'For commercial projects', defaultPrice: 99.99 },
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

      {/* License Tiers Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            License Tiers
          </CardTitle>
          <CardDescription>
            Manage the available license options for this song. You can add, remove, or update pricing for each license type.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New License Buttons */}
          {availableLicenseTypes.length > 0 && (
            <div className="space-y-3">
              <Label>Add License Type</Label>
              <div className="flex flex-wrap gap-2">
                {availableLicenseTypes.map((license) => (
                  <Button
                    key={license.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddLicenseTier(license.value)}
                    disabled={addLicenseTier.isPending}
                    className="gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {license.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Current License Tiers */}
          <div className="space-y-3">
            <Label>Current License Tiers</Label>
            
            {tiersLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : !licenseTiers?.length ? (
              <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                <Tag className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No license tiers configured</p>
                <p className="text-sm text-muted-foreground">Add at least one license type above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {licenseTiers.map((tier) => {
                  const licenseInfo = LICENSE_TYPES.find(l => l.value === tier.license_type);
                  const hasSales = (tier.current_sales || 0) > 0;
                  
                  return (
                    <div
                      key={tier.id}
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border gap-4",
                        hasSales 
                          ? "border-amber-500/30 bg-amber-500/5"
                          : "border-border bg-muted/30"
                      )}
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{licenseInfo?.label || tier.license_type}</span>
                          {tier.license_type === 'exclusive' && (
                            <Badge variant="secondary" className="text-xs">One-time sale</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{licenseInfo?.description}</p>
                        {hasSales && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-600">
                            <ShoppingCart className="h-3 w-3" />
                            <span>{tier.current_sales} sale{tier.current_sales !== 1 ? 's' : ''}</span>
                            <span className="text-muted-foreground">· Cannot remove</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`price-${tier.id}`} className="text-sm text-muted-foreground whitespace-nowrap">
                            Price (₹)
                          </Label>
                          <Input
                            id={`price-${tier.id}`}
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
                              type="button"
                              size="sm"
                              onClick={() => handleUpdateTierPrice(tier.id)}
                              disabled={updateLicenseTier.isPending}
                            >
                              {updateLicenseTier.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                'Update'
                              )}
                            </Button>
                          )}
                        </div>
                        
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setTierToRemove(tier)}
                          disabled={hasSales || removeLicenseTier.isPending}
                          className={cn(
                            "h-8 w-8",
                            hasSales && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Remove License Confirmation Dialog */}
      <AlertDialog open={!!tierToRemove} onOpenChange={() => setTierToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Remove License Tier
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the <strong>{LICENSE_TYPES.find(l => l.value === tierToRemove?.license_type)?.label}</strong> license tier? 
              This will prevent buyers from purchasing this license type.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveLicenseTier} 
              className="bg-destructive hover:bg-destructive/90"
            >
              Remove License
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}