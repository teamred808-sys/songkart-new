import { useState } from 'react';
import { useAllWithdrawals, useProcessWithdrawal } from '@/hooks/useAdminData';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Banknote } from 'lucide-react';
import { format } from 'date-fns';

export default function WithdrawalManagement() {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'processed' | 'rejected' | undefined>('pending');
  const { data: withdrawals, isLoading } = useAllWithdrawals({ status: statusFilter });
  const processWithdrawal = useProcessWithdrawal();

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = { pending: 'bg-yellow-500/10 text-yellow-500', approved: 'bg-blue-500/10 text-blue-500', processed: 'bg-green-500/10 text-green-500', rejected: 'bg-red-500/10 text-red-500' };
    return <Badge className={colors[status] || 'bg-muted'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Withdrawals</h1><p className="text-muted-foreground">Manage seller payout requests</p></div>
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
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : withdrawals?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No withdrawals</TableCell></TableRow>
              ) : withdrawals?.map((w: any) => (
                <TableRow key={w.id}>
                  <TableCell><div><p className="font-medium">{w.profiles?.full_name}</p><p className="text-xs text-muted-foreground">{w.profiles?.email}</p></div></TableCell>
                  <TableCell className="font-bold">₹{w.amount}</TableCell>
                  <TableCell>{w.payout_method || '-'}</TableCell>
                  <TableCell><Badge variant="outline">{w.profiles?.kyc_status || 'pending'}</Badge></TableCell>
                  <TableCell>{statusBadge(w.status)}</TableCell>
                  <TableCell>{format(new Date(w.created_at), 'MMM dd, yyyy')}</TableCell>
                  <TableCell className="text-right">
                    {w.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="text-green-500" onClick={() => processWithdrawal.mutate({ withdrawalId: w.id, status: 'approved' })}><CheckCircle className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => processWithdrawal.mutate({ withdrawalId: w.id, status: 'rejected', notes: 'Rejected by admin' })}><XCircle className="h-4 w-4" /></Button>
                      </div>
                    )}
                    {w.status === 'approved' && (
                      <Button size="sm" onClick={() => processWithdrawal.mutate({ withdrawalId: w.id, status: 'processed', paymentReference: `PAY-${Date.now()}` })}><Banknote className="mr-2 h-4 w-4" />Process</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
