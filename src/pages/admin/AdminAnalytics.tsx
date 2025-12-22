import { RevenueChart } from '@/components/admin/RevenueChart';
import { AdminStats } from '@/components/admin/AdminStats';

export default function AdminAnalytics() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Analytics</h1><p className="text-muted-foreground">Platform performance metrics</p></div>
      <AdminStats />
      <RevenueChart />
    </div>
  );
}
