import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGenres, useMoods } from '@/hooks/useSellerData';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

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
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [song, setSong] = useState<any>(null);

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
        <p className="text-muted-foreground">Update your song details.</p>
      </div>

      <Card className="bg-card border-border">
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
    </div>
  );
}
