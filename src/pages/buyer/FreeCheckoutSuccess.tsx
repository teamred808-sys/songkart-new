import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Music, FileText, ShoppingBag, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function FreeCheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const songTitle = searchParams.get('song') || 'your song';
  const licenseType = searchParams.get('license') || 'Personal';
  const isExclusive = searchParams.get('exclusive') === 'true';
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Hide confetti effect after 3 seconds
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full text-center relative overflow-hidden">
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="absolute top-0 left-1/2 w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="absolute top-0 left-3/4 w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="absolute top-4 left-1/3 w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
            <div className="absolute top-4 left-2/3 w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.25s' }} />
          </div>
        )}
        
        <CardHeader className="pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            Congratulations!
            <Sparkles className="w-6 h-6 text-amber-500" />
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div>
            <p className="text-lg text-muted-foreground">
              You've successfully added
            </p>
            <p className="text-xl font-bold mt-1 flex items-center justify-center gap-2">
              <Music className="w-5 h-5" />
              {songTitle}
            </p>
            <p className="text-muted-foreground mt-1">
              to your account
            </p>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {licenseType} License
            </Badge>
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
              FREE
            </Badge>
            {isExclusive && (
              <Badge className="bg-amber-500">Exclusive</Badge>
            )}
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p>Your license and files are now available in your dashboard.</p>
          </div>

          <div className="grid gap-3 pt-2">
            <Button asChild size="lg" className="gap-2">
              <Link to="/buyer/purchases">
                <ShoppingBag className="w-4 h-4" />
                Go to My Purchases
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link to="/buyer/downloads">
                <FileText className="w-4 h-4" />
                View in License Vault
              </Link>
            </Button>
            
            <Button asChild variant="ghost" size="lg" className="gap-2">
              <Link to="/browse">
                <Music className="w-4 h-4" />
                Browse More Songs
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
