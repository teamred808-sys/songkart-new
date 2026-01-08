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
    <section className={`py-8 ${className}`} aria-label="About this track">
      <Card className="bg-muted/30 border-muted">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            About "{song.title}" - Licensed {genre} Track
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Track metadata for crawlers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Genre</p>
                <Link 
                  to={`/browse?genre=${song.genre?.id}`}
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  {genre}
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Mood</p>
                <Link 
                  to={`/browse?mood=${song.mood?.id}`}
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  {mood}
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Language</p>
                <p className="text-sm font-medium">{language}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">License</p>
                <p className="text-sm font-medium text-green-600">Copyright-Safe</p>
              </div>
            </div>
          </div>

          {/* Use cases */}
          <div>
            <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <Film className="h-4 w-4" />
              Perfect for:
            </p>
            <div className="flex flex-wrap gap-2">
              {useCases.map((useCase) => (
                <Badge key={useCase} variant="secondary" className="text-xs">
                  {useCase}
                </Badge>
              ))}
            </div>
          </div>

          {/* Main SEO content - crawlable text */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-muted-foreground leading-relaxed">
              {seoContent}
            </p>
          </div>

          {/* Content availability */}
          <div className="flex items-center gap-4 pt-4 border-t border-muted">
            <div className="flex items-center gap-2 text-sm">
              <Download className="h-4 w-4 text-primary" />
              <span>Includes:</span>
            </div>
            {song.has_audio && (
              <Badge variant="outline" className="text-xs">
                High-Quality Audio
              </Badge>
            )}
            {song.has_lyrics && (
              <Badge variant="outline" className="text-xs">
                Lyrics Document
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              License Certificate
            </Badge>
          </div>

          {/* License reassurance */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <p className="text-sm text-green-700 dark:text-green-400">
              <Shield className="h-4 w-4 inline mr-2" />
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
