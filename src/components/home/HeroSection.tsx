import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Music, Mic2, Sparkles } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-hero">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Floating music notes */}
      <div className="absolute inset-0 pointer-events-none">
        <Music className="absolute top-[20%] left-[15%] w-8 h-8 text-primary/20 animate-float" />
        <Mic2 className="absolute top-[30%] right-[20%] w-10 h-10 text-accent/20 animate-float" style={{ animationDelay: "0.5s" }} />
        <Sparkles className="absolute bottom-[30%] left-[25%] w-6 h-6 text-primary/30 animate-float" style={{ animationDelay: "1s" }} />
        <Music className="absolute bottom-[25%] right-[15%] w-12 h-12 text-accent/15 animate-float" style={{ animationDelay: "1.5s" }} />
      </div>

      {/* Waveform bars */}
      <div className="absolute bottom-0 left-0 right-0 h-32 flex items-end justify-center gap-1 opacity-20">
        {[...Array(50)].map((_, i) => (
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

      <div className="container relative z-10 px-4 text-center">
        <div className="animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Premium Music & Lyrics Marketplace</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
            <span className="text-foreground">Discover & License</span>
            <br />
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
              Original Music
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12">
            The premier marketplace for buying and selling original songs, lyrics, and compositions. 
            Find the perfect sound for your next project.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 shadow-glow">
              <Link to="/browse">
                <Music className="mr-2 h-5 w-5" />
                Browse Catalog
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 border-primary/50 hover:bg-primary/10">
              <Link to="/auth?mode=signup&role=seller">
                <Mic2 className="mr-2 h-5 w-5" />
                Start Selling
              </Link>
            </Button>
          </div>

          <div className="mt-16 flex items-center justify-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm">Secure Transactions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm">Licensed Content</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm">Verified Sellers</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
