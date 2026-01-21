import { User, Youtube, Building2, Film, Crown, Shield, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const licenseTypes = [
  {
    icon: User,
    title: "Personal Use",
    description: "For demos, practice, and non-commercial projects",
    color: "text-blue-400",
  },
  {
    icon: Youtube,
    title: "YouTube/Streaming",
    description: "Monetize your content on YouTube, Twitch & podcasts",
    color: "text-red-400",
  },
  {
    icon: Building2,
    title: "Commercial",
    description: "For advertising, marketing & commercial projects",
    color: "text-emerald-400",
  },
  {
    icon: Film,
    title: "Film/TV",
    description: "For films, documentaries & broadcast media",
    color: "text-purple-400",
  },
  {
    icon: Crown,
    title: "Exclusive Rights",
    description: "Full ownership - song removed from marketplace",
    color: "text-amber-400",
  },
];

const benefits = [
  "No royalties ever",
  "No copyright strikes",
  "Full legal protection",
  "Instant PDF license",
  "Indian jurisdiction",
];

const WhatYouGet = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/30 min-h-[400px]">
      <div className="container px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Legally Licensed Music</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Buy Music With <span className="text-gradient">Clear Rights</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Choose the perfect license for your project. Every purchase includes a legally binding PDF license you can use as proof of ownership.
          </p>
        </div>

        {/* License Types Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
          {licenseTypes.map((license, index) => (
            <div
              key={index}
              className="group p-5 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/30 hover:bg-card transition-all duration-300 text-center"
            >
              <div className={`inline-flex p-3 rounded-xl bg-background/80 mb-3 group-hover:scale-110 transition-transform duration-300`}>
                <license.icon className={`w-6 h-6 ${license.color}`} />
              </div>
              <h3 className="font-semibold text-foreground text-sm mb-1">{license.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{license.description}</p>
            </div>
          ))}
        </div>

        {/* Benefits Banner */}
        <div className="relative p-6 md:p-8 rounded-3xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 border border-primary/20 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                  Why Choose Licensed Music?
                </h3>
                <div className="flex flex-wrap gap-3">
                  {benefits.map((benefit, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/60 border border-border/50"
                    >
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button asChild size="lg" className="shrink-0">
                <Link to="/browse">
                  Start Browsing
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatYouGet;
