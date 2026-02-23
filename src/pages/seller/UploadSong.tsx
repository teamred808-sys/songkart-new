import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Loader2, Upload, Music, FileText, DollarSign, CheckCircle, ArrowLeft, ArrowRight, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SongSEOFields } from '@/components/seller/SongSEOFields';
import { useSellerTier } from '@/hooks/useSellerTier';

const LICENSE_TYPES = [
  { value: 'personal', label: 'Personal Use', description: 'For personal projects only' },
  { value: 'commercial', label: 'Commercial', description: 'For commercial projects' },
  { value: 'exclusive', label: 'Exclusive', description: 'Full rights transfer' },
] as const;

const metadataSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).optional(),
  genre_id: z.string().min(1, 'Genre is required'),
  mood_id: z.string().optional(),
  bpm: z.number().min(40).max(300).optional().or(z.literal('')),
  language: z.string().default('English'),
});

const contentSchema = z.object({
  cover_image: z.any().optional(),
  audio_file: z.any().optional(),
  preview_audio: z.any().optional(),
  full_lyrics: z.string().optional(),
  preview_lyrics: z.string().optional(),
});

const licenseTierSchema = z.object({
  license_type: z.enum(['personal', 'commercial', 'exclusive']),
  price: z.number().min(0.01, 'Price must be at least ₹0.01'),
  max_sales: z.number().optional(),
  terms: z.string().optional(),
});

const pricingSchema = z.object({
  base_price: z.number().optional(),
  license_tiers: z.array(licenseTierSchema).min(1, 'At least one license tier required'),
});

type MetadataForm = z.infer<typeof metadataSchema>;
type ContentForm = z.infer<typeof contentSchema>;
type PricingForm = z.infer<typeof pricingSchema>;

const STEPS = [
  { id: 1, title: 'Metadata', icon: Music },
  { id: 2, title: 'Content', icon: FileText },
  { id: 3, title: 'Pricing', icon: DollarSign },
  { id: 4, title: 'Review', icon: CheckCircle },
];

const MAX_PREVIEW_DURATION = 45;

// Validate preview audio: MP3 only, max 45 seconds
const validatePreviewAudio = async (file: File): Promise<{ valid: boolean; error?: string; duration?: number }> => {
  // Check file extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension !== 'mp3') {
    return { valid: false, error: 'Preview must be an MP3 file. Other formats are not supported.' };
  }
  
  // Check MIME type
  if (file.type !== 'audio/mpeg' && file.type !== 'audio/mp3') {
    return { valid: false, error: 'Invalid file type. Please upload an MP3 file.' };
  }
  
  // Check duration using Audio API
  return new Promise((resolve) => {
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(file);
    
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      const duration = audio.duration;
      
      if (duration > MAX_PREVIEW_DURATION) {
        resolve({ 
          valid: false, 
          error: `Preview duration is ${Math.round(duration)} seconds. Maximum allowed is ${MAX_PREVIEW_DURATION} seconds.`,
          duration 
        });
      } else {
        resolve({ valid: true, duration });
      }
    };
    
    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ valid: false, error: 'Unable to read audio file. Please ensure it is a valid MP3.' });
    };
    
    audio.src = objectUrl;
  });
};

export default function UploadSong() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: genres } = useGenres();
  const { data: moods } = useMoods();
  const { data: sellerTier } = useSellerTier();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Form data state
  const [metadata, setMetadata] = useState<MetadataForm | null>(null);
  const [content, setContent] = useState<ContentForm>({});
  const [pricing, setPricing] = useState<PricingForm>({ base_price: 0, license_tiers: [] });
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // SEO fields state
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoContent, setSeoContent] = useState('');
  const [useCases, setUseCases] = useState<string[]>([]);
  const [lyricsIntro, setLyricsIntro] = useState('');

  // File previews
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  
  // Preview audio validation state
  const [previewValidationError, setPreviewValidationError] = useState<string | null>(null);
  const [previewDuration, setPreviewDuration] = useState<number | null>(null);
  const [isValidatingPreview, setIsValidatingPreview] = useState(false);

  const metadataForm = useForm<MetadataForm>({
    resolver: zodResolver(metadataSchema),
    defaultValues: { language: 'English' },
  });

  const handleMetadataSubmit = (data: MetadataForm) => {
    setMetadata(data);
    setStep(2);
  };

  const handleFileChange = (field: keyof ContentForm, file: File | null) => {
    setContent(prev => ({ ...prev, [field]: file }));
    
    if (field === 'cover_image' && file) {
      const reader = new FileReader();
      reader.onload = (e) => setCoverPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePreviewFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsValidatingPreview(true);
    setPreviewValidationError(null);
    setPreviewDuration(null);
    
    const result = await validatePreviewAudio(file);
    
    if (result.valid) {
      setContent(prev => ({ ...prev, preview_audio: file }));
      setPreviewDuration(result.duration!);
      toast({ title: 'Preview audio accepted', description: `Duration: ${result.duration!.toFixed(1)} seconds` });
    } else {
      setPreviewValidationError(result.error!);
      setContent(prev => ({ ...prev, preview_audio: null }));
      e.target.value = '';
      toast({ title: 'Preview rejected', description: result.error, variant: 'destructive' });
    }
    
    setIsValidatingPreview(false);
  };

  const clearPreviewAudio = () => {
    setContent(prev => ({ ...prev, preview_audio: null }));
    setPreviewDuration(null);
    setPreviewValidationError(null);
  };

  const addLicenseTier = (type: typeof LICENSE_TYPES[number]['value']) => {
    const exists = pricing.license_tiers.find(t => t.license_type === type);
    if (exists) return;
    
    const defaultPrices: Record<string, number> = {
      personal: 29.99,
      commercial: 99.99,
      exclusive: 499.99,
    };
    
    setPricing(prev => {
      let filteredTiers = [...prev.license_tiers];
      if (type === 'exclusive') {
        filteredTiers = filteredTiers.filter(t => t.license_type !== 'personal' && t.license_type !== 'commercial');
      } else if (type === 'personal' || type === 'commercial') {
        filteredTiers = filteredTiers.filter(t => t.license_type !== 'exclusive');
      }
      return {
        ...prev,
        license_tiers: [
          ...filteredTiers,
          { license_type: type, price: defaultPrices[type], terms: '' },
        ],
      };
    });
  };

  const removeLicenseTier = (type: string) => {
    setPricing(prev => ({
      ...prev,
      license_tiers: prev.license_tiers.filter(t => t.license_type !== type),
    }));
  };

  const updateLicenseTier = (type: string, field: string, value: any) => {
    setPricing(prev => ({
      ...prev,
      license_tiers: prev.license_tiers.map(t => 
        t.license_type === type ? { ...t, [field]: value } : t
      ),
    }));
  };

  const uploadFile = async (file: File, bucket: string, path: string) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!metadata || !user?.id) return;
    if (!ownershipConfirmed || !termsAccepted) {
      toast({ title: 'Please confirm ownership and accept terms', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(10);

    try {
      let cover_image_url = null;
      let audio_url = null;
      let preview_audio_url = null;

      // Upload cover image
      if (content.cover_image) {
        setUploadProgress(20);
        const coverPath = `${user.id}/${Date.now()}-${content.cover_image.name}`;
        cover_image_url = await uploadFile(content.cover_image, 'song-covers', coverPath);
      }

      // Upload audio file
      if (content.audio_file) {
        setUploadProgress(40);
        const audioPath = `${user.id}/${Date.now()}-${content.audio_file.name}`;
        audio_url = await uploadFile(content.audio_file, 'song-audio', audioPath);
      }

      // Upload preview audio (manual upload)
      if (content.preview_audio) {
        setUploadProgress(55);
        const previewPath = `${user.id}/${Date.now()}-preview-${content.preview_audio.name}`;
        preview_audio_url = await uploadFile(content.preview_audio, 'song-previews', previewPath);
      }

      setUploadProgress(70);

      // Create song record
      const { data: song, error: songError } = await supabase
        .from('songs')
        .insert({
          seller_id: user.id,
          title: metadata.title,
          description: metadata.description || null,
          genre_id: metadata.genre_id,
          mood_id: metadata.mood_id || null,
          bpm: metadata.bpm ? Number(metadata.bpm) : null,
          language: metadata.language,
          cover_image_url,
          audio_url,
          preview_audio_url,
          preview_status: preview_audio_url ? 'ready' : null,
          preview_duration_seconds: previewDuration ? Math.round(previewDuration) : null,
          full_lyrics: content.full_lyrics || null,
          preview_lyrics: content.preview_lyrics || null,
          base_price: pricing.license_tiers.length > 0 ? Math.min(...pricing.license_tiers.map(t => t.price)) : 0,
          has_audio: !!audio_url,
          has_lyrics: !!content.full_lyrics,
          status: 'pending',
          // SEO fields
          seo_title: seoTitle || null,
          seo_description: seoDescription || null,
          seo_content: seoContent || null,
          use_cases: useCases.length > 0 ? useCases : null,
          lyrics_intro: lyricsIntro || null,
        })
        .select()
        .single();

      if (songError) throw songError;

      setUploadProgress(85);

      // Create license tiers
      if (pricing.license_tiers.length > 0) {
        const tiers = pricing.license_tiers.map(tier => ({
          song_id: song.id,
          license_type: tier.license_type,
          price: tier.price,
          max_sales: tier.max_sales || null,
          terms: tier.terms || null,
        }));

        const { error: tiersError } = await supabase
          .from('license_tiers')
          .insert(tiers);

        if (tiersError) throw tiersError;
      }

      setUploadProgress(100);
      
      toast({ 
        title: 'Song uploaded successfully!', 
        description: 'Your song is now pending admin approval.' 
      });
      
      navigate('/seller/songs');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ 
        title: 'Upload failed', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextFromStep2 = () => {
    const missingFields: string[] = [];
    
    if (!content.cover_image) {
      missingFields.push('Cover Image');
    }
    if (!content.audio_file) {
      missingFields.push('Full Audio File');
    }
    if (!content.preview_audio) {
      missingFields.push('Preview Audio');
    }
    if (!content.full_lyrics || content.full_lyrics.trim() === '') {
      missingFields.push('Full Lyrics');
    }
    if (!content.preview_lyrics || content.preview_lyrics.trim() === '') {
      missingFields.push('Preview Lyrics');
    }
    
    if (missingFields.length > 0) {
      toast({ 
        title: 'Required fields missing', 
        description: `Please complete: ${missingFields.join(', ')}`,
        variant: 'destructive' 
      });
      return;
    }
    
    setStep(3);
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold font-display">Upload New Song</h1>
        <p className="text-muted-foreground">Share your music with the world.</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                  step >= s.id
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-border text-muted-foreground"
                )}
              >
                <s.icon className="h-5 w-5" />
              </div>
              <span className={cn(
                "ml-2 text-sm font-medium hidden sm:inline",
                step >= s.id ? "text-foreground" : "text-muted-foreground"
              )}>
                {s.title}
              </span>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  "w-8 sm:w-16 lg:w-24 h-0.5 mx-2 sm:mx-4",
                  step > s.id ? "bg-primary" : "bg-border"
                )} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Metadata */}
      {step === 1 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Song Details</CardTitle>
            <CardDescription>Basic information about your song.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={metadataForm.handleSubmit(handleMetadataSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  {...metadataForm.register('title')}
                  placeholder="Enter song title"
                />
                {metadataForm.formState.errors.title && (
                  <p className="text-sm text-destructive">{metadataForm.formState.errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...metadataForm.register('description')}
                  placeholder="Describe your song..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Genre *</Label>
                  <Select
                    value={metadataForm.watch('genre_id')}
                    onValueChange={(v) => metadataForm.setValue('genre_id', v)}
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
                  {metadataForm.formState.errors.genre_id && (
                    <p className="text-sm text-destructive">{metadataForm.formState.errors.genre_id.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Mood</Label>
                  <Select
                    value={metadataForm.watch('mood_id')}
                    onValueChange={(v) => metadataForm.setValue('mood_id', v)}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bpm">BPM</Label>
                  <Input
                    id="bpm"
                    type="number"
                    {...metadataForm.register('bpm', { valueAsNumber: true })}
                    placeholder="e.g., 120"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Input
                    id="language"
                    {...metadataForm.register('language')}
                    placeholder="e.g., English"
                  />
                </div>
              </div>

              {/* SEO Fields Section */}
              <SongSEOFields
                seoTitle={seoTitle}
                seoDescription={seoDescription}
                seoContent={seoContent}
                useCases={useCases}
                lyricsIntro={lyricsIntro}
                onSeoTitleChange={setSeoTitle}
                onSeoDescriptionChange={setSeoDescription}
                onSeoContentChange={setSeoContent}
                onUseCasesChange={setUseCases}
                onLyricsIntroChange={setLyricsIntro}
              />

              <div className="flex justify-end">
                <Button type="submit">
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Content */}
      {step === 2 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Upload Content</CardTitle>
            <CardDescription>Upload your audio files and lyrics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
                  {/* Cover Image */}
                  <div className="space-y-2">
                    <Label>Cover Image *</Label>
              <div className="flex items-start gap-4">
                {coverPreview ? (
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-border">
                    <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setCoverPreview(null);
                        handleFileChange('cover_image', null);
                      }}
                      className="absolute top-1 right-1 p-1 rounded-full bg-background/80 hover:bg-background"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                    <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange('cover_image', e.target.files?.[0] || null)}
                    />
                  </label>
                )}
                <div className="text-sm text-muted-foreground">
                  <p>Recommended: 500x500px</p>
                  <p>Max size: 5MB</p>
                  <p>Formats: JPG, PNG, WebP</p>
                </div>
              </div>
            </div>

            {/* Audio Files */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Audio File *</Label>
                <label className="flex items-center justify-center h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  <div className="text-center">
                    <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                    <span className="text-sm text-muted-foreground">
                      {content.audio_file?.name || 'Upload audio'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => handleFileChange('audio_file', e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {/* Preview Audio - Manual Upload */}
              <div className="space-y-2">
                <Label>Preview Audio *</Label>
                {content.preview_audio ? (
                  <div className="flex items-center justify-between h-24 border-2 border-primary/50 rounded-lg bg-primary/5 px-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-6 w-6 text-primary" />
                      <div>
                        <p className="text-sm font-medium truncate max-w-[150px]">
                          {content.preview_audio.name}
                        </p>
                        {previewDuration && (
                          <p className="text-xs text-muted-foreground">
                            Duration: {previewDuration.toFixed(1)}s
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={clearPreviewAudio}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className={cn(
                    "flex items-center justify-center h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                    previewValidationError 
                      ? "border-destructive/50 bg-destructive/5" 
                      : "border-border hover:border-primary/50",
                    isValidatingPreview && "opacity-50 pointer-events-none"
                  )}>
                    <div className="text-center">
                      {isValidatingPreview ? (
                        <Loader2 className="h-6 w-6 mx-auto text-muted-foreground mb-1 animate-spin" />
                      ) : previewValidationError ? (
                        <AlertCircle className="h-6 w-6 mx-auto text-destructive mb-1" />
                      ) : (
                        <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {isValidatingPreview ? 'Validating...' : 'Upload preview'}
                      </span>
                    </div>
                    <input
                      type="file"
                      accept=".mp3,audio/mpeg"
                      className="hidden"
                      onChange={handlePreviewFileChange}
                      disabled={isValidatingPreview}
                    />
                  </label>
                )}
                <p className="text-xs text-muted-foreground">
                  MP3 only, max {MAX_PREVIEW_DURATION} seconds
                </p>
                {previewValidationError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {previewValidationError}
                  </p>
                )}
              </div>
            </div>

            {/* Lyrics */}
            <div className="space-y-2">
              <Label htmlFor="full_lyrics">Full Lyrics *</Label>
              <Textarea
                id="full_lyrics"
                value={content.full_lyrics || ''}
                onChange={(e) => setContent(prev => ({ ...prev, full_lyrics: e.target.value }))}
                placeholder="Enter the full song lyrics..."
                rows={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preview_lyrics">Preview Lyrics * (shown before purchase)</Label>
              <Textarea
                id="preview_lyrics"
                value={content.preview_lyrics || ''}
                onChange={(e) => setContent(prev => ({ ...prev, preview_lyrics: e.target.value }))}
                placeholder="Enter a preview snippet (first few lines)..."
                rows={3}
              />
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button type="button" onClick={handleNextFromStep2}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Pricing */}
      {step === 3 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Pricing & Licenses</CardTitle>
            <CardDescription>Set your pricing and license options.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>License Tiers</Label>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const hasExclusive = pricing.license_tiers.some(t => t.license_type === 'exclusive');
                  const hasNonExclusive = pricing.license_tiers.some(t => t.license_type === 'personal' || t.license_type === 'commercial');
                  return LICENSE_TYPES.map((type) => {
                    const isAdded = pricing.license_tiers.some(t => t.license_type === type.value);
                    const isDisabled = (type.value === 'exclusive' && hasNonExclusive) || 
                                       ((type.value === 'personal' || type.value === 'commercial') && hasExclusive);
                    return (
                      <Button
                        key={type.value}
                        type="button"
                        variant={isAdded ? "default" : "outline"}
                        size="sm"
                        onClick={() => isAdded ? removeLicenseTier(type.value) : addLicenseTier(type.value)}
                        disabled={isDisabled && !isAdded}
                        className={cn(isDisabled && !isAdded && "opacity-50 cursor-not-allowed")}
                      >
                        {isAdded && <CheckCircle className="mr-1 h-3 w-3" />}
                        {type.label}
                      </Button>
                    );
                  });
                })()}
              </div>

              {/* License tier details */}
              <div className="space-y-4">
                {pricing.license_tiers.map((tier) => {
                  const typeInfo = LICENSE_TYPES.find(t => t.value === tier.license_type);
                  return (
                    <div key={tier.license_type} className="p-4 rounded-lg border border-border bg-muted/30">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{typeInfo?.label}</h4>
                          <p className="text-sm text-muted-foreground">{typeInfo?.description}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLicenseTier(tier.license_type)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs">Price (₹)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max={tier.license_type === 'personal' ? (sellerTier?.max_price_lyrics_only ?? undefined) : tier.license_type === 'commercial' ? (sellerTier?.max_price_with_audio ?? undefined) : undefined}
                            value={tier.price}
                            onChange={(e) => {
                              let val = parseFloat(e.target.value) || 0;
                              if (tier.license_type === 'personal' && sellerTier?.max_price_lyrics_only && val > sellerTier.max_price_lyrics_only) val = sellerTier.max_price_lyrics_only;
                              if (tier.license_type === 'commercial' && sellerTier?.max_price_with_audio && val > sellerTier.max_price_with_audio) val = sellerTier.max_price_with_audio;
                              updateLicenseTier(tier.license_type, 'price', val);
                            }}
                          />
                        </div>
                        {tier.license_type !== 'exclusive' && (
                          <div className="space-y-1">
                            <Label className="text-xs">Max Sales (optional)</Label>
                            <Input
                              type="number"
                              value={tier.max_sales || ''}
                              onChange={(e) => updateLicenseTier(tier.license_type, 'max_sales', parseInt(e.target.value) || null)}
                              placeholder="Unlimited"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {pricing.license_tiers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Select at least one license type above.
                </p>
              )}
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button 
                type="button" 
                onClick={() => setStep(4)}
                disabled={pricing.license_tiers.length === 0}
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Review & Submit</CardTitle>
            <CardDescription>Review your song details before submitting.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Song Details</h4>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Title:</dt>
                    <dd className="font-medium">{metadata?.title}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Genre:</dt>
                    <dd>{genres?.find(g => g.id === metadata?.genre_id)?.name || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">BPM:</dt>
                    <dd>{metadata?.bpm || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Language:</dt>
                    <dd>{metadata?.language}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="font-medium mb-2">Content</h4>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Cover Image:</dt>
                    <dd>{content.cover_image ? '✓ Uploaded' : 'Not uploaded'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Full Audio:</dt>
                    <dd>{content.audio_file ? '✓ Uploaded' : 'Not uploaded'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Preview Audio:</dt>
                    <dd>
                      {content.preview_audio 
                        ? `✓ Uploaded (${previewDuration?.toFixed(1)}s)` 
                        : 'Not uploaded'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Lyrics:</dt>
                    <dd>{content.full_lyrics ? '✓ Added' : 'Not added'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* License tiers summary */}
            <div>
              <h4 className="font-medium mb-2">License Tiers</h4>
              <div className="flex flex-wrap gap-2">
                {pricing.license_tiers.map((tier) => (
                  <div key={tier.license_type} className="px-3 py-1.5 rounded-md bg-muted text-sm">
                    {LICENSE_TYPES.find(t => t.value === tier.license_type)?.label}: ₹{tier.price}
                  </div>
                ))}
              </div>
            </div>

            {/* Confirmations */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="ownership"
                  checked={ownershipConfirmed}
                  onCheckedChange={(checked) => setOwnershipConfirmed(checked === true)}
                />
                <Label htmlFor="ownership" className="text-sm font-normal leading-relaxed">
                  I confirm that I am the original creator or have full rights to sell this content. I understand that violating copyright may result in account termination.
                </Label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                />
                <Label htmlFor="terms" className="text-sm font-normal leading-relaxed">
                  I agree to the platform's Terms of Service and understand that my content will be reviewed before publication.
                </Label>
              </div>
            </div>

            {/* Upload Progress */}
            {isSubmitting && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(3)} disabled={isSubmitting}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting || !ownershipConfirmed || !termsAccepted}
                className="btn-glow"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    Submit for Review
                    <CheckCircle className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
