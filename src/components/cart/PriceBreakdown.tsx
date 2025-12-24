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
  const feePercentage = subtotal > 0 ? Math.round((platformFee / subtotal) * 100) : 0;
  
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          License Fees ({itemCount} {itemCount === 1 ? 'item' : 'items'})
        </span>
        <span><Price amount={subtotal} /></span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground flex items-center gap-1">
          Platform Service Fee ({feePercentage}%)
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-3 w-3" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>This fee helps maintain the platform, provide secure transactions, and support our verified seller community.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
        <span className="text-muted-foreground"><Price amount={platformFee} /></span>
      </div>
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
  );
}
