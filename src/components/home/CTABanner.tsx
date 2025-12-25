import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mic2, ArrowRight } from "lucide-react";
import StartSellingButton from "./StartSellingButton";

const CTABanner = () => {
  return (
    <section className="py-24 bg-gradient-hero relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex p-4 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Mic2 className="w-8 h-8 text-primary" />
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            Ready to Share Your
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Musical Creations?
            </span>
          </h2>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join our community of talented artists and start earning from your original music and lyrics today.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <StartSellingButton size="lg" className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 shadow-glow">
              Become a Seller
              <ArrowRight className="ml-2 h-5 w-5" />
            </StartSellingButton>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 border-border hover:bg-muted">
              <Link to="/browse">
                Explore Catalog
              </Link>
            </Button>
          </div>

          <div className="mt-12 pt-12 border-t border-border/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <div className="text-3xl font-bold text-foreground">100%</div>
                <div className="text-sm text-muted-foreground">Original Content</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">5</div>
                <div className="text-sm text-muted-foreground">License Types</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">24/7</div>
                <div className="text-sm text-muted-foreground">Instant Access</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">Secure</div>
                <div className="text-sm text-muted-foreground">Transactions</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTABanner;
