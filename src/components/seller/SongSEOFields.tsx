import { useState } from 'react';
import { ChevronDown, ChevronUp, Search, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const USE_CASE_OPTIONS = [
  { value: 'youtube', label: 'YouTube Videos' },
  { value: 'ads', label: 'Advertisements' },
  { value: 'podcasts', label: 'Podcasts' },
  { value: 'film', label: 'Film & TV' },
  { value: 'reels', label: 'Social Reels' },
  { value: 'gaming', label: 'Gaming & Streams' },
  { value: 'corporate', label: 'Corporate Media' },
  { value: 'wedding', label: 'Wedding Videos' },
];

interface SongSEOFieldsProps {
  seoTitle: string;
  seoDescription: string;
  seoContent: string;
  useCases: string[];
  lyricsIntro: string;
  onSeoTitleChange: (value: string) => void;
  onSeoDescriptionChange: (value: string) => void;
  onSeoContentChange: (value: string) => void;
  onUseCasesChange: (value: string[]) => void;
  onLyricsIntroChange: (value: string) => void;
  defaultExpanded?: boolean;
}

export function SongSEOFields({
  seoTitle,
  seoDescription,
  seoContent,
  useCases,
  lyricsIntro,
  onSeoTitleChange,
  onSeoDescriptionChange,
  onSeoContentChange,
  onUseCasesChange,
  onLyricsIntroChange,
  defaultExpanded = false,
}: SongSEOFieldsProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);

  const toggleUseCase = (value: string) => {
    if (useCases.includes(value)) {
      onUseCasesChange(useCases.filter(v => v !== value));
    } else {
      onUseCasesChange([...useCases, value]);
    }
  };

  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-between p-4 h-auto border border-border rounded-lg hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            <span className="font-medium">SEO Settings</span>
            <span className="text-xs text-muted-foreground">(Optional)</span>
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-4 space-y-6 px-1">
        {/* SEO Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="seo_title">SEO Title</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>Custom title for search engines. Include keywords like genre, mood, or licensing intent.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="seo_title"
            value={seoTitle}
            onChange={(e) => onSeoTitleChange(e.target.value)}
            placeholder="e.g., Buy Romantic Hindi Song License | Perfect for Wedding Videos"
            maxLength={60}
          />
          <p className={cn(
            "text-xs",
            seoTitle.length > 55 ? "text-amber-500" : "text-muted-foreground"
          )}>
            {seoTitle.length}/60 characters
          </p>
        </div>

        {/* Meta Description */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="seo_description">Meta Description</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>Description shown in search results. Make it compelling for buyers.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Textarea
            id="seo_description"
            value={seoDescription}
            onChange={(e) => onSeoDescriptionChange(e.target.value)}
            placeholder="License this soulful romantic track for your project. Instant download with commercial rights. Perfect for films, ads, and social media."
            maxLength={160}
            rows={2}
          />
          <p className={cn(
            "text-xs",
            seoDescription.length > 155 ? "text-amber-500" : "text-muted-foreground"
          )}>
            {seoDescription.length}/160 characters
          </p>
        </div>

        {/* Use Cases */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Use Cases</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>Select all the ways buyers can use this song. Helps with search visibility.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex flex-wrap gap-3">
            {USE_CASE_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center gap-2">
                <Checkbox
                  id={`usecase-${option.value}`}
                  checked={useCases.includes(option.value)}
                  onCheckedChange={() => toggleUseCase(option.value)}
                />
                <Label
                  htmlFor={`usecase-${option.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* SEO Content */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="seo_content">SEO Content</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>Detailed description for search engines (150-250 words). Appears on your song page for Google to crawl.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Textarea
            id="seo_content"
            value={seoContent}
            onChange={(e) => onSeoContentChange(e.target.value)}
            placeholder="Write a detailed description about this song - its mood, instruments, production style, and ideal use cases. This helps Google understand and rank your song for relevant searches..."
            rows={5}
          />
          <p className={cn(
            "text-xs",
            countWords(seoContent) < 100 ? "text-muted-foreground" : 
            countWords(seoContent) > 250 ? "text-amber-500" : "text-green-600"
          )}>
            {countWords(seoContent)} words {countWords(seoContent) < 100 && "(aim for 150-250)"}
          </p>
        </div>

        {/* Lyrics Intro */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="lyrics_intro">Lyrics Context</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>Context about the lyrics - meaning, mood, inspiration (100-150 words). Helps buyers understand the song.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Textarea
            id="lyrics_intro"
            value={lyricsIntro}
            onChange={(e) => onLyricsIntroChange(e.target.value)}
            placeholder="Describe the story behind the lyrics, its emotional theme, and what inspired it..."
            rows={3}
          />
          <p className={cn(
            "text-xs",
            countWords(lyricsIntro) < 50 ? "text-muted-foreground" : 
            countWords(lyricsIntro) > 150 ? "text-amber-500" : "text-green-600"
          )}>
            {countWords(lyricsIntro)} words {countWords(lyricsIntro) < 50 && "(aim for 100-150)"}
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export { USE_CASE_OPTIONS };
