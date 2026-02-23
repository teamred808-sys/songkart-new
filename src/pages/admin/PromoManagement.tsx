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
import { format } from 'date-fns';

export default function PromoManagement() {
  const { data: promoCodes, isLoading } = usePromoCodes('admin');
  const createPromo = useCreatePromoCode();
  const updatePromo = useUpdatePromoCode();
  const [open, setOpen] = useState(false);

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [licenseType, setLicenseType] = useState<string>('');
  const [minPurchase, setMinPurchase] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const handleCreate = () => {
    createPromo.mutate({
      code,
      creator_role: 'admin',
      discount_type: discountType,
      discount_value: Number(discountValue),
      license_type: licenseType || null,
      min_purchase_amount: minPurchase ? Number(minPurchase) : 0,
      usage_limit: usageLimit ? Number(usageLimit) : null,
      expires_at: expiresAt || null,
    }, {
      onSuccess: () => {
        setOpen(false);
        setCode(''); setDiscountValue(''); setLicenseType(''); setMinPurchase(''); setUsageLimit(''); setExpiresAt('');
      },
    });
  };

  const toggleActive = (id: string, currentStatus: boolean) => {
    updatePromo.mutate({ id, is_active: !currentStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Promo Codes</h1>
          <p className="text-muted-foreground">Manage platform-wide and seller promo codes</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Create Admin Promo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Admin Promo Code</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Code</Label>
                <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. WELCOME50" maxLength={20} />
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
                  <Input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} min="1" />
                </div>
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
                  <Label>Min Purchase (₹)</Label>
                  <Input type="number" value={minPurchase} onChange={e => setMinPurchase(e.target.value)} placeholder="0" min="0" />
                </div>
                <div>
                  <Label>Usage Limit</Label>
                  <Input type="number" value={usageLimit} onChange={e => setUsageLimit(e.target.value)} placeholder="Unlimited" min="1" />
                </div>
              </div>
              <div>
                <Label>Expiry Date (optional)</Label>
                <Input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
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
          <CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5" />All Promo Codes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !promoCodes?.length ? (
            <p className="text-center text-muted-foreground py-8">No promo codes found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Min Amount</TableHead>
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
                      <Badge variant={promo.creator_role === 'admin' ? 'destructive' : 'default'}>
                        {promo.creator_role}
                      </Badge>
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
                    <TableCell>{promo.min_purchase_amount > 0 ? `₹${promo.min_purchase_amount}` : '—'}</TableCell>
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
