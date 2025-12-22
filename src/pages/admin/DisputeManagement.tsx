import { useAllDisputes, useResolveDispute } from '@/hooks/useAdminData';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function DisputeManagement() {
  const { data: disputes, isLoading } = useAllDisputes();
  const resolveDispute = useResolveDispute();

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = { open: 'bg-red-500/10 text-red-500', in_review: 'bg-yellow-500/10 text-yellow-500', resolved: 'bg-green-500/10 text-green-500', closed: 'bg-muted text-muted-foreground' };
    return <Badge className={colors[status] || 'bg-muted'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Disputes</h1><p className="text-muted-foreground">Manage platform disputes and reports</p></div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reason</TableHead>
                <TableHead>Raised By</TableHead>
                <TableHead>Against</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : disputes?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No disputes</TableCell></TableRow>
              ) : disputes?.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.reason}</TableCell>
                  <TableCell>{d.raised_by_profile?.full_name || '-'}</TableCell>
                  <TableCell>{d.against_profile?.full_name || '-'}</TableCell>
                  <TableCell>{statusBadge(d.status)}</TableCell>
                  <TableCell>{format(new Date(d.created_at), 'MMM dd')}</TableCell>
                  <TableCell className="text-right">
                    {(d.status === 'open' || d.status === 'in_review') && (
                      <Button size="sm" variant="outline" onClick={() => resolveDispute.mutate({ disputeId: d.id, status: 'resolved', resolution: 'Resolved by admin' })}>Resolve</Button>
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
