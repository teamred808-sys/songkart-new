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
        {/* Mobile Layout - Vertical Cards */}
        <div className="md:hidden space-y-3">
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

        {/* Desktop/Tablet Layout - Horizontal Table */}
        <div className="hidden md:block overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 pr-2 font-medium text-muted-foreground">Feature</th>
                {licenseColumns.map((col) => (
                  <th key={col.key} className="text-center py-2 px-1 font-medium text-foreground">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((feature, idx) => (
                <tr key={idx} className="border-b border-border/30 last:border-0">
                  <td className="py-2.5 pr-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="text-left flex items-center gap-1 text-foreground hover:text-primary transition-colors">
                          <span className="text-sm">{feature.name}</span>
                          <HelpCircle className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{feature.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>
                  {licenseColumns.map((col) => (
                    <td key={col.key} className="text-center py-2.5 px-1">
                      {feature[col.key as keyof typeof feature] ? (
                        <Check className="h-4 w-4 text-primary mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Not sure which license? <a href="/help/licensing" className="text-primary hover:underline">Read our licensing guide</a>
        </p>
      </CardContent>
    </Card>
  );
}
