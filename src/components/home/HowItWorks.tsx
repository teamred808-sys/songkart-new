import { ShoppingBag, Upload, Shield, Music, FileText, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
const steps = [{
  step: 1,
  icon: ShoppingBag,
  title: "For Buyers",
  description: "Browse our curated catalog, preview audio & lyrics, and purchase licenses instantly with secure checkout.",
  features: ["Preview before purchase", "Multiple license tiers", "Instant download"],
  gradient: "from-blue-500/20 to-cyan-500/20",
  iconColor: "text-blue-400",
  borderColor: "border-blue-500/30"
}, {
  step: 2,
  icon: Upload,
  title: "For Sellers",
  description: "Upload your original music and lyrics, set your prices, and earn money from every sale.",
  features: ["Easy upload process", "Set your own prices", "Track your earnings"],
  gradient: "from-purple-500/20 to-pink-500/20",
  iconColor: "text-purple-400",
  borderColor: "border-purple-500/30"
}, {
  step: 3,
  icon: Shield,
  title: "Safe & Secure",
  description: "All transactions are protected, content is verified, and licenses are legally binding.",
  features: ["Verified sellers", "Secure payments", "Legal protection"],
  gradient: "from-emerald-500/20 to-teal-500/20",
  iconColor: "text-emerald-400",
  borderColor: "border-emerald-500/30"
}];
const HowItWorks = () => {
  return <section className="py-24 bg-background">
      <div className="container px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Whether you're looking to buy or sell, we make it simple
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting line for desktop */}
          
          
          {steps.map((step, index) => <div key={index} className={`relative group p-8 rounded-3xl bg-gradient-to-br ${step.gradient} border ${step.borderColor} transition-all duration-300 hover:border-primary/50 hover:shadow-glow`}>
              {/* Step number badge */}
              <div className={`absolute -top-4 left-8 w-8 h-8 rounded-full bg-background border-2 ${step.borderColor} flex items-center justify-center`}>
                <span className={`text-sm font-bold ${step.iconColor}`}>{step.step}</span>
              </div>
              
              <div className="absolute top-4 right-4 text-6xl font-bold text-foreground/5">
                {step.step}
              </div>
              
              <div className={`inline-flex p-4 rounded-2xl bg-background/50 mb-6 mt-2`}>
                <step.icon className={`w-8 h-8 ${step.iconColor}`} />
              </div>

              <h3 className="text-2xl font-bold text-foreground mb-4">
                {step.title}
              </h3>

              <p className="text-muted-foreground mb-6">
                {step.description}
              </p>

              <ul className="space-y-3">
                {step.features.map((feature, i) => <li key={i} className="flex items-center gap-3 text-sm text-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {feature}
                  </li>)}
              </ul>
            </div>)}
        </div>

        {/* Additional info cards */}
        <div className="mt-16 grid md:grid-cols-2 gap-6">
          <div className="flex items-center gap-6 p-6 rounded-2xl bg-muted/30 border border-border/50">
            <div className="p-4 rounded-xl bg-primary/10">
              <Music className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Audio Licensing</h4>
              <p className="text-sm text-muted-foreground">
                License tracks for personal use, YouTube, commercial projects, or exclusive rights
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 p-6 rounded-2xl bg-muted/30 border border-border/50">
            <div className="p-4 rounded-xl bg-accent/10">
              <FileText className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Lyrics Licensing</h4>
              <p className="text-sm text-muted-foreground">
                Purchase lyrics to record your own version or use in your productions
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">Ready to explore? No login required to browse.</p>
          <Button asChild size="lg">
            <Link to="/browse">
              Start Browsing
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>;
};
export default HowItWorks;