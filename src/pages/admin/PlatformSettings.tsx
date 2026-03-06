import { usePlatformSettings, useUpdatePlatformSetting } from '@/hooks/useAdminData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import { Wallet, AlertTriangle, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PlatformSettings() {
  const { data: settings, isLoading } = usePlatformSettings();
  const updateSetting = useUpdatePlatformSetting();
  const [commissionRate, setCommissionRate] = useState('');
  const [minWithdrawal, setMinWithdrawal] = useState('');
  const [holdDays, setHoldDays] = useState('');

  // Initialize values from settings when data loads
  useEffect(() => {
    if (settings?.commission_rate?.rate !== undefined) {
      setCommissionRate(String(settings.commission_rate.rate));
    }
    if (settings?.min_withdrawal?.amount !== undefined) {
      setMinWithdrawal(String(settings.min_withdrawal.amount));
    }
    if (settings?.payment_hold_days?.days !== undefined) {
      setHoldDays(String(settings.payment_hold_days.days));
    } else {
      setHoldDays('7');
    }
  }, [settings]);

  const handleSaveCommission = () => {
    const rate = Number(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return;
    }
    updateSetting.mutate({ key: 'commission_rate', value: { rate } });
  };

  const handleSaveWithdrawal = () => {
    const amount = Number(minWithdrawal);
    if (isNaN(amount) || amount < 0) {
      return;
    }
    updateSetting.mutate({ key: 'min_withdrawal', value: { amount } });
  };

  const handleSaveHoldDays = () => {
    const days = Number(holdDays);
    if (isNaN(days) || days < 0 || days > 30) {
      return;
    }
    updateSetting.mutate({ key: 'payment_hold_days', value: { days } });
  };

  const commissionRateNum = Number(commissionRate);
  const isCommissionValid = !isNaN(commissionRateNum) && commissionRateNum >= 0 && commissionRateNum <= 100;
  const isHighCommission = isCommissionValid && commissionRateNum > 50;
  
  const minWithdrawalNum = Number(minWithdrawal);
  const isWithdrawalValid = !isNaN(minWithdrawalNum) && minWithdrawalNum >= 0;

  const holdDaysNum = Number(holdDays);
  const isHoldDaysValid = !isNaN(holdDaysNum) && holdDaysNum >= 0 && holdDaysNum <= 30;

  const currentRate = settings?.commission_rate?.rate;
  const currentMinWithdrawal = settings?.min_withdrawal?.amount;
  const currentHoldDays = settings?.payment_hold_days?.days ?? 7;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Platform Settings</h1>
        <p className="text-muted-foreground">Configure global platform settings</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                    min="0"
                    max="100"
                    value={commissionRate} 
                    onChange={(e) => setCommissionRate(e.target.value)} 
                  />
                  {currentRate !== undefined && (
                    <p className="text-sm text-muted-foreground">
                      Current rate: <span className="font-medium">{currentRate}%</span>
                    </p>
                  )}
                  {!isCommissionValid && commissionRate !== '' && (
                    <p className="text-sm text-destructive">
                      Rate must be between 0 and 100
                    </p>
                  )}
                  {isHighCommission && (
                    <Alert variant="default" className="mt-2 border-amber-500 bg-amber-500/10">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <AlertDescription className="text-amber-600 dark:text-amber-400">
                        High commission rate may affect seller participation
                      </AlertDescription>
                    </Alert>
                  )}
                  <p className="text-xs text-muted-foreground">
                    This rate is applied to all new transactions platform-wide
                  </p>
                </div>
                <Button 
                  onClick={handleSaveCommission} 
                  disabled={updateSetting.isPending || !isCommissionValid || commissionRate === ''}
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
                  disabled={updateSetting.isPending || !isWithdrawalValid || minWithdrawal === ''}
                >
                  {updateSetting.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Payment Hold Period */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Payment Hold Period
            </CardTitle>
            <CardDescription>How long seller funds are held before becoming available</CardDescription>
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
                  <Label>Hold Period (days)</Label>
                  <Input 
                    type="number" 
                    placeholder="7" 
                    min="0"
                    max="30"
                    value={holdDays} 
                    onChange={(e) => setHoldDays(e.target.value)} 
                  />
                  <p className="text-sm text-muted-foreground">
                    Current hold: <span className="font-medium">{currentHoldDays} days</span>
                  </p>
                  {!isHoldDaysValid && holdDays !== '' && (
                    <p className="text-sm text-destructive">
                      Must be between 0 and 30 days
                    </p>
                  )}
                  {holdDaysNum === 0 && (
                    <Alert variant="default" className="mt-2 border-amber-500 bg-amber-500/10">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <AlertDescription className="text-amber-600 dark:text-amber-400">
                        Setting 0 days means funds are immediately available — increases refund/dispute risk
                      </AlertDescription>
                    </Alert>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Seller earnings are held for this period before they can withdraw. Set 0 for instant availability.
                  </p>
                </div>
                <Button 
                  onClick={handleSaveHoldDays} 
                  disabled={updateSetting.isPending || !isHoldDaysValid || holdDays === ''}
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
