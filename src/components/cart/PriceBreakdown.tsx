import { Separator } from '@/components/ui/separator';
import { Shield, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Price } from '@/components/ui/Price';

interface PriceBreakdownProps {
  subtotal: number;
  platformFee: number;
  total: number;
  itemCount: number;
}

export function PriceBreakdown({ subtotal, platformFee, total, itemCount }: PriceBreakdownProps) {
  return (
    <TooltipProvider>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Song Price ({itemCount} {itemCount === 1 ? 'item' : 'items'})
          </span>
          <span><Price amount={subtotal} /></span>
        </div>
        
        {platformFee > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              Platform Service Fee
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>This fee covers secure hosting, audio previews, licensing infrastructure, and platform operations.</p>
                </TooltipContent>
              </Tooltip>
            </span>
            <span><Price amount={platformFee} /></span>
          </div>
        )}
        
        <Separator />
        
        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span className="text-primary"><Price amount={total} /></span>
        </div>
        
        {/* Trust message */}
        <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
          <Shield className="h-3 w-3 text-primary" />
          <span>You're supporting independent artists with every purchase</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
