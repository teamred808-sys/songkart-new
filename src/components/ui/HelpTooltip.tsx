import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HelpTooltipProps {
  content: string;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  iconClassName?: string;
}

export function HelpTooltip({ 
  content, 
  className, 
  side = "top",
  iconClassName 
}: HelpTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button 
            type="button" 
            className={cn(
              "inline-flex items-center justify-center rounded-full hover:bg-muted/50 p-0.5 transition-colors",
              className
            )}
          >
            <HelpCircle className={cn("h-4 w-4 text-muted-foreground", iconClassName)} />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
