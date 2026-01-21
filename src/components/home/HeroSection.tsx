import { Link } from "react-router-dom";
import { useState, useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import { Music, Mic2, Sparkles, Shield, CheckCircle, TrendingUp } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import StartSellingButton from "./StartSellingButton";
import { cn } from "@/lib/utils";

const stats = [
  { label: "Songs", value: "10K+", icon: Music },
  { label: "Artists", value: "5K+", icon: Mic2 },
  { label: "Downloads", value: "50K+", icon: TrendingUp },
];

const HeroSection = memo(function HeroSection() {
  const isMobile = useIsMobile();
  const [isInteractive, setIsInteractive] = useState(false);

  // Defer animations until after first paint for LCP optimization
  useEffect(() => {
    // Use requestIdleCallback for non-critical work, with fallback
    const scheduleAnimations = () => {
      if ('requestIdleCallback' in window) {
        const id = requestIdleCallback(() => setIsInteractive(true), { timeout: 2000 });
        return () => cancelIdleCallback(id);
      } else {
        const timer = setTimeout(() => setIsInteractive(true), 100);
        return () => clearTimeout(timer);
      }
    };
    
    const cleanup = scheduleAnimations();
    return cleanup;
  }, []);

  // Reduce waveform bar count on mobile for performance
  const barCount = isMobile ? 20 : 50;

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-hero">
      {/* Animated background elements - deferred on mobile */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className={cn(
            "absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full",
            isMobile ? "blur-xl" : "blur-3xl",
            isInteractive && "animate-pulse"
          )} 
        />
        <div 
          className={cn(
            "absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full",
            isMobile ? "blur-xl" : "blur-3xl",
            isInteractive && "animate-pulse"
          )}
          style={isInteractive ? { animationDelay: "1s" } : undefined} 
        />
        <div 
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full",
            isMobile ? "blur-xl" : "blur-3xl"
          )} 
        />
      </div>

      {/* Floating music notes - only on desktop for performance */}
      {!isMobile && isInteractive && (
        <div className="absolute inset-0 pointer-events-none">
          <Music className="absolute top-[20%] left-[15%] w-8 h-8 text-primary/20 animate-float" />
          <Mic2 className="absolute top-[30%] right-[20%] w-10 h-10 text-accent/20 animate-float" style={{ animationDelay: "0.5s" }} />
          <Sparkles className="absolute bottom-[30%] left-[25%] w-6 h-6 text-primary/30 animate-float" style={{ animationDelay: "1s" }} />
          <Music className="absolute bottom-[25%] right-[15%] w-12 h-12 text-accent/15 animate-float" style={{ animationDelay: "1.5s" }} />
        </div>
      )}

      {/* Waveform bars - deferred and reduced on mobile */}
      {isInteractive && (
        <div className="absolute bottom-0 left-0 right-0 h-32 flex items-end justify-center gap-1 opacity-20">
          {[...Array(barCount)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-gradient-to-t from-primary to-accent rounded-full animate-wave"
              style={{
                height: `${Math.random() * 60 + 20}%`,
                animationDelay: `${i * 0.05}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="container relative z-10 px-4 text-center">
        <div className="animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Premium Music & Lyrics Marketplace</span>
          </div>

          {/* LCP Element - H1 headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
            <span className="text-foreground">Discover & License</span>
            <br />
            <span className={cn(
              "bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto]",
              isInteractive && "animate-gradient"
            )}>
              Original Music
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
            The premier marketplace for buying and selling original songs, lyrics, and compositions. 
            Find the perfect sound for your next project.
          </p>

          {/* Trust badges row */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full bg-background/50 border border-border/50",
              !isMobile && "backdrop-blur"
            )}>
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Secure Payments</span>
            </div>
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full bg-background/50 border border-border/50",
              !isMobile && "backdrop-blur"
            )}>
              <CheckCircle className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Licensed Content</span>
            </div>
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full bg-background/50 border border-border/50",
              !isMobile && "backdrop-blur"
            )}>
              <Mic2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Verified Artists</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button asChild size="lg" className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 shadow-glow">
              <Link to="/browse">
                <Music className="mr-2 h-5 w-5" />
                Browse Catalog
              </Link>
            </Button>
            <StartSellingButton variant="outline" size="lg" className="text-lg px-8 py-6 border-primary/50 hover:bg-primary/10">
              <Mic2 className="mr-2 h-5 w-5" />
              Start Selling
            </StartSellingButton>
          </div>

          {/* Animated stats */}
          <div className="flex items-center justify-center gap-8 md:gap-12">
            {stats.map((stat, index) => (
              <div 
                key={index}
                className="flex flex-col items-center gap-1 animate-fade-in"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                <div className="flex items-center gap-2">
                  <stat.icon className="w-5 h-5 text-primary" />
                  <span className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</span>
                </div>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});

export default HeroSection;
