import { AdminStats } from '@/components/admin/AdminStats';
import { ActivityFeed } from '@/components/admin/ActivityFeed';
import { RevenueChart } from '@/components/admin/RevenueChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, FileCheck, DollarSign, ArrowRight } from 'lucide-react';

const quickActions = [
  { 
    label: "Pending Songs", 
    description: "Review uploaded songs", 
    icon: Clock, 
    to: "/admin/songs",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/30"
  },
  { 
    label: "Disputes", 
    description: "Handle open disputes", 
    icon: AlertTriangle, 
    to: "/admin/disputes",
    color: "bg-red-500/10 text-red-500 border-red-500/30"
  },
  { 
    label: "Withdrawals", 
    description: "Process pending payouts", 
    icon: DollarSign, 
    to: "/admin/withdrawals",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
  },
  { 
    label: "Licenses", 
    description: "Manage license templates", 
    icon: FileCheck, 
    to: "/admin/licenses",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/30"
  },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and management</p>
      </div>

      {/* Quick Actions - Priority Section */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className={`flex flex-col p-4 rounded-xl border ${action.color} hover:scale-[1.02] transition-all`}
              >
                <action.icon className="h-6 w-6 mb-2" />
                <span className="font-medium text-foreground">{action.label}</span>
                <span className="text-xs text-muted-foreground">{action.description}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <AdminStats />

      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueChart />
        <ActivityFeed />
      </div>
    </div>
  );
}
