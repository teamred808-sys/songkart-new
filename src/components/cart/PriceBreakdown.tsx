import { Separator } from '@/components/ui/separator';

interface PriceBreakdownProps {
  subtotal: number;
  platformFee: number;
  total: number;
  itemCount: number;
}

export function PriceBreakdown({ subtotal, platformFee, total, itemCount }: PriceBreakdownProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
        </span>
        <span>₹{subtotal.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Platform Fee (included)</span>
        <span className="text-muted-foreground">₹{platformFee.toFixed(2)}</span>
      </div>
      <Separator />
      <div className="flex justify-between font-bold text-lg">
        <span>Total</span>
        <span>₹{total.toFixed(2)}</span>
      </div>
    </div>
  );
}
