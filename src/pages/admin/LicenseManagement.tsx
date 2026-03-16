import { useState } from 'react';
import { useAllLicenses, useRevokeLicense, LicenseDocument } from '@/hooks/useLicenses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  FileText, 
  Ban, 
  Download, 
  Eye, 
  ShieldX,
  CheckCircle,
  XCircle,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  active: 'bg-success/20 text-success border-success/30',
  revoked: 'bg-destructive/20 text-destructive border-destructive/30',
};

const licenseTypeColors: Record<string, string> = {
  personal: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  youtube: 'bg-red-500/20 text-red-600 border-red-500/30',
  commercial: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
  film: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
  exclusive: 'bg-primary/20 text-primary border-primary/30',
};

export default function LicenseManagement() {
  const { data: licenses, isLoading, refetch } = useAllLicenses();
  const revokeLicense = useRevokeLicense();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedLicense, setSelectedLicense] = useState<LicenseDocument | null>(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');

  const filteredLicenses = licenses?.filter(license => {
    const matchesSearch = 
      license.license_number.toLowerCase().includes(search.toLowerCase()) ||
      license.song_title.toLowerCase().includes(search.toLowerCase()) ||
      license.buyer_name.toLowerCase().includes(search.toLowerCase()) ||
      license.seller_name.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || license.status === statusFilter;
    const matchesType = typeFilter === 'all' || license.license_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalActive = licenses?.filter(l => l.status === 'active').length || 0;
  const totalRevoked = licenses?.filter(l => l.status === 'revoked').length || 0;

  const handleRevoke = async () => {
    if (!selectedLicense || !revokeReason.trim()) {
      toast.error('Please provide a reason for revocation');
      return;
    }

    await revokeLicense.mutateAsync({
      licenseDocumentId: selectedLicense.id,
      reason: revokeReason,
    });

    setRevokeDialogOpen(false);
    setSelectedLicense(null);
    setRevokeReason('');
    refetch();
  };

  const handleDownloadLicense = async (license: LicenseDocument) => {
    try {
      const data = await apiFetch('/download-license', {
        method: 'POST',
        body: JSON.stringify({ license_document_id: license.id }),
      });

      if (data?.error) throw new Error(data.error);

      if (data?.download_url) {
        window.open(data.download_url, '_blank');
        toast.success('License download started');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to download license');
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold font-display">License Management</h1>
        <p className="text-muted-foreground">View, search, and manage all platform licenses.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Licenses</span>
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold font-display mt-1">{licenses?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Licenses</span>
              <CheckCircle className="h-4 w-4 text-success" />
            </div>
            <p className="text-2xl font-bold font-display mt-1 text-success">{totalActive}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Revoked Licenses</span>
              <XCircle className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-2xl font-bold font-display mt-1 text-destructive">{totalRevoked}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by license #, song, buyer, seller..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="License Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="personal">Personal</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
            <SelectItem value="film">Film/TV</SelectItem>
            <SelectItem value="exclusive">Exclusive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Licenses Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>License #</TableHead>
              <TableHead>Song</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead>Seller</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(9)].map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredLicenses?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No licenses found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredLicenses?.map((license) => (
                <TableRow key={license.id}>
                  <TableCell className="font-mono text-xs">
                    {license.license_number}
                  </TableCell>
                  <TableCell className="font-medium truncate max-w-[150px]">
                    {license.song_title}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn("capitalize", licenseTypeColors[license.license_type])}
                    >
                      {license.license_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-[120px]">
                    {license.buyer_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-[120px]">
                    {license.seller_name}
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{Number(license.price).toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(license.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn("capitalize", statusColors[license.status])}
                    >
                      {license.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setSelectedLicense(license);
                          setViewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDownloadLicense(license)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {license.status === 'active' && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelectedLicense(license);
                            setRevokeDialogOpen(true);
                          }}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View License Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>License Details</DialogTitle>
            <DialogDescription>
              {selectedLicense?.license_number}
            </DialogDescription>
          </DialogHeader>
          {selectedLicense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Song</p>
                  <p className="font-medium">{selectedLicense.song_title}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">License Type</p>
                  <Badge variant="outline" className={cn("capitalize mt-1", licenseTypeColors[selectedLicense.license_type])}>
                    {selectedLicense.license_type}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Buyer</p>
                  <p className="font-medium">{selectedLicense.buyer_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Seller</p>
                  <p className="font-medium">{selectedLicense.seller_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Price</p>
                  <p className="font-medium">₹{Number(selectedLicense.price).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="outline" className={cn("capitalize mt-1", statusColors[selectedLicense.status])}>
                    {selectedLicense.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{format(new Date(selectedLicense.created_at), 'PPP')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Template Version</p>
                  <p className="font-medium">v{selectedLicense.template_version}</p>
                </div>
              </div>
              
              {selectedLicense.status === 'revoked' && (
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <ShieldX className="h-4 w-4" />
                    <span className="font-medium">License Revoked</span>
                  </div>
                  {selectedLicense.revoked_at && (
                    <p className="text-sm text-muted-foreground">
                      Revoked on {format(new Date(selectedLicense.revoked_at), 'PPP')}
                    </p>
                  )}
                  {selectedLicense.revocation_reason && (
                    <p className="text-sm mt-2">{selectedLicense.revocation_reason}</p>
                  )}
                </div>
              )}

              <div>
                <p className="text-muted-foreground text-xs mb-1">Document Hash (SHA-256)</p>
                <code className="text-xs bg-muted p-2 rounded block break-all">
                  {selectedLicense.document_hash}
                </code>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            {selectedLicense && (
              <Button onClick={() => handleDownloadLicense(selectedLicense)}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke License Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldX className="h-5 w-5" />
              Revoke License
            </DialogTitle>
            <DialogDescription>
              This action will permanently revoke the license and disable download access.
            </DialogDescription>
          </DialogHeader>
          {selectedLicense && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-mono text-sm">{selectedLicense.license_number}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedLicense.song_title} • {selectedLicense.buyer_name}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Reason for Revocation *</label>
                <Textarea
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="Provide a detailed reason for revoking this license..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRevoke}
              disabled={revokeLicense.isPending || !revokeReason.trim()}
            >
              {revokeLicense.isPending ? 'Revoking...' : 'Revoke License'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
