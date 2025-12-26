import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGenres, useMoods } from '@/hooks/useSellerData';
import { useAudioPreviewGenerator } from '@/hooks/useAudioPreviewGenerator';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Loader2, Upload, Music, FileText, DollarSign, CheckCircle, ArrowLeft, ArrowRight, X, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// File size limits
const MAX_AUDIO_FILE_SIZE_MB = 200;
const MAX_AUDIO_FILE_SIZE_BYTES = MAX_AUDIO_FILE_SIZE_MB * 1024 * 1024;
const MAX_COVER_FILE_SIZE_MB = 20;
const MAX_COVER_FILE_SIZE_BYTES = MAX_COVER_FILE_SIZE_MB * 1024 * 1024;

const LICENSE_TYPES = [
  { value: 'personal', label: 'Personal Use', description: 'For personal projects only' },
  { value: 'youtube', label: 'YouTube License', description: 'For YouTube content creators' },
  { value: 'commercial', label: 'Commercial', description: 'For commercial projects' },
  { value: 'film', label: 'Film/TV', description: 'For film and television' },
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
  full_lyrics: z.string().optional(),
  preview_lyrics: z.string().optional(),
});

const licenseTierSchema = z.object({
  license_type: z.enum(['personal', 'youtube', 'commercial', 'film', 'exclusive']),
  price: z.number().min(0.01, 'Price must be at least ₹0.01'),
  max_sales: z.number().optional(),
  terms: z.string().optional(),
});

const pricingSchema = z.object({
  base_price: z.number().min(0.01, 'Base price required'),
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

export default function UploadSong() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: genres } = useGenres();
  const { data: moods } = useMoods();
  const { generatePreview, isGenerating: isGeneratingPreview, progress: previewProgress, error: previewError } = useAudioPreviewGenerator();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewGenerationPhase, setPreviewGenerationPhase] = useState<'idle' | 'generating' | 'validating'>('idle');

  // Warn user before leaving during upload/preview generation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSubmitting || isGeneratingPreview) {
        e.preventDefault();
        e.returnValue = 'Your upload is in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSubmitting, isGeneratingPreview]);
  
  // Form data state
  const [metadata, setMetadata] = useState<MetadataForm | null>(null);
  const [content, setContent] = useState<ContentForm>({});
  const [pricing, setPricing] = useState<PricingForm>({ base_price: 29.99, license_tiers: [] });
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // File previews
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const metadataForm = useForm<MetadataForm>({
    resolver: zodResolver(metadataSchema),
    defaultValues: { language: 'English' },
  });

  const handleMetadataSubmit = (data: MetadataForm) => {
    setMetadata(data);
    setStep(2);
  };

  const handleFileChange = (field: keyof ContentForm, file: File | null) => {
    // Validate audio file size
    if (field === 'audio_file' && file) {
      if (file.size > MAX_AUDIO_FILE_SIZE_BYTES) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        toast({ 
          title: 'File too large', 
          description: `Your audio file is ${fileSizeMB} MB. Maximum allowed size is ${MAX_AUDIO_FILE_SIZE_MB} MB. Try using MP3 format for smaller file sizes.`,
          variant: 'destructive' 
        });
        return;
      }
    }
    
    // Validate cover image file size
    if (field === 'cover_image' && file) {
      if (file.size > MAX_COVER_FILE_SIZE_BYTES) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        toast({ 
          title: 'Cover image too large', 
          description: `Your image is ${fileSizeMB} MB. Maximum allowed size is ${MAX_COVER_FILE_SIZE_MB} MB. Try compressing the image or using JPG format.`,
          variant: 'destructive' 
        });
        return;
      }
    }
    
    setContent(prev => ({ ...prev, [field]: file }));
    
    if (field === 'cover_image' && file) {
      const reader = new FileReader();
      reader.onload = (e) => setCoverPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addLicenseTier = (type: typeof LICENSE_TYPES[number]['value']) => {
    const exists = pricing.license_tiers.find(t => t.license_type === type);
    if (exists) return;
    
    const defaultPrices: Record<string, number> = {
      personal: 29.99,
      youtube: 49.99,
      commercial: 99.99,
      film: 199.99,
      exclusive: 499.99,
    };
    
    setPricing(prev => ({
      ...prev,
      license_tiers: [
        ...prev.license_tiers,
        { license_type: type, price: defaultPrices[type], terms: '' },
      ],
    }));
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
      
      // Store validated metadata from server (declared at function scope)
      let validatedPreviewMetadata: {
        duration_seconds: number;
        file_size_bytes: number;
        validated_at: string;
      } | null = null;

      // Upload cover image
      if (content.cover_image) {
        setUploadProgress(20);
        const coverPath = `${user.id}/${Date.now()}-${content.cover_image.name}`;
        cover_image_url = await uploadFile(content.cover_image, 'song-covers', coverPath);
      }

      // Upload audio file
      if (content.audio_file) {
        setUploadProgress(30);
        const audioPath = `${user.id}/${Date.now()}-${content.audio_file.name}`;
        audio_url = await uploadFile(content.audio_file, 'song-audio', audioPath);

        // Generate optimized preview client-side (45s max, mono, compressed)
        setUploadProgress(40);
        setPreviewGenerationPhase('generating');
        console.log('Generating optimized preview client-side...');
        
        const previewResult = await generatePreview(content.audio_file);
        
        // MANDATORY: Block upload if preview generation fails
        if (!previewResult) {
          console.error('Preview generation failed:', previewError);
          toast({ 
            title: 'Preview Generation Failed', 
            description: 'Could not generate audio preview. Please try a different audio file format (MP3 recommended) or refresh the page and try again.',
            variant: 'destructive' 
          });
          setIsSubmitting(false);
          setPreviewGenerationPhase('idle');
          return;
        }
        
        setUploadProgress(60);
        setPreviewGenerationPhase('validating');
        
        // Validate preview through edge function before saving
        const formData = new FormData();
        formData.append('file', previewResult.blob, 'preview.mp3');
        formData.append('songId', 'pending'); // Will be updated after song creation
        
        const { data: validationResult, error: validationError } = await supabase.functions.invoke('validate-preview', {
          body: formData,
        });
        
        if (validationError || !validationResult?.success) {
          const errorMessage = validationResult?.message || validationError?.message || 'Preview validation failed';
          console.error('Preview validation failed:', errorMessage);
          toast({ 
            title: 'Preview Validation Failed', 
            description: `${errorMessage}. Please try again with a different audio file.`,
            variant: 'destructive' 
          });
          setIsSubmitting(false);
          setPreviewGenerationPhase('idle');
          return;
        }
        
        setPreviewGenerationPhase('idle');
        
        // Use server-validated data (not client-provided)
        preview_audio_url = validationResult.data.preview_url;
        validatedPreviewMetadata = {
          duration_seconds: validationResult.data.duration_seconds,
          file_size_bytes: validationResult.data.file_size_bytes,
          validated_at: validationResult.data.validated_at,
        };
        console.log(`Preview validated and uploaded: ${(validatedPreviewMetadata.file_size_bytes / 1024).toFixed(1)} KB, ${validatedPreviewMetadata.duration_seconds}s, ${validationResult.data.bitrate_kbps}kbps`);
      }

      setUploadProgress(70);

      // Create song record with SERVER-VALIDATED preview metadata
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
          full_lyrics: content.full_lyrics || null,
          preview_lyrics: content.preview_lyrics || null,
          base_price: pricing.base_price,
          has_audio: !!audio_url,
          has_lyrics: !!content.full_lyrics,
          status: 'pending',
          // Use server-validated metadata, not hardcoded/client values
          preview_generated_at: preview_audio_url ? new Date().toISOString() : null,
          preview_duration_seconds: validatedPreviewMetadata?.duration_seconds || null,
          preview_file_size_bytes: validatedPreviewMetadata?.file_size_bytes || null,
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
      setPreviewGenerationPhase('idle');
    }
  };

  // Preview generation in progress - show blocking overlay
  const showPreviewOverlay = isSubmitting && (isGeneratingPreview || previewGenerationPhase !== 'idle');

  return (
    <>
      {/* Preview Generation Overlay - blocks interaction during processing */}
      {showPreviewOverlay && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-[90%] max-w-md mx-4">
            <CardContent className="pt-6">
              <div className="space-y-4 text-center">
                <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                <h3 className="text-lg font-semibold">
                  {previewGenerationPhase === 'generating' 
                    ? 'Generating Audio Preview' 
                    : previewGenerationPhase === 'validating'
                    ? 'Validating Preview'
                    : 'Processing Audio'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {previewGenerationPhase === 'generating' 
                    ? 'Creating a 45-second compressed preview from your audio...'
                    : previewGenerationPhase === 'validating'
                    ? 'Verifying preview meets quality requirements...'
                    : 'Please wait while we process your audio file...'}
                </p>
                <Progress value={isGeneratingPreview ? previewProgress : 100} className="w-full" />
                <p className="text-xs text-muted-foreground">
                  {isGeneratingPreview ? `${previewProgress}% complete` : 'Finalizing...'}
                </p>
                <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-500 mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs font-medium">Please stay on this page</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
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
              <Label>Cover Image</Label>
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
                <Label>Full Audio File</Label>
                <label className="flex items-center justify-center h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  <div className="text-center">
                    <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                    <span className="text-sm text-muted-foreground">
                      {content.audio_file?.name || 'Upload audio'}
                    </span>
                    {content.audio_file && (
                      <span className="text-xs text-muted-foreground block">
                        ({(content.audio_file.size / (1024 * 1024)).toFixed(1)} MB)
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => handleFileChange('audio_file', e.target.files?.[0] || null)}
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  Max size: {MAX_AUDIO_FILE_SIZE_MB} MB • WAV, MP3, FLAC supported
                </p>
              </div>

              {/* Auto-generated preview notice */}
              <div className="space-y-2">
                <Label>Preview Audio</Label>
                <div className={cn(
                  "flex items-center justify-center h-24 border-2 border-dashed rounded-lg",
                  content.audio_file 
                    ? "border-green-500/50 bg-green-500/5" 
                    : "border-border/50 bg-muted/30"
                )}>
                  <div className="text-center text-muted-foreground">
                    {content.audio_file ? (
                      <>
                        <CheckCircle className="h-6 w-6 mx-auto mb-1 text-green-500" />
                        <span className="text-sm text-green-600 dark:text-green-400">Preview will be auto-generated</span>
                        <p className="text-xs mt-1">(45s, ~64kbps MP3)</p>
                      </>
                    ) : (
                      <>
                        <Music className="h-6 w-6 mx-auto mb-1 opacity-50" />
                        <span className="text-sm">Auto-generated from full audio</span>
                        <p className="text-xs mt-1">(45s, optimized for streaming)</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Lyrics */}
            <div className="space-y-2">
              <Label htmlFor="full_lyrics">Full Lyrics</Label>
              <Textarea
                id="full_lyrics"
                value={content.full_lyrics || ''}
                onChange={(e) => setContent(prev => ({ ...prev, full_lyrics: e.target.value }))}
                placeholder="Enter the full song lyrics..."
                rows={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preview_lyrics">Preview Lyrics (shown before purchase)</Label>
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
              <Button type="button" onClick={() => setStep(3)}>
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
            <div className="space-y-2">
              <Label htmlFor="base_price">Base Price (₹)</Label>
              <Input
                id="base_price"
                type="number"
                step="0.01"
                value={pricing.base_price}
                onChange={(e) => setPricing(prev => ({ ...prev, base_price: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-4">
              <Label>License Tiers</Label>
              <div className="flex flex-wrap gap-2">
                {LICENSE_TYPES.map((type) => {
                  const isAdded = pricing.license_tiers.some(t => t.license_type === type.value);
                  return (
                    <Button
                      key={type.value}
                      type="button"
                      variant={isAdded ? "default" : "outline"}
                      size="sm"
                      onClick={() => isAdded ? removeLicenseTier(type.value) : addLicenseTier(type.value)}
                    >
                      {isAdded && <CheckCircle className="mr-1 h-3 w-3" />}
                      {type.label}
                    </Button>
                  );
                })}
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
                            value={tier.price}
                            onChange={(e) => updateLicenseTier(tier.license_type, 'price', parseFloat(e.target.value) || 0)}
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
                    <dd>{content.audio_file ? '✓ Auto-generated' : 'Pending audio upload'}</dd>
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
            {(isSubmitting || isGeneratingPreview) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {isGeneratingPreview 
                      ? `Generating preview... ${previewProgress}%` 
                      : `Uploading... ${uploadProgress}%`}
                  </span>
                  <span>{isGeneratingPreview ? previewProgress : uploadProgress}%</span>
                </div>
                <Progress value={isGeneratingPreview ? previewProgress : uploadProgress} />
              </div>
            )}

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(3)} disabled={isSubmitting || isGeneratingPreview}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting || isGeneratingPreview || !ownershipConfirmed || !termsAccepted}
                className="btn-glow"
              >
                {isSubmitting || isGeneratingPreview ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isGeneratingPreview ? 'Generating Preview...' : 'Uploading...'}
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
    </>
  );
}
