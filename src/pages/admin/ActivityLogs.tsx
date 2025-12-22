import { useActivityLogs } from '@/hooks/useAdminData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function ActivityLogs() {
  const { data: logs, isLoading } = useActivityLogs({ limit: 100 });

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Activity Logs</h1><p className="text-muted-foreground">Audit trail of admin actions</p></div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : logs?.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No logs</TableCell></TableRow>
              ) : logs?.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground">{format(new Date(log.created_at), 'MMM dd, HH:mm')}</TableCell>
                  <TableCell>{log.profiles?.full_name || 'System'}</TableCell>
                  <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{log.entity_type}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
