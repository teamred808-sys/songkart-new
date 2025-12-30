import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  useAllPayoutProfiles, 
  useVerifyPayoutProfile, 
  useLockPayoutProfile 
} from '@/hooks/usePayoutProfile';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Lock, 
  Unlock,
  Building2,
  AlertCircle,
  ShieldCheck,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'verified':
      return <Badge className="bg-green-500/10 text-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Verified</Badge>;
    case 'pending':
      return <Badge className="bg-amber-500/10 text-amber-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    case 'rejected':
      return <Badge className="bg-red-500/10 text-red-600"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    default:
      return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Unknown</Badge>;
  }
}

export default function PayoutVerification() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>('pending');
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionType, setActionType] = useState<'verify' | 'reject' | null>(null);

  const { data: profiles, isLoading } = useAllPayoutProfiles({ 
    status: statusFilter === 'all' ? undefined : statusFilter 
  });
  const verifyProfile = useVerifyPayoutProfile();
  const lockProfile = useLockPayoutProfile();

  const handleAction = async () => {
    if (!selectedProfile || !actionType) return;
    
    await verifyProfile.mutateAsync({
      profileId: selectedProfile.id,
      action: actionType,
      reason: actionType === 'reject' ? rejectReason : undefined,
    });

    setSelectedProfile(null);
    setActionType(null);
    setRejectReason('');
  };

  const handleLock = async (profile: any, lock: boolean) => {
    await lockProfile.mutateAsync({
      profileId: profile.id,
      lock,
      reason: lock ? 'Locked by admin for review' : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Payout Verification
          </h1>
          <p className="text-muted-foreground">
            Review and verify seller bank details
          </p>
        </div>
        <Select 
          value={statusFilter || 'all'} 
          onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Profiles</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
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
                <TableHead>Bank Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                  </TableRow>
                ))
              ) : profiles?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No payout profiles found
                  </TableCell>
                </TableRow>
              ) : (
                profiles?.map((profile: any) => (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile.profiles?.avatar_url || ''} />
                          <AvatarFallback>
                            {profile.profiles?.full_name?.charAt(0) || 'S'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{profile.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{profile.profiles?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{profile.bank_name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-mono">****{profile.account_number_last4}</span>
                          <span className="mx-2">•</span>
                          <span className="font-mono">{profile.ifsc_code}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {profile.account_holder_name} • {profile.account_type}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <StatusBadge status={profile.verification_status} />
                        {profile.is_locked && (
                          <Badge variant="outline" className="text-orange-500 border-orange-500/30">
                            <Lock className="w-3 h-3 mr-1" />Locked
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(profile.created_at), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(profile.created_at), 'HH:mm')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {profile.verification_status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600 hover:bg-green-500/10"
                              onClick={() => {
                                setSelectedProfile(profile);
                                setActionType('verify');
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-500/10"
                              onClick={() => {
                                setSelectedProfile(profile);
                                setActionType('reject');
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleLock(profile, !profile.is_locked)}
                          disabled={lockProfile.isPending}
                        >
                          {profile.is_locked ? (
                            <><Unlock className="h-4 w-4 mr-1" />Unlock</>
                          ) : (
                            <><Lock className="h-4 w-4 mr-1" />Lock</>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog 
        open={!!selectedProfile && !!actionType} 
        onOpenChange={() => {
          setSelectedProfile(null);
          setActionType(null);
          setRejectReason('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'verify' ? 'Verify Payout Profile' : 'Reject Payout Profile'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'verify' 
                ? 'This will allow the seller to request withdrawals to this bank account.'
                : 'Please provide a reason for rejection so the seller can update their details.'
              }
            </DialogDescription>
          </DialogHeader>

          {selectedProfile && (
            <div className="py-4 space-y-3">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={selectedProfile.profiles?.avatar_url || ''} />
                  <AvatarFallback>{selectedProfile.profiles?.full_name?.charAt(0) || 'S'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedProfile.profiles?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedProfile.profiles?.email}</p>
                </div>
              </div>
              
              <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                <p><strong>Bank:</strong> {selectedProfile.bank_name}</p>
                <p><strong>Account:</strong> ****{selectedProfile.account_number_last4}</p>
                <p><strong>IFSC:</strong> {selectedProfile.ifsc_code}</p>
                <p><strong>Holder:</strong> {selectedProfile.account_holder_name}</p>
              </div>

              {actionType === 'reject' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rejection Reason *</label>
                  <Textarea
                    placeholder="e.g., Invalid IFSC code, Name mismatch..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedProfile(null);
              setActionType(null);
              setRejectReason('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={verifyProfile.isPending || (actionType === 'reject' && !rejectReason.trim())}
              variant={actionType === 'verify' ? 'default' : 'destructive'}
            >
              {verifyProfile.isPending ? 'Processing...' : actionType === 'verify' ? 'Verify' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
