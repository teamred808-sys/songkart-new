import { useState } from 'react';
import { useAllUsers, useUpdateUserStatus, useVerifyUser } from '@/hooks/useAdminData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, CheckCircle, Ban, UserX } from 'lucide-react';
import { format } from 'date-fns';

export default function UserManagement() {
  const [roleFilter, setRoleFilter] = useState<'admin' | 'seller' | 'buyer' | undefined>();
  const [search, setSearch] = useState('');
  const { data: users, isLoading } = useAllUsers({ role: roleFilter, search });
  const updateStatus = useUpdateUserStatus();
  const verifyUser = useVerifyUser();

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500/10 text-green-500">Active</Badge>;
      case 'suspended': return <Badge className="bg-orange-500/10 text-orange-500">Suspended</Badge>;
      case 'banned': return <Badge className="bg-red-500/10 text-red-500">Banned</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage platform users and accounts</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <CardTitle>Users</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search users..." className="pl-9 w-[200px]" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={roleFilter || 'all'} onValueChange={(v) => setRoleFilter(v === 'all' ? undefined : v as any)}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="All Roles" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="seller">Sellers</SelectItem>
                  <SelectItem value="buyer">Buyers</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : users?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
              ) : users?.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar><AvatarImage src={user.avatar_url} /><AvatarFallback>{user.full_name?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                      <div><p className="font-medium">{user.full_name || 'Unknown'}</p><p className="text-xs text-muted-foreground">{user.email}</p></div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{user.user_roles?.[0]?.role || 'buyer'}</Badge></TableCell>
                  <TableCell>{statusBadge(user.account_status || 'active')}</TableCell>
                  <TableCell>{user.is_verified ? <CheckCircle className="h-4 w-4 text-blue-500" /> : <span className="text-muted-foreground">-</span>}</TableCell>
                  <TableCell>{format(new Date(user.created_at), 'MMM dd, yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => verifyUser.mutate({ userId: user.id, verified: !user.is_verified })}>{user.is_verified ? 'Remove Verification' : 'Verify User'}</DropdownMenuItem>
                        {user.account_status !== 'suspended' && <DropdownMenuItem onClick={() => updateStatus.mutate({ userId: user.id, status: 'suspended' })}><UserX className="mr-2 h-4 w-4" />Suspend</DropdownMenuItem>}
                        {user.account_status !== 'banned' && <DropdownMenuItem className="text-red-500" onClick={() => updateStatus.mutate({ userId: user.id, status: 'banned' })}><Ban className="mr-2 h-4 w-4" />Ban</DropdownMenuItem>}
                        {user.account_status !== 'active' && <DropdownMenuItem onClick={() => updateStatus.mutate({ userId: user.id, status: 'active' })}>Activate</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
