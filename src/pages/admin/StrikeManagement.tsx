import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Shield, ShieldAlert, ShieldCheck, ShieldX,
  Plus, RotateCcw, UserCheck, Search, Filter,
  AlertTriangle, Clock, FileText, Users
} from "lucide-react";
import { 
  useAllStrikesAdmin, 
  useAllSellerHealthAdmin, 
  useIssueStrike, 
  useReverseStrike, 
  useRestoreAccount 
} from "@/hooks/useStrikeSystem";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function StrikeManagement() {
  const [filters, setFilters] = useState<{ status?: string; strike_type?: string }>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [reverseDialogOpen, setReverseDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedStrike, setSelectedStrike] = useState<any>(null);
  const [selectedSeller, setSelectedSeller] = useState<any>(null);

  // Form states
  const [newStrike, setNewStrike] = useState({
    seller_id: "",
    strike_type: "community" as "community" | "copyright",
    reason: "",
    details: "",
  });
  const [reversalReason, setReversalReason] = useState("");
  const [restoreNotes, setRestoreNotes] = useState("");

  const { data: strikes = [], isLoading: strikesLoading } = useAllStrikesAdmin(filters);
  const { data: sellerHealth = [], isLoading: healthLoading } = useAllSellerHealthAdmin();
  const { mutate: issueStrike, isPending: issuePending } = useIssueStrike();
  const { mutate: reverseStrike, isPending: reversePending } = useReverseStrike();
  const { mutate: restoreAccount, isPending: restorePending } = useRestoreAccount();

  const handleIssueStrike = () => {
    issueStrike(newStrike, {
      onSuccess: () => {
        setIssueDialogOpen(false);
        setNewStrike({ seller_id: "", strike_type: "community", reason: "", details: "" });
      }
    });
  };

  const handleReverseStrike = () => {
    if (!selectedStrike) return;
    reverseStrike({ strike_id: selectedStrike.id, reason: reversalReason }, {
      onSuccess: () => {
        setReverseDialogOpen(false);
        setSelectedStrike(null);
        setReversalReason("");
      }
    });
  };

  const handleRestoreAccount = () => {
    if (!selectedSeller) return;
    restoreAccount({ seller_id: selectedSeller.seller_id, notes: restoreNotes }, {
      onSuccess: () => {
        setRestoreDialogOpen(false);
        setSelectedSeller(null);
        setRestoreNotes("");
      }
    });
  };

  const getHealthBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-500">Excellent</Badge>;
    if (score >= 70) return <Badge className="bg-amber-500">Good</Badge>;
    if (score >= 50) return <Badge className="bg-orange-500">Caution</Badge>;
    return <Badge variant="destructive">Critical</Badge>;
  };

  const filteredStrikes = strikes.filter(strike => {
    if (!searchTerm) return true;
    const seller = strike.seller as any;
    return seller?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           seller?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           strike.reason.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Stats
  const activeStrikes = strikes.filter(s => s.status === 'active').length;
  const frozenAccounts = sellerHealth.filter(h => h.is_frozen).length;
  const deactivatedAccounts = sellerHealth.filter(h => h.is_deactivated).length;
  const pendingAppeals = strikes.filter(s => s.appeal_status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Strike Management</h1>
            <p className="text-muted-foreground">Manage seller strikes and account health</p>
          </div>
          <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Issue Strike
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Issue New Strike</DialogTitle>
                <DialogDescription>
                  Issue a strike to a seller for policy violations
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Seller ID</Label>
                  <Input
                    placeholder="Enter seller UUID"
                    value={newStrike.seller_id}
                    onChange={(e) => setNewStrike({ ...newStrike, seller_id: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Strike Type</Label>
                  <Select
                    value={newStrike.strike_type}
                    onValueChange={(value: "community" | "copyright") => 
                      setNewStrike({ ...newStrike, strike_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="community">Community Guidelines</SelectItem>
                      <SelectItem value="copyright">Copyright Violation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Reason</Label>
                  <Input
                    placeholder="Brief reason for the strike"
                    value={newStrike.reason}
                    onChange={(e) => setNewStrike({ ...newStrike, reason: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Details (Optional)</Label>
                  <Textarea
                    placeholder="Additional details..."
                    value={newStrike.details}
                    onChange={(e) => setNewStrike({ ...newStrike, details: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIssueDialogOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleIssueStrike} 
                  disabled={issuePending || !newStrike.seller_id || !newStrike.reason}
                >
                  {issuePending ? 'Issuing...' : 'Issue Strike'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeStrikes}</p>
                  <p className="text-sm text-muted-foreground">Active Strikes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-amber-100 text-amber-600">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{frozenAccounts}</p>
                  <p className="text-sm text-muted-foreground">Frozen Accounts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-red-100 text-red-600">
                  <ShieldX className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{deactivatedAccounts}</p>
                  <p className="text-sm text-muted-foreground">Deactivated</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingAppeals}</p>
                  <p className="text-sm text-muted-foreground">Pending Appeals</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="strikes">
          <TabsList>
            <TabsTrigger value="strikes">All Strikes</TabsTrigger>
            <TabsTrigger value="health">Seller Health</TabsTrigger>
            <TabsTrigger value="appeals">Pending Appeals</TabsTrigger>
          </TabsList>

          {/* Strikes Tab */}
          <TabsContent value="strikes" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by seller or reason..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) => setFilters({ ...filters, status: value === "all" ? undefined : value })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="reversed">Reversed</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.strike_type || "all"}
                onValueChange={(value) => setFilters({ ...filters, strike_type: value === "all" ? undefined : value })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                  <SelectItem value="copyright">Copyright</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Strikes Table */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seller</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {strikesLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredStrikes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No strikes found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStrikes.map((strike) => {
                      const seller = strike.seller as any;
                      return (
                        <TableRow key={strike.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>{seller?.full_name?.[0] || 'S'}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{seller?.full_name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{seller?.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={strike.strike_type === 'copyright' ? 'destructive' : 'secondary'}>
                              {strike.strike_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{strike.reason}</TableCell>
                          <TableCell>
                            <Badge variant={
                              strike.status === 'active' ? 'default' :
                              strike.status === 'reversed' ? 'outline' : 'secondary'
                            }>
                              {strike.status}
                            </Badge>
                            {strike.appeal_status === 'pending' && (
                              <Badge variant="outline" className="ml-1">Appeal</Badge>
                            )}
                          </TableCell>
                          <TableCell>{format(new Date(strike.created_at), 'PP')}</TableCell>
                          <TableCell>
                            {strike.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedStrike(strike);
                                  setReverseDialogOpen(true);
                                }}
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Reverse
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Seller Health Tab */}
          <TabsContent value="health">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seller</TableHead>
                    <TableHead>Health Score</TableHead>
                    <TableHead>Community</TableHead>
                    <TableHead>Copyright</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {healthLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : sellerHealth.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No seller health records
                      </TableCell>
                    </TableRow>
                  ) : (
                    sellerHealth.map((health) => {
                      const seller = health.seller as any;
                      return (
                        <TableRow key={health.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={seller?.avatar_url} />
                                <AvatarFallback>{seller?.full_name?.[0] || 'S'}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{seller?.full_name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{seller?.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{health.health_score}%</span>
                              {getHealthBadge(health.health_score)}
                            </div>
                          </TableCell>
                          <TableCell>{health.community_strikes_active}/3</TableCell>
                          <TableCell>{health.copyright_strikes_active}/3</TableCell>
                          <TableCell>
                            {health.is_deactivated ? (
                              <Badge variant="destructive">Deactivated</Badge>
                            ) : health.is_frozen ? (
                              <Badge className="bg-amber-500">Frozen</Badge>
                            ) : (
                              <Badge variant="outline">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {(health.is_frozen || health.is_deactivated) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedSeller(health);
                                  setRestoreDialogOpen(true);
                                }}
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                Restore
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Appeals Tab */}
          <TabsContent value="appeals">
            <Card>
              <CardHeader>
                <CardTitle>Pending Appeals</CardTitle>
                <CardDescription>Review and respond to strike appeals</CardDescription>
              </CardHeader>
              <CardContent>
                {strikes.filter(s => s.appeal_status === 'pending').length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending appeals
                  </div>
                ) : (
                  <div className="space-y-4">
                    {strikes.filter(s => s.appeal_status === 'pending').map((strike) => {
                      const seller = strike.seller as any;
                      return (
                        <Card key={strike.id} className="border-l-4 border-l-blue-500">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant={strike.strike_type === 'copyright' ? 'destructive' : 'secondary'}>
                                  {strike.strike_type}
                                </Badge>
                                <span className="font-medium">{seller?.full_name || 'Unknown Seller'}</span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(strike.appeal_submitted_at!), 'PPP')}
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <p className="text-sm font-medium">Original Strike Reason:</p>
                              <p className="text-sm text-muted-foreground">{strike.reason}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Appeal Reason:</p>
                              <p className="text-sm text-muted-foreground">{strike.appeal_reason}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedStrike(strike);
                                  setReverseDialogOpen(true);
                                }}
                              >
                                Approve Appeal (Reverse Strike)
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Reverse Strike Dialog */}
        <Dialog open={reverseDialogOpen} onOpenChange={setReverseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reverse Strike</DialogTitle>
              <DialogDescription>
                This will reverse the strike and improve the seller's health score.
              </DialogDescription>
            </DialogHeader>
            <div>
              <Label>Reason for reversal</Label>
              <Textarea
                placeholder="Explain why this strike is being reversed..."
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReverseDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleReverseStrike} disabled={reversePending || !reversalReason.trim()}>
                {reversePending ? 'Reversing...' : 'Reverse Strike'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Restore Account Dialog */}
        <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Restore Account</DialogTitle>
              <DialogDescription>
                This will restore the seller's account, unfreeze/reactivate it, and reverse all active strikes.
              </DialogDescription>
            </DialogHeader>
            <div>
              <Label>Restoration notes</Label>
              <Textarea
                placeholder="Explain why this account is being restored..."
                value={restoreNotes}
                onChange={(e) => setRestoreNotes(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleRestoreAccount} disabled={restorePending || !restoreNotes.trim()}>
                {restorePending ? 'Restoring...' : 'Restore Account'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
