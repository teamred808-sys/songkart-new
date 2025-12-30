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
    personal: true, commercial: true, exclusive: true 
  },
  { 
    name: "YouTube Monetization", 
    tooltip: "Earn ad revenue on YouTube without copyright claims",
    personal: false, commercial: true, exclusive: true 
  },
  { 
    name: "Streaming Platforms", 
    tooltip: "Use on Twitch, podcasts, and other streaming platforms",
    personal: false, commercial: true, exclusive: true 
  },
  { 
    name: "Advertising & Marketing", 
    tooltip: "Use in ads, commercials, and promotional content",
    personal: false, commercial: true, exclusive: true 
  },
  { 
    name: "Film, TV & Documentaries", 
    tooltip: "Use in films, TV shows, documentaries, and broadcast media",
    personal: false, commercial: false, exclusive: true 
  },
  { 
    name: "Full Ownership Rights", 
    tooltip: "Complete ownership - song is removed from marketplace",
    personal: false, commercial: false, exclusive: true 
  },
];

const licenseColumns = [
  { key: "personal", label: "Personal", shortLabel: "Personal" },
  { key: "commercial", label: "Commercial", shortLabel: "Comm." },
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
        {/* Responsive: vertical on mobile, horizontal on desktop */}
        <div className="flex flex-col lg:flex-row gap-3">
          {licenseColumns.map((col) => (
            <div key={col.key} className="border border-border/50 rounded-lg p-4 bg-background/30 flex-1">
              <h4 className="font-medium text-primary mb-3 text-sm">{col.label}</h4>
              <ul className="space-y-2">
                {features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs">
                    {feature[col.key as keyof typeof feature] ? (
                      <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={`break-words ${feature[col.key as keyof typeof feature] ? "text-foreground" : "text-muted-foreground/60"}`}>
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
