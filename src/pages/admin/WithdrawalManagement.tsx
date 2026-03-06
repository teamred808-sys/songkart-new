import { useState } from 'react';
import { useAllWithdrawals, useProcessWithdrawal, useReleaseFunds, useProcessPayout, useInstantReleaseFunds, useAllUsers } from '@/hooks/useAdminData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Banknote, Clock, Loader2, RefreshCw, Send, AlertCircle, Zap } from 'lucide-react';
import { format } from 'date-fns';

export default function WithdrawalManagement() {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'processed' | 'rejected' | undefined>('pending');
  const { data: withdrawals, isLoading } = useAllWithdrawals({ status: statusFilter });
  const processWithdrawal = useProcessWithdrawal();
  const releaseFunds = useReleaseFunds();
  const processPayout = useProcessPayout();
  const instantRelease = useInstantReleaseFunds();
  
  const [instantReleaseOpen, setInstantReleaseOpen] = useState(false);
  const [sellerSearch, setSellerSearch] = useState('');
  const { data: sellers } = useAllUsers({ role: 'seller', search: sellerSearch || undefined });

  const handleInstantRelease = (sellerId: string) => {
    instantRelease.mutate(sellerId, {
      onSuccess: () => setInstantReleaseOpen(false)
    });
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = { 
      pending: 'bg-yellow-500/10 text-yellow-500', 
      approved: 'bg-blue-500/10 text-blue-500', 
      processed: 'bg-green-500/10 text-green-500', 
      rejected: 'bg-red-500/10 text-red-500' 
    };
    return <Badge className={colors[status] || 'bg-muted'}>{status}</Badge>;
  };

  const cashfreeStatusBadge = (cashfreeStatus: string | null) => {
    if (!cashfreeStatus) return null;
    const colors: Record<string, string> = {
      SUCCESS: 'bg-green-500/10 text-green-500',
      PENDING: 'bg-yellow-500/10 text-yellow-500',
      FAILED: 'bg-red-500/10 text-red-500',
    };
    return (
      <Badge variant="outline" className={colors[cashfreeStatus] || 'bg-muted'}>
        CF: {cashfreeStatus}
      </Badge>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Withdrawals</h1>
            <p className="text-muted-foreground">Manage seller payout requests</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Instant Release Dialog */}
            <Dialog open={instantReleaseOpen} onOpenChange={setInstantReleaseOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-amber-500/50 text-amber-600 hover:bg-amber-500/10">
                  <Zap className="mr-2 h-4 w-4" />
                  Instant Release
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Instant Fund Release</DialogTitle>
                  <DialogDescription>
                    Immediately release all pending (held) funds for a specific seller, bypassing the hold period.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Search Seller</Label>
                    <Input 
                      placeholder="Search by name or email..." 
                      value={sellerSearch}
                      onChange={(e) => setSellerSearch(e.target.value)}
                    />
                  </div>
                  {sellerSearch && sellers && sellers.length > 0 && (
                    <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-2">
                      {sellers.slice(0, 10).map((seller: any) => (
                        <div key={seller.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                          <div>
                            <p className="font-medium text-sm">{seller.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{seller.email}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleInstantRelease(seller.id)}
                            disabled={instantRelease.isPending}
                          >
                            {instantRelease.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Zap className="mr-1 h-3 w-3" />
                                Release
                              </>
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {sellerSearch && sellers?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No sellers found</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  onClick={() => releaseFunds.mutate()}
                  disabled={releaseFunds.isPending}
                >
                  {releaseFunds.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Release Cleared Funds
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Move funds past the hold period from pending to available balance</p>
              </TooltipContent>
            </Tooltip>
            <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : v as any)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seller</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>KYC</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payout Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : withdrawals?.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No withdrawals</TableCell></TableRow>
                ) : withdrawals?.map((w: any) => (
                  <TableRow key={w.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{w.profiles?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{w.profiles?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">₹{w.amount}</TableCell>
                    <TableCell>{w.payout_method || '-'}</TableCell>
                    <TableCell><Badge variant="outline">{w.profiles?.kyc_status || 'pending'}</Badge></TableCell>
                    <TableCell>{statusBadge(w.status)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {cashfreeStatusBadge(w.cashfree_status)}
                        {w.payment_reference && (
                          <span className="text-xs text-muted-foreground">UTR: {w.payment_reference}</span>
                        )}
                        {w.failure_reason && (
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Failed
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{w.failure_reason}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(w.created_at), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      {w.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-green-500" 
                                onClick={() => processWithdrawal.mutate({ withdrawalId: w.id, status: 'approved' })}
                                disabled={processWithdrawal.isPending}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Approve</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-red-500" 
                                onClick={() => processWithdrawal.mutate({ withdrawalId: w.id, status: 'rejected', notes: 'Rejected by admin' })}
                                disabled={processWithdrawal.isPending}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Reject</TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                      {w.status === 'approved' && (
                        <div className="flex justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => processPayout.mutate(w.id)}
                                disabled={processPayout.isPending}
                              >
                                {processPayout.isPending ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="mr-2 h-4 w-4" />
                                )}
                                Auto Disburse
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Initiate bank transfer via Cashfree</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="sm" 
                                onClick={() => processWithdrawal.mutate({ withdrawalId: w.id, status: 'processed', paymentReference: `MANUAL-${Date.now()}` })}
                                disabled={processWithdrawal.isPending}
                              >
                                <Banknote className="mr-2 h-4 w-4" />
                                Manual
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Mark as manually processed</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
