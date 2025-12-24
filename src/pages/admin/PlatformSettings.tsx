import { usePlatformSettings, useUpdatePlatformSetting } from '@/hooks/useAdminData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import { Wallet } from 'lucide-react';

export default function PlatformSettings() {
  const { data: settings, isLoading } = usePlatformSettings();
  const updateSetting = useUpdatePlatformSetting();
  const [commissionRate, setCommissionRate] = useState('');
  const [minWithdrawal, setMinWithdrawal] = useState('');

  // Initialize values from settings when data loads
  useEffect(() => {
    if (settings?.commission_rate?.rate !== undefined) {
      setCommissionRate(String(settings.commission_rate.rate));
    }
    if (settings?.min_withdrawal?.amount !== undefined) {
      setMinWithdrawal(String(settings.min_withdrawal.amount));
    }
  }, [settings]);

  const handleSaveCommission = () => {
    if (commissionRate) {
      updateSetting.mutate({ key: 'commission_rate', value: { rate: Number(commissionRate) } });
    }
  };

  const handleSaveWithdrawal = () => {
    if (minWithdrawal) {
      updateSetting.mutate({ key: 'min_withdrawal', value: { amount: Number(minWithdrawal) } });
    }
  };

  const currentRate = settings?.commission_rate?.rate;
  const currentMinWithdrawal = settings?.min_withdrawal?.amount;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Platform Settings</h1>
        <p className="text-muted-foreground">Configure global platform settings</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Commission Settings */}
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
                  onClick={handleSaveCommission} 
                  disabled={updateSetting.isPending || !commissionRate}
                >
                  {updateSetting.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Withdrawal Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Withdrawal Settings
            </CardTitle>
            <CardDescription>Set minimum withdrawal threshold for sellers</CardDescription>
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
                  <Label>Minimum Withdrawal Amount (₹)</Label>
                  <Input 
                    type="number" 
                    placeholder="500" 
                    min="0"
                    value={minWithdrawal} 
                    onChange={(e) => setMinWithdrawal(e.target.value)} 
                  />
                  {currentMinWithdrawal !== undefined && (
                    <p className="text-sm text-muted-foreground">
                      Current threshold: <span className="font-medium">₹{currentMinWithdrawal}</span>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Sellers must reach this amount before requesting a withdrawal
                  </p>
                </div>
                <Button 
                  onClick={handleSaveWithdrawal} 
                  disabled={updateSetting.isPending || !minWithdrawal}
                >
                  {updateSetting.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
