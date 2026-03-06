import { useState } from 'react';
import { useSellerWallet, useWithdrawalRequests, useRequestWithdrawal, useHasPendingWithdrawal } from '@/hooks/useSellerData';
import { usePlatformSettings } from '@/hooks/useAdminData';
import { usePayoutProfile, useWithdrawEligibility } from '@/hooks/usePayoutProfile';
import { usePendingClearance } from '@/hooks/usePendingClearance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Wallet as WalletIcon, 
  TrendingUp, 
  Clock, 
  ArrowUpRight, 
  AlertCircle, 
  Loader2,
  ArrowRight,
  CheckCircle2,
  Banknote,
  Info,
  ShieldCheck,
  ExternalLink,
  Timer
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  approved: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  processed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
};

const statusDescriptions: Record<string, string> = {
  pending: 'Your request is being reviewed',
  approved: 'Approved, processing payment',
  processed: 'Payment completed successfully',
  rejected: 'Request was declined',
};

export default function Wallet() {
  const { data: wallet, isLoading: walletLoading } = useSellerWallet();
  const { data: withdrawals, isLoading: withdrawalsLoading } = useWithdrawalRequests();
  const { data: platformSettings } = usePlatformSettings();
  const { data: payoutProfile, isLoading: payoutLoading } = usePayoutProfile();
  const { data: withdrawEligibility } = useWithdrawEligibility();
  const { data: pendingClearance, isLoading: clearanceLoading } = usePendingClearance();
  const { data: hasPendingWithdrawal } = useHasPendingWithdrawal();
  const requestWithdrawal = useRequestWithdrawal();
  const { formatPrice, currencySymbol } = useCurrency();

  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const handleWithdrawalRequest = () => {
    const amount = parseFloat(withdrawAmount);
    
    // Validate amount is a positive number
    if (!amount || amount <= 0 || !payoutProfile) return;
    
    // Validate minimum threshold
    if (amount < threshold) {
      toast({
        title: 'Invalid amount',
        description: `Minimum withdrawal amount is ₹${threshold}`,
        variant: 'destructive'
      });
      return;
    }
    
    // Validate maximum (available balance)
    if (amount > availableBalance) {
      toast({
        title: 'Insufficient balance',
        description: `Maximum withdrawal is ${formatPrice(availableBalance)}`,
        variant: 'destructive'
      });
      return;
    }

    requestWithdrawal.mutate({
      amount,
      payout_method: 'bank_transfer',
      payout_details: { 
        bank_name: payoutProfile.bank_name,
        account_last4: payoutProfile.account_number_last4,
        ifsc_code: payoutProfile.ifsc_code,
      },
    }, {
      onSuccess: () => {
        setShowWithdrawDialog(false);
        setWithdrawAmount('');
      },
    });
  };

  const availableBalance = Number(wallet?.available_balance || 0);
  const pendingBalance = Number(wallet?.pending_balance || 0);
  const totalEarnings = Number(wallet?.total_earnings || 0);
  
  // Always use global platform setting as the threshold
  const threshold = platformSettings?.min_withdrawal?.amount || 500;
  const progressToWithdrawal = Math.min((availableBalance / threshold) * 100, 100);

  const hasBalanceForWithdrawal = availableBalance >= threshold;
  const hasVerifiedPayout = withdrawEligibility?.can_withdraw === true;
  const canWithdraw = hasBalanceForWithdrawal && hasVerifiedPayout && !hasPendingWithdrawal;

  return (
    <TooltipProvider>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold font-display">Wallet</h1>
            <p className="text-muted-foreground">Manage your earnings and withdrawals.</p>
          </div>
          <Button 
            onClick={() => setShowWithdrawDialog(true)}
            disabled={!canWithdraw}
            className="btn-glow"
          >
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Withdraw Funds
          </Button>
        </div>

        {/* Payout Profile Status Banners */}
        {!payoutLoading && !payoutProfile && (
          <Alert className="border-amber-500/30 bg-amber-500/5">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-500">Bank Details Required</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>Set up your bank account to enable withdrawals and receive your earnings.</span>
              <Button size="sm" asChild>
                <Link to="/seller/payout">
                  Add Bank Details
                  <ExternalLink className="ml-2 h-3 w-3" />
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!payoutLoading && payoutProfile && payoutProfile.verification_status === 'pending' && (
          <Alert className="border-blue-500/30 bg-blue-500/5">
            <Clock className="h-4 w-4 text-blue-500" />
            <AlertTitle className="text-blue-500">Verification Pending</AlertTitle>
            <AlertDescription>
              Your bank details are being verified. Withdrawals will be enabled once verification is complete.
            </AlertDescription>
          </Alert>
        )}

        {!payoutLoading && payoutProfile && payoutProfile.verification_status === 'rejected' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Bank Details Rejected</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>{payoutProfile.rejection_reason || 'Please update your bank details and resubmit.'}</span>
              <Button size="sm" variant="outline" asChild>
                <Link to="/seller/payout">Update Details</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Funds Flow Visualization */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Earnings Flow
            </CardTitle>
            <CardDescription>How your money moves through SongKart</CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            {walletLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="relative">
                {/* Flow Diagram */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  {/* Step 1: Sales */}
                  <div className="text-center p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <Banknote className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Sales</p>
                    <p className="text-xl font-bold">{formatPrice(totalEarnings)}</p>
                    <p className="text-xs text-muted-foreground">Lifetime</p>
                  </div>

                  {/* Arrow */}
                  <div className="hidden md:flex items-center justify-center">
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>

                  {/* Step 2: On Hold */}
                  <div className="text-center p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-2">
                      <Clock className="h-6 w-6 text-amber-500" />
                    </div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">On Hold</p>
                    <p className="text-xl font-bold text-amber-500">{formatPrice(pendingBalance)}</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xs text-muted-foreground cursor-help flex items-center justify-center gap-1">
                          7-day clearance <Info className="h-3 w-3" />
                        </p>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[200px]">
                        <p>Funds are held for 7 days after each sale to allow for any disputes or refund requests.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Arrow */}
                  <div className="hidden md:flex items-center justify-center">
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>

                  {/* Step 3: Available */}
                  <div className="text-center p-4 rounded-xl bg-emerald-500/5 border-2 border-emerald-500/30">
                    <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                      <WalletIcon className="h-6 w-6 text-emerald-500" />
                    </div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Available</p>
                    <p className="text-2xl font-bold text-emerald-500">{formatPrice(availableBalance)}</p>
                    <p className="text-xs text-muted-foreground">Ready to withdraw</p>
                  </div>
                </div>

                {/* Mobile Flow Arrows */}
                <div className="flex md:hidden flex-col items-center my-2 gap-2">
                  <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Clearance Timeline */}
        {pendingClearance && pendingClearance.length > 0 && (
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Timer className="h-5 w-5 text-amber-500" />
                Funds Clearing Soon
              </CardTitle>
              <CardDescription>
                These funds will become available after the 7-day hold period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingClearance.slice(0, 5).map((item) => (
                  <div 
                    key={item.transaction_id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-medium">{formatPrice(item.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          Sale on {format(new Date(item.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "border-amber-500/30",
                          item.days_remaining <= 1 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" : "text-amber-500"
                        )}
                      >
                        {item.days_remaining <= 0 
                          ? 'Clearing soon' 
                          : item.days_remaining === 1 
                            ? '1 day left' 
                            : `${item.days_remaining} days left`
                        }
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Clears {formatDistanceToNow(new Date(item.clears_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
                {pendingClearance.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    +{pendingClearance.length - 5} more transactions clearing
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Withdrawal Progress */}
        <Card className={cn(
          "border-2 transition-colors",
          canWithdraw ? "border-emerald-500/30 bg-emerald-500/5" : "border-border"
        )}>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {canWithdraw ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <h3 className="font-semibold">
                    {canWithdraw ? 'Ready to Withdraw!' : 'Withdrawal Progress'}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {canWithdraw 
                    ? `You have ${formatPrice(availableBalance)} available for withdrawal.`
                    : `You need at least ${currencySymbol}${threshold} to request a withdrawal. Currently ${formatPrice(availableBalance)} available.`
                  }
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress to threshold</span>
                    <span className="font-medium">{formatPrice(availableBalance)} / {currencySymbol}{threshold}</span>
                  </div>
                  <Progress value={progressToWithdrawal} className="h-2" />
                </div>
              </div>
              <Button 
                onClick={() => setShowWithdrawDialog(true)}
                disabled={!canWithdraw}
                size="lg"
                className={cn(canWithdraw && "btn-glow")}
              >
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Withdrawal History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawalsLoading ? (
                    [...Array(3)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(5)].map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : withdrawals?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <div className="p-3 rounded-full bg-muted">
                            <WalletIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <p className="text-muted-foreground">No withdrawal requests yet</p>
                          <p className="text-xs text-muted-foreground">
                            Your withdrawal history will appear here
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    withdrawals?.map((wd) => (
                      <TableRow key={wd.id}>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(wd.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatPrice(Number(wd.amount))}
                        </TableCell>
                        <TableCell className="capitalize">
                          <Badge variant="secondary">{wd.payout_method || '-'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge 
                                variant="outline" 
                                className={cn("capitalize", statusColors[wd.status || 'pending'])}
                              >
                                {wd.status || 'pending'}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {statusDescriptions[wd.status || 'pending']}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {wd.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal Dialog */}
        <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <WalletIcon className="h-5 w-5 text-primary" />
                Request Withdrawal
              </DialogTitle>
              <DialogDescription>
                Available balance: <span className="font-semibold text-emerald-500">{formatPrice(availableBalance)}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ({currencySymbol})</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min={threshold}
                  max={availableBalance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter amount"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum: {currencySymbol}{threshold} • Maximum: {formatPrice(availableBalance)}
                </p>
                {withdrawAmount && parseFloat(withdrawAmount) < threshold && (
                  <p className="text-sm text-destructive">
                    Amount must be at least {currencySymbol}{threshold}
                  </p>
                )}
                {withdrawAmount && parseFloat(withdrawAmount) > availableBalance && (
                  <p className="text-sm text-destructive">
                    Amount exceeds available balance
                  </p>
                )}
              </div>

              {/* Saved Bank Details */}
              {payoutProfile && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-start gap-2">
                    <Banknote className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-foreground mb-1">Bank Account</p>
                      <p className="text-muted-foreground">{payoutProfile.bank_name}</p>
                      <p className="text-muted-foreground">
                        A/C: ••••{payoutProfile.account_number_last4}
                      </p>
                      <p className="text-muted-foreground text-xs mt-1">
                        IFSC: {payoutProfile.ifsc_code}
                      </p>
                    </div>
                  </div>
                  <Button variant="link" size="sm" asChild className="mt-2 h-auto p-0">
                    <Link to="/seller/payout">Change bank account</Link>
                  </Button>
                </div>
              )}

              <Separator />

              {/* Confirmation Info */}
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Processing Time</p>
                    <p>Withdrawals are typically processed within 3-5 business days after approval.</p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWithdrawDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleWithdrawalRequest}
                disabled={
                  requestWithdrawal.isPending || 
                  !withdrawAmount || 
                  !payoutProfile ||
                  parseFloat(withdrawAmount) < threshold ||
                  parseFloat(withdrawAmount) > availableBalance
                }
                className="btn-glow"
              >
                {requestWithdrawal.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                )}
                Request Withdrawal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
