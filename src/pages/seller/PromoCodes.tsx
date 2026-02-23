import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tag, Plus, Percent, IndianRupee } from 'lucide-react';
import { usePromoCodes, useCreatePromoCode, useUpdatePromoCode } from '@/hooks/usePromoCodes';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Price } from '@/components/ui/Price';

export default function PromoCodes() {
  const { user } = useAuth();
  const { data: promoCodes, isLoading } = usePromoCodes('seller');
  const createPromo = useCreatePromoCode();
  const updatePromo = useUpdatePromoCode();
  const [open, setOpen] = useState(false);

  // Form state
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [songId, setSongId] = useState<string>('');
  const [licenseType, setLicenseType] = useState<string>('');
  const [usageLimit, setUsageLimit] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  // Fetch seller's songs for dropdown
  const { data: songs } = useQuery({
    queryKey: ['seller-songs-for-promo', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('songs')
        .select('id, title')
        .eq('seller_id', user.id)
        .eq('status', 'approved')
        .order('title');
      return data || [];
    },
    enabled: !!user,
  });

  const handleCreate = () => {
    createPromo.mutate({
      code,
      creator_role: 'seller',
      discount_type: discountType,
      discount_value: Number(discountValue),
      song_id: songId || null,
      license_type: licenseType || null,
      usage_limit: usageLimit ? Number(usageLimit) : null,
      expires_at: expiresAt || null,
    }, {
      onSuccess: () => {
        setOpen(false);
        resetForm();
      },
    });
  };

  const resetForm = () => {
    setCode('');
    setDiscountType('percentage');
    setDiscountValue('');
    setSongId('');
    setLicenseType('');
    setUsageLimit('');
    setExpiresAt('');
  };

  const toggleActive = (id: string, currentStatus: boolean) => {
    updatePromo.mutate({ id, is_active: !currentStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Promo Codes</h1>
          <p className="text-muted-foreground">Create discount codes for your songs</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Create Promo Code</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Promo Code</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Code</Label>
                <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. SAVE20" maxLength={20} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Discount Type</Label>
                  <Select value={discountType} onValueChange={(v: 'percentage' | 'flat') => setDiscountType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value</Label>
                  <Input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder={discountType === 'percentage' ? '10' : '100'} min="1" />
                </div>
              </div>
              <div>
                <Label>Song (optional)</Label>
                <Select value={songId} onValueChange={setSongId}>
                  <SelectTrigger><SelectValue placeholder="All songs" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Songs</SelectItem>
                    {songs?.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>License Tier (optional)</Label>
                <Select value={licenseType} onValueChange={setLicenseType}>
                  <SelectTrigger><SelectValue placeholder="All tiers" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="exclusive">Exclusive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Usage Limit (optional)</Label>
                  <Input type="number" value={usageLimit} onChange={e => setUsageLimit(e.target.value)} placeholder="Unlimited" min="1" />
                </div>
                <div>
                  <Label>Expiry Date (optional)</Label>
                  <Input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleCreate} disabled={!code || !discountValue || createPromo.isPending} className="w-full">
                {createPromo.isPending ? 'Creating...' : 'Create Promo Code'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5" />Your Promo Codes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !promoCodes?.length ? (
            <p className="text-center text-muted-foreground py-8">No promo codes yet. Create one to get started!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoCodes.map(promo => (
                  <TableRow key={promo.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono font-bold">{promo.code}</span>
                        <div className="flex gap-1 mt-1">
                          {promo.license_type && <Badge variant="outline" className="text-xs">{promo.license_type}</Badge>}
                          {promo.song_id && <Badge variant="secondary" className="text-xs">Song-specific</Badge>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {promo.discount_type === 'percentage' ? (
                          <><Percent className="h-3 w-3" />{promo.discount_value}%</>
                        ) : (
                          <><IndianRupee className="h-3 w-3" />{promo.discount_value}</>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{promo.usage_count}{promo.usage_limit ? ` / ${promo.usage_limit}` : ''}</TableCell>
                    <TableCell>{promo.expires_at ? format(new Date(promo.expires_at), 'MMM d, yyyy') : 'Never'}</TableCell>
                    <TableCell>
                      <Switch checked={promo.is_active} onCheckedChange={() => toggleActive(promo.id, promo.is_active)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
