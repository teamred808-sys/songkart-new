import { AdminStats } from '@/components/admin/AdminStats';
import { ActivityFeed } from '@/components/admin/ActivityFeed';
import { RevenueChart } from '@/components/admin/RevenueChart';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and management</p>
      </div>

      <AdminStats />

      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueChart />
        <ActivityFeed />
      </div>
    </div>
  );
}
