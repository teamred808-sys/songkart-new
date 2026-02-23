import { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Shield, HelpCircle, Tag, X } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Price } from '@/components/ui/Price';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PriceBreakdownProps {
  subtotal: number;
  platformFee: number;
  total: number;
  itemCount: number;
  discount?: number;
  promoCode?: string;
  promoInput?: string;
  onPromoInputChange?: (val: string) => void;
  onApplyPromo?: () => void;
  onRemovePromo?: () => void;
  promoError?: string;
  isValidating?: boolean;
}

export function PriceBreakdown({
  subtotal, platformFee, total, itemCount,
  discount = 0, promoCode,
  promoInput, onPromoInputChange, onApplyPromo, onRemovePromo,
  promoError, isValidating,
}: PriceBreakdownProps) {
  const [promoExpanded, setPromoExpanded] = useState(false);
  const finalTotal = Math.max(0, total - discount);

  const handleRemovePromo = () => {
    onRemovePromo?.();
    setPromoExpanded(false);
  };

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Song Price */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Song Price ({itemCount} {itemCount === 1 ? 'item' : 'items'})
          </span>
          <span><Price amount={subtotal} /></span>
        </div>
        
        {/* Platform Service Fee */}
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

        {/* Promo Code Section - below Platform Fee */}
        {discount > 0 && promoCode ? (
          <div className="flex items-center justify-between text-sm text-green-600">
            <span className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Promo Applied ({promoCode})
            </span>
            <div className="flex items-center gap-2">
              <span>-<Price amount={discount} /></span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleRemovePromo}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : onApplyPromo ? (
          !promoExpanded ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Have a Discount Code?</span>
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setPromoExpanded(true)}>
                + Add
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter code"
                  value={promoInput || ''}
                  onChange={e => onPromoInputChange?.(e.target.value.toUpperCase())}
                  className="font-mono h-8 text-sm"
                  maxLength={20}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={onApplyPromo}
                  disabled={!promoInput?.trim() || isValidating}
                >
                  {isValidating ? '...' : 'Apply'}
                </Button>
              </div>
              {promoError && <p className="text-xs text-destructive">{promoError}</p>}
            </div>
          )
        ) : null}
        
        <Separator />
        
        {/* Total */}
        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span className="text-primary"><Price amount={finalTotal} /></span>
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
