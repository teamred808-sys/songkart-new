import { Check, X, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const features = [
  { 
    name: "Personal Projects", 
    tooltip: "Use in personal videos, demos, and non-commercial content",
    personal: true, youtube: true, commercial: true, film: true, exclusive: true 
  },
  { 
    name: "YouTube Monetization", 
    tooltip: "Earn ad revenue on YouTube without copyright claims",
    personal: false, youtube: true, commercial: true, film: true, exclusive: true 
  },
  { 
    name: "Streaming Platforms", 
    tooltip: "Use on Twitch, podcasts, and other streaming platforms",
    personal: false, youtube: true, commercial: true, film: true, exclusive: true 
  },
  { 
    name: "Advertising & Marketing", 
    tooltip: "Use in ads, commercials, and promotional content",
    personal: false, youtube: false, commercial: true, film: true, exclusive: true 
  },
  { 
    name: "Film, TV & Documentaries", 
    tooltip: "Use in films, TV shows, documentaries, and broadcast media",
    personal: false, youtube: false, commercial: false, film: true, exclusive: true 
  },
  { 
    name: "Full Ownership Rights", 
    tooltip: "Complete ownership - song is removed from marketplace",
    personal: false, youtube: false, commercial: false, film: false, exclusive: true 
  },
];

const licenseColumns = [
  { key: "personal", label: "Personal", shortLabel: "Personal" },
  { key: "youtube", label: "YouTube", shortLabel: "YouTube" },
  { key: "commercial", label: "Commercial", shortLabel: "Comm." },
  { key: "film", label: "Film/TV", shortLabel: "Film" },
  { key: "exclusive", label: "Exclusive", shortLabel: "Excl." },
];

export function LicenseComparisonTable() {
  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          License Comparison
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Compare what's included in each license tier to choose the right one for your project.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Responsive Card Grid - Visible on all screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {licenseColumns.map((col) => (
            <div key={col.key} className="border border-border/50 rounded-lg p-3 bg-background/30">
              <h4 className="font-medium text-primary mb-2 text-sm">{col.label}</h4>
              <ul className="space-y-1.5">
                {features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs">
                    {feature[col.key as keyof typeof feature] ? (
                      <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
                    )}
                    <span className={feature[col.key as keyof typeof feature] ? "text-foreground" : "text-muted-foreground/60"}>
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Not sure which license? <a href="/help/licensing" className="text-primary hover:underline">Read our licensing guide</a>
        </p>
      </CardContent>
    </Card>
  );
}
