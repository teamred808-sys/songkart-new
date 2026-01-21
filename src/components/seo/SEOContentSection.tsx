import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Music, Globe, Palette, Film, Shield, Download } from 'lucide-react';

interface Song {
  id: string;
  title: string;
  description?: string;
  seo_content?: string;
  genre?: { id: string; name: string };
  mood?: { id: string; name: string };
  language?: string;
  use_cases?: string[];
  has_audio?: boolean;
  has_lyrics?: boolean;
}

interface SEOContentSectionProps {
  song: Song;
  className?: string;
}

const USE_CASE_ICONS: Record<string, React.ElementType> = {
  'YouTube': Film,
  'Ads': Film,
  'Reels': Film,
  'Films': Film,
  'Podcast': Music,
  'Games': Music,
  'Streaming': Music,
};

const DEFAULT_USE_CASES = ['YouTube Videos', 'Advertisements', 'Social Media', 'Podcasts', 'Films'];

/**
 * Crawlable SEO content section for song pages
 * Contains 150-250 words of buyer-intent optimized content
 */
export function SEOContentSection({ song, className = '' }: SEOContentSectionProps) {
  const useCases = song.use_cases?.length ? song.use_cases : DEFAULT_USE_CASES;
  const genre = song.genre?.name || 'Music';
  const mood = song.mood?.name || 'Versatile';
  const language = song.language || 'Instrumental';

  // Use custom SEO content if available, otherwise generate default
  const seoContent = song.seo_content || generateDefaultContent(song);

  return (
    <section className={`py-8 w-full max-w-full overflow-hidden box-border ${className}`} aria-label="About this track">
      <Card className="bg-muted/30 border-muted w-full max-w-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 break-words">
            <Music className="h-5 w-5 text-primary shrink-0" />
            <span className="break-words">About "{song.title}" - Licensed {genre} Track</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 w-full max-w-full overflow-hidden">
          {/* Track metadata for crawlers */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 w-full max-w-full">
            <div className="flex items-center gap-2 min-w-0">
              <Palette className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Genre</p>
                <Link 
                  to={`/browse?genre=${song.genre?.id}`}
                  className="text-sm font-medium hover:text-primary transition-colors truncate block"
                >
                  {genre}
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Music className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Mood</p>
                <Link 
                  to={`/browse?mood=${song.mood?.id}`}
                  className="text-sm font-medium hover:text-primary transition-colors truncate block"
                >
                  {mood}
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Language</p>
                <p className="text-sm font-medium truncate">{language}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">License</p>
                <p className="text-sm font-medium text-green-600 dark:text-green-500">Copyright-Safe</p>
              </div>
            </div>
          </div>

          {/* Use cases */}
          <div className="w-full max-w-full overflow-hidden">
            <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <Film className="h-4 w-4 shrink-0" />
              Perfect for:
            </p>
            <div className="flex flex-wrap gap-2 max-w-full">
              {useCases.map((useCase) => (
                <Badge key={useCase} variant="secondary" className="text-xs whitespace-nowrap shrink-0">
                  {useCase}
                </Badge>
              ))}
            </div>
          </div>

          {/* Main SEO content - crawlable text */}
          <div className="prose prose-sm dark:prose-invert max-w-full w-full overflow-hidden">
            <p className="text-muted-foreground leading-relaxed break-words" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
              {seoContent}
            </p>
          </div>

          {/* Content availability */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 pt-4 border-t border-muted w-full max-w-full">
            <div className="flex items-center gap-2 text-sm shrink-0">
              <Download className="h-4 w-4 text-primary" />
              <span>Includes:</span>
            </div>
            {song.has_audio && (
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                High-Quality Audio
              </Badge>
            )}
            {song.has_lyrics && (
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                Lyrics Document
              </Badge>
            )}
            <Badge variant="outline" className="text-xs whitespace-nowrap">
              License Certificate
            </Badge>
          </div>

          {/* License reassurance */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 w-full max-w-full overflow-hidden">
            <p className="text-sm text-green-700 dark:text-green-400 break-words" style={{ overflowWrap: 'anywhere' }}>
              <Shield className="h-4 w-4 inline mr-2 shrink-0" />
              <strong>100% Copyright Safe:</strong> Every purchase includes a legally binding license certificate. 
              Use this track in monetized content without copyright claims or strikes.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function generateDefaultContent(song: Song): string {
  const genre = song.genre?.name || 'original';
  const mood = song.mood?.name || 'versatile';
  const language = song.language ? `${song.language} ` : '';
  
  return `"${song.title}" is a professionally produced ${language}${genre.toLowerCase()} track featuring a ${mood.toLowerCase()} atmosphere. This fully licensed composition is ideal for content creators, filmmakers, and businesses seeking copyright-safe music. Upon purchase, you receive instant download access, a legal license certificate, and full rights to use in your projects. Our flexible licensing options cater to personal creators, commercial enterprises, and those seeking exclusive rights. ${song.description || `Elevate your content with the professional sound of "${song.title}".`}`;
}
