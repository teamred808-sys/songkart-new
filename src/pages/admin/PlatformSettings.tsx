import { usePlatformSettings, useUpdatePlatformSetting } from '@/hooks/useAdminData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';

export default function PlatformSettings() {
  const { data: settings, isLoading } = usePlatformSettings();
  const updateSetting = useUpdatePlatformSetting();
  const [commissionRate, setCommissionRate] = useState('');

  // Initialize commission rate from settings when data loads
  useEffect(() => {
    if (settings?.commission_rate?.rate !== undefined) {
      setCommissionRate(String(settings.commission_rate.rate));
    }
  }, [settings]);

  const handleSave = () => {
    if (commissionRate) {
      updateSetting.mutate({ key: 'commission_rate', value: { rate: Number(commissionRate) } });
    }
  };

  const currentRate = settings?.commission_rate?.rate;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Platform Settings</h1>
        <p className="text-muted-foreground">Configure global platform settings</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Commission Settings</CardTitle>
          <CardDescription>Set global commission rate for transactions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Commission Rate (%)</Label>
                <Input 
                  type="number" 
                  placeholder="10" 
                  value={commissionRate} 
                  onChange={(e) => setCommissionRate(e.target.value)} 
                />
                {currentRate !== undefined && (
                  <p className="text-sm text-muted-foreground">
                    Current rate: <span className="font-medium">{currentRate}%</span>
                  </p>
                )}
              </div>
              <Button 
                onClick={handleSave} 
                disabled={updateSetting.isPending || !commissionRate}
              >
                {updateSetting.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}