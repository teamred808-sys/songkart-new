import { AlertTriangle, Clock, Ban, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useSellerHealth } from "@/hooks/useStrikeSystem";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";

interface AccountFrozenBannerProps {
  className?: string;
}

export function AccountFrozenBanner({ className }: AccountFrozenBannerProps) {
  const { data: health, isLoading } = useSellerHealth();

  if (isLoading || !health) return null;
  if (!health.is_frozen && !health.is_deactivated) return null;

  // Deactivated account (permanent)
  if (health.is_deactivated) {
    return (
      <Alert variant="destructive" className={className}>
        <Ban className="h-5 w-5" />
        <AlertTitle className="text-lg font-semibold">Account Permanently Deactivated</AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          <p>
            Your account has been permanently deactivated due to repeated copyright violations.
            {health.funds_forfeited && (
              <span className="block mt-1 font-medium">
                All funds (₹{health.forfeited_amount?.toLocaleString()}) have been forfeited.
              </span>
            )}
          </p>
          <p className="text-sm">
            Reason: {health.deactivation_reason || 'Copyright policy violations'}
          </p>
          <p className="text-sm text-muted-foreground">
            If you believe this was a mistake, please contact support.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  // Frozen account (temporary)
  const frozenUntil = health.frozen_until ? new Date(health.frozen_until) : null;
  const timeRemaining = frozenUntil ? formatDistanceToNow(frozenUntil, { addSuffix: false }) : null;

  return (
    <Alert className={`border-amber-500 bg-amber-50 dark:bg-amber-950/20 ${className}`}>
      <AlertTriangle className="h-5 w-5 text-amber-600" />
      <AlertTitle className="text-lg font-semibold text-amber-800 dark:text-amber-400">
        Account Frozen
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3 text-amber-700 dark:text-amber-300">
        <p>
          Your account has been temporarily frozen due to community guideline violations.
        </p>
        
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4" />
          <span>
            {timeRemaining ? (
              <>Time remaining: <strong>{timeRemaining}</strong></>
            ) : (
              'Freeze period ending soon'
            )}
          </span>
          {frozenUntil && (
            <span className="text-muted-foreground">
              (until {format(frozenUntil, 'PPP')})
            </span>
          )}
        </div>

        <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg p-3 text-sm">
          <p className="font-medium mb-1">During the freeze period:</p>
          <ul className="list-disc list-inside space-y-1 text-amber-600 dark:text-amber-400">
            <li>You cannot upload new songs</li>
            <li>You cannot request withdrawals</li>
            <li>Your existing songs remain visible</li>
            <li>Sales continue and earnings accumulate</li>
          </ul>
        </div>

        <p className="text-sm">
          Reason: {health.freeze_reason || 'Community guideline violations'}
        </p>

        <div className="flex gap-2 pt-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/seller/account-health">
              View Account Health
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
