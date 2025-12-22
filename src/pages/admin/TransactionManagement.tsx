import { useAllTransactions } from '@/hooks/useAdminData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { format } from 'date-fns';

export default function TransactionManagement() {
  const { data: transactions, isLoading } = useAllTransactions();

  const exportToCSV = () => {
    if (!transactions) return;
    const csv = [
      ['ID', 'Date', 'Song', 'Buyer', 'Seller', 'Amount', 'Commission', 'Net', 'Status'].join(','),
      ...transactions.map((t: any) => [
        t.id, format(new Date(t.created_at), 'yyyy-MM-dd'), t.songs?.title, t.buyer?.full_name, t.seller?.full_name, t.amount, t.commission_amount, t.seller_amount, t.payment_status
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Transactions</h1><p className="text-muted-foreground">View all platform transactions</p></div>
        <Button onClick={exportToCSV}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Song</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : transactions?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No transactions</TableCell></TableRow>
              ) : transactions?.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.songs?.title || '-'}</TableCell>
                  <TableCell>{t.buyer?.full_name || '-'}</TableCell>
                  <TableCell>{t.seller?.full_name || '-'}</TableCell>
                  <TableCell>₹{t.amount}</TableCell>
                  <TableCell>₹{t.commission_amount}</TableCell>
                  <TableCell><Badge className={t.payment_status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}>{t.payment_status}</Badge></TableCell>
                  <TableCell>{format(new Date(t.created_at), 'MMM dd, yyyy')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
