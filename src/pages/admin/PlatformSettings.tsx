import { usePlatformSettings, useUpdatePlatformSetting } from '@/hooks/useAdminData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function PlatformSettings() {
  const { data: settings, isLoading } = usePlatformSettings();
  const updateSetting = useUpdatePlatformSetting();
  const [commissionRate, setCommissionRate] = useState('');

  const handleSave = () => {
    if (commissionRate) updateSetting.mutate({ key: 'commission_rate', value: { rate: Number(commissionRate) } });
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Platform Settings</h1><p className="text-muted-foreground">Configure global platform settings</p></div>
      <Card>
        <CardHeader><CardTitle>Commission Settings</CardTitle><CardDescription>Set global commission rate for transactions</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Commission Rate (%)</Label>
            <Input type="number" placeholder={settings?.commission_rate?.rate || '10'} value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} />
          </div>
          <Button onClick={handleSave} disabled={updateSetting.isPending}>Save Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}
