import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface VerificationWarningBannerProps {
  isVerified: boolean;
  uploadCount: number;
  onVerifyClick: () => void;
  verificationPending?: boolean;
  isLoading?: boolean;
}

export function VerificationWarningBanner({
  isVerified,
  uploadCount,
  onVerifyClick,
  verificationPending = false,
  isLoading = false,
}: VerificationWarningBannerProps) {
  // Never show banner for verified sellers
  if (isVerified) {
    return null;
  }

  const uploadsRemaining = Math.max(0, 2 - uploadCount);
  const isAtLimit = uploadCount >= 2;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Icon */}
          <div className="p-3 rounded-lg bg-amber-500/10 shrink-0 w-fit">
            <ShieldAlert className="h-6 w-6 text-amber-500" />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground">
                Email Verification Required
              </h3>
              <Badge variant="outline" className="text-amber-600 border-amber-500/30">
                Not Verified
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {isAtLimit ? (
                <>You've used all {uploadCount} of your 2 free uploads. Verify your email to unlock unlimited uploads.</>
              ) : (
                <>You've used {uploadCount} of 2 uploads. Verify your email to unlock unlimited songs and lyrics.</>
              )}
            </p>

            {/* Upload progress indicator */}
            <div className="flex items-center gap-2 pt-1">
              <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${Math.min((uploadCount / 2) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {uploadCount} / 2 uploads used
              </span>
            </div>
          </div>

          {/* Action */}
          <div className="shrink-0">
            {verificationPending ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>Check your inbox</span>
              </div>
            ) : (
              <Button 
                onClick={onVerifyClick} 
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Verify Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
