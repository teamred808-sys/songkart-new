import { useState, useEffect } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, Music, FileText, DollarSign, CheckCircle, ArrowLeft, ArrowRight, X, Image as ImageIcon, Info, Server } from 'lucide-react';
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
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'generating-preview'>('idle');

  // Warn user before leaving during upload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSubmitting) {
        e.preventDefault();
        e.returnValue = 'Your upload is in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSubmitting]);
  
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
    setUploadPhase('uploading');

    try {
      let cover_image_url = null;
      let audio_url = null;

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

      setUploadProgress(60);

      // Create song record with preview_status = 'pending'
      // Preview will be generated server-side
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
          preview_audio_url: null, // Will be set by server
          full_lyrics: content.full_lyrics || null,
          preview_lyrics: content.preview_lyrics || null,
          base_price: pricing.base_price,
          has_audio: !!audio_url,
          has_lyrics: !!content.full_lyrics,
          status: 'pending',
          preview_status: 'pending', // Server will generate preview
          preview_generated_at: null,
          preview_duration_seconds: null,
          preview_file_size_bytes: null,
        })
        .select()
        .single();

      if (songError) throw songError;

      setUploadProgress(75);

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

      setUploadProgress(85);

      // Trigger server-side preview generation if audio was uploaded
      if (audio_url) {
        setUploadPhase('generating-preview');
        console.log('[UploadSong] Triggering server-side preview generation...');
        
        const { data: previewResult, error: previewError } = await supabase.functions.invoke('generate-preview', {
          body: { 
            songId: song.id, 
            audioPath: audio_url 
          },
        });

        if (previewError) {
          console.error('[UploadSong] Preview generation failed:', previewError);
          // Don't fail the upload - preview can be retried later
          toast({ 
            title: 'Song uploaded', 
            description: 'Your song was uploaded but preview generation failed. It will be retried automatically.',
          });
        } else if (previewResult?.success) {
          console.log('[UploadSong] Preview generated:', previewResult);
        } else {
          console.warn('[UploadSong] Preview generation returned non-success:', previewResult);
        }
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
      setUploadPhase('idle');
    }
  };

  return (
    <>
      {/* Upload Progress Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-[90%] max-w-md mx-4">
            <CardContent className="pt-6">
              <div className="space-y-4 text-center">
                <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                <h3 className="text-lg font-semibold">
                  {uploadPhase === 'generating-preview' 
                    ? 'Generating Preview' 
                    : 'Uploading Song'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {uploadPhase === 'generating-preview' 
                    ? 'Creating a 45-second preview on our servers...'
                    : 'Please wait while we upload your files...'}
                </p>
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-xs text-muted-foreground">
                  {uploadProgress}% complete
                </p>
                <div className="flex items-center justify-center gap-2 text-muted-foreground mt-4">
                  <Server className="h-4 w-4" />
                  <span className="text-xs">Preview generated on our servers for reliability</span>
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
          <p className="text-muted-foreground">Share your music with the world</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
          {STEPS.map((s, index) => (
            <div key={s.id} className="flex items-center flex-shrink-0">
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                step >= s.id 
                  ? "bg-primary border-primary text-primary-foreground" 
                  : "border-muted-foreground/30 text-muted-foreground"
              )}>
                <s.icon className="w-5 h-5" />
              </div>
              <span className={cn(
                "ml-2 text-sm font-medium hidden sm:inline",
                step >= s.id ? "text-foreground" : "text-muted-foreground"
              )}>
                {s.title}
              </span>
              {index < STEPS.length - 1 && (
                <div className={cn(
                  "w-8 lg:w-16 h-0.5 mx-2 lg:mx-4",
                  step > s.id ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Metadata */}
        {step === 1 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Song Details</CardTitle>
              <CardDescription>Tell us about your song</CardDescription>
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
                    <p className="text-sm text-destructive">
                      {metadataForm.formState.errors.title.message}
                    </p>
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
                      <p className="text-sm text-destructive">
                        {metadataForm.formState.errors.genre_id.message}
                      </p>
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
                    <Label htmlFor="bpm">BPM (optional)</Label>
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
              <CardDescription>Add your audio file, cover image, and lyrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Cover Image Upload */}
              <div className="space-y-2">
                <Label>Cover Image</Label>
                <div className="flex items-start gap-4">
                  {coverPreview ? (
                    <div className="relative">
                      <img 
                        src={coverPreview} 
                        alt="Cover preview" 
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => {
                          setContent(prev => ({ ...prev, cover_image: null }));
                          setCoverPreview(null);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground mt-1">Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange('cover_image', e.target.files?.[0] || null)}
                      />
                    </label>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Recommended: Square image, at least 500x500px. Max {MAX_COVER_FILE_SIZE_MB}MB.
                  </p>
                </div>
              </div>

              {/* Audio Upload */}
              <div className="space-y-2">
                <Label>Audio File *</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  {content.audio_file ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Music className="h-8 w-8 text-primary" />
                        <div className="text-left">
                          <p className="font-medium">{content.audio_file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(content.audio_file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleFileChange('audio_file', null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="font-medium">Click to upload audio</p>
                      <p className="text-sm text-muted-foreground">
                        MP3, WAV, or FLAC • Max {MAX_AUDIO_FILE_SIZE_MB}MB
                      </p>
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => handleFileChange('audio_file', e.target.files?.[0] || null)}
                      />
                    </label>
                  )}
                </div>
                
                {/* Server-side preview info */}
                {content.audio_file && (
                  <Alert>
                    <Server className="h-4 w-4" />
                    <AlertDescription>
                      A 45-second preview will be automatically generated on our servers after upload for maximum reliability.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Lyrics */}
              <div className="space-y-2">
                <Label htmlFor="full_lyrics">Full Lyrics (optional)</Label>
                <Textarea
                  id="full_lyrics"
                  value={content.full_lyrics || ''}
                  onChange={(e) => setContent(prev => ({ ...prev, full_lyrics: e.target.value }))}
                  placeholder="Enter the full song lyrics..."
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preview_lyrics">Preview Lyrics (optional)</Label>
                <Textarea
                  id="preview_lyrics"
                  value={content.preview_lyrics || ''}
                  onChange={(e) => setContent(prev => ({ ...prev, preview_lyrics: e.target.value }))}
                  placeholder="First verse/chorus for preview..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  This will be shown to buyers before purchase
                </p>
              </div>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button 
                  type="button" 
                  onClick={() => setStep(3)}
                  disabled={!content.audio_file && !content.full_lyrics}
                >
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
              <CardDescription>Set your base price and available license tiers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="base_price">Base Price (₹)</Label>
                <Input
                  id="base_price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={pricing.base_price}
                  onChange={(e) => setPricing(prev => ({ ...prev, base_price: parseFloat(e.target.value) || 0 }))}
                />
                <p className="text-xs text-muted-foreground">
                  This is the starting price for the most basic license
                </p>
              </div>

              <div className="space-y-4">
                <Label>License Tiers</Label>
                
                {/* Available license types to add */}
                <div className="flex flex-wrap gap-2">
                  {LICENSE_TYPES.filter(lt => !pricing.license_tiers.find(t => t.license_type === lt.value)).map((lt) => (
                    <Button
                      key={lt.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addLicenseTier(lt.value)}
                    >
                      + {lt.label}
                    </Button>
                  ))}
                </div>

                {/* Added license tiers */}
                {pricing.license_tiers.map((tier) => {
                  const licenseInfo = LICENSE_TYPES.find(lt => lt.value === tier.license_type);
                  return (
                    <div key={tier.license_type} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{licenseInfo?.label}</h4>
                          <p className="text-sm text-muted-foreground">{licenseInfo?.description}</p>
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
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs">Price (₹)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={tier.price}
                            onChange={(e) => updateLicenseTier(tier.license_type, 'price', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        {tier.license_type !== 'exclusive' && (
                          <div className="space-y-1">
                            <Label className="text-xs">Max Sales (optional)</Label>
                            <Input
                              type="number"
                              min="1"
                              value={tier.max_sales || ''}
                              onChange={(e) => updateLicenseTier(tier.license_type, 'max_sales', e.target.value ? parseInt(e.target.value) : undefined)}
                              placeholder="Unlimited"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {pricing.license_tiers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Add at least one license tier to continue
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
              <CardDescription>Review your song details before submitting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="space-y-4">
                <div className="flex gap-4">
                  {coverPreview && (
                    <img src={coverPreview} alt="Cover" className="w-24 h-24 rounded-lg object-cover" />
                  )}
                  <div>
                    <h3 className="text-xl font-semibold">{metadata?.title}</h3>
                    <p className="text-muted-foreground">{metadata?.description || 'No description'}</p>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span>Genre: {genres?.find(g => g.id === metadata?.genre_id)?.name}</span>
                      {metadata?.bpm && <span>BPM: {metadata.bpm}</span>}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Content</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Audio: {content.audio_file?.name || 'Not uploaded'}</li>
                    <li>• Lyrics: {content.full_lyrics ? 'Included' : 'Not included'}</li>
                    <li>• Preview: Will be generated on server (45 seconds, compressed)</li>
                  </ul>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Pricing</h4>
                  <p className="text-sm text-muted-foreground mb-2">Base Price: ₹{pricing.base_price.toFixed(2)}</p>
                  <div className="space-y-2">
                    {pricing.license_tiers.map((tier) => {
                      const licenseInfo = LICENSE_TYPES.find(lt => lt.value === tier.license_type);
                      return (
                        <div key={tier.license_type} className="flex justify-between text-sm">
                          <span>{licenseInfo?.label}</span>
                          <span>₹{tier.price.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Confirmations */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="ownership"
                    checked={ownershipConfirmed}
                    onCheckedChange={(checked) => setOwnershipConfirmed(checked === true)}
                  />
                  <label htmlFor="ownership" className="text-sm cursor-pointer">
                    I confirm that I own all rights to this content and have the authority to sell it on this platform.
                  </label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  />
                  <label htmlFor="terms" className="text-sm cursor-pointer">
                    I agree to the seller terms of service and understand that my content will be reviewed before being published.
                  </label>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  After submission, your song will be reviewed by our team. A preview will be automatically generated on our servers. You'll be notified once it's approved.
                </AlertDescription>
              </Alert>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(3)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!ownershipConfirmed || !termsAccepted || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Submit Song
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
