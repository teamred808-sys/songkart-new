import { Separator } from '@/components/ui/separator';
import { Shield } from 'lucide-react';
import { Price } from '@/components/ui/Price';

interface PriceBreakdownProps {
  subtotal: number;
  itemCount: number;
}

export function PriceBreakdown({ subtotal, itemCount }: PriceBreakdownProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          License Fees ({itemCount} {itemCount === 1 ? 'item' : 'items'})
        </span>
        <span><Price amount={subtotal} /></span>
      </div>
      <Separator />
      <div className="flex justify-between font-bold text-lg">
        <span>Total</span>
        <span className="text-primary"><Price amount={subtotal} /></span>
      </div>
      
      {/* Trust message */}
      <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
        <Shield className="h-3 w-3 text-primary" />
        <span>You're supporting independent artists with every purchase</span>
      </div>
    </div>
  );
}
