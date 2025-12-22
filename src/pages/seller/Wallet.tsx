import { useState } from 'react';
import { useSellerWallet, useWithdrawalRequests, useRequestWithdrawal } from '@/hooks/useSellerData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Wallet as WalletIcon, TrendingUp, Clock, ArrowUpRight, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  pending: 'bg-warning/20 text-warning border-warning/30',
  approved: 'bg-accent/20 text-accent border-accent/30',
  processed: 'bg-success/20 text-success border-success/30',
  rejected: 'bg-destructive/20 text-destructive border-destructive/30',
};

export default function Wallet() {
  const { data: wallet, isLoading: walletLoading } = useSellerWallet();
  const { data: withdrawals, isLoading: withdrawalsLoading } = useWithdrawalRequests();
  const requestWithdrawal = useRequestWithdrawal();

  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('');
  const [accountDetails, setAccountDetails] = useState('');

  const handleWithdrawalRequest = () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0 || !payoutMethod) return;

    requestWithdrawal.mutate({
      amount,
      payout_method: payoutMethod,
      payout_details: { account: accountDetails },
    }, {
      onSuccess: () => {
        setShowWithdrawDialog(false);
        setWithdrawAmount('');
        setPayoutMethod('');
        setAccountDetails('');
      },
    });
  };

  const availableBalance = Number(wallet?.available_balance || 0);
  const pendingBalance = Number(wallet?.pending_balance || 0);
  const totalEarnings = Number(wallet?.total_earnings || 0);
  const threshold = Number(wallet?.withdrawal_threshold || 50);

  const canWithdraw = availableBalance >= threshold;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold font-display">Wallet</h1>
        <p className="text-muted-foreground">Manage your earnings and withdrawals.</p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            {walletLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Earnings</span>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <p className="text-2xl font-bold font-display">${totalEarnings.toFixed(2)}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-success/30">
          <CardContent className="p-4">
            {walletLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Available Balance</span>
                  <WalletIcon className="h-4 w-4 text-success" />
                </div>
                <p className="text-2xl font-bold font-display text-success">
                  ${availableBalance.toFixed(2)}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            {walletLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">On Hold</span>
                  <Clock className="h-4 w-4 text-warning" />
                </div>
                <p className="text-2xl font-bold font-display">${pendingBalance.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">Pending clearance</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            {walletLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Min. Withdrawal</span>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold font-display">${threshold.toFixed(2)}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Withdraw Button */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Request Withdrawal</CardTitle>
          <CardDescription>
            {canWithdraw 
              ? 'You can request a withdrawal of your available balance.'
              : `You need at least $${threshold} to request a withdrawal.`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setShowWithdrawDialog(true)}
            disabled={!canWithdraw}
            className="btn-glow"
          >
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Withdraw Funds
          </Button>
        </CardContent>
      </Card>

      {/* Withdrawal History */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Withdrawal History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
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
                        <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : withdrawals?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No withdrawal requests yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  withdrawals?.map((wd) => (
                    <TableRow key={wd.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(wd.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${Number(wd.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="capitalize">
                        {wd.payout_method || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn("capitalize", statusColors[wd.status || 'pending'])}
                        >
                          {wd.status || 'pending'}
                        </Badge>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
            <DialogDescription>
              Available balance: ${availableBalance.toFixed(2)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                max={availableBalance}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>

            <div className="space-y-2">
              <Label>Payout Method</Label>
              <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">Account Details</Label>
              <Input
                id="account"
                value={accountDetails}
                onChange={(e) => setAccountDetails(e.target.value)}
                placeholder="Account number, email, or UPI ID"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdrawDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleWithdrawalRequest}
              disabled={requestWithdrawal.isPending || !withdrawAmount || !payoutMethod}
            >
              {requestWithdrawal.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Request Withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
