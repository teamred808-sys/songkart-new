import { Check, X, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLicenseSystem, LicenseRights } from "@/hooks/useLicenseTierDefinitions";
import { Skeleton } from "@/components/ui/skeleton";

export function LicenseComparisonTable() {
  const { tiers, labels, isLoading } = useLicenseSystem();

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur border-border/50 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">License Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-3 w-full">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-border/50 rounded-lg p-4 bg-background/30 flex-1">
                <Skeleton className="h-5 w-20 mb-3" />
                {[1, 2, 3, 4, 5].map((j) => (
                  <Skeleton key={j} className="h-4 w-full mb-2" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50 overflow-hidden">
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
        <div className="flex flex-col lg:flex-row gap-3 w-full">
          {tiers.map((tier) => (
            <div key={tier.id} className="border border-border/50 rounded-lg p-4 bg-background/30 flex-1 min-w-0">
              <h4 className="font-medium text-primary mb-3 text-sm">{tier.name}</h4>
              <ul className="space-y-2">
                {labels.map((label) => {
                  const hasRight = (tier.rights as LicenseRights)[label.right_key as keyof LicenseRights];
                  return (
                    <li key={label.id} className="flex items-start gap-2 text-xs">
                      {hasRight ? (
                        <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={`break-words cursor-help ${hasRight ? "text-foreground" : "text-muted-foreground/60"}`}>
                              {label.display_name}
                            </span>
                          </TooltipTrigger>
                          {label.tooltip && (
                            <TooltipContent>
                              <p>{label.tooltip}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </li>
                  );
                })}
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
