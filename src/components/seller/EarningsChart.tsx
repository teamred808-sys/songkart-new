import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface EarningsChartProps {
  data: { month: string; amount: number }[] | undefined;
  isLoading: boolean;
}

export function EarningsChart({ data, isLoading }: EarningsChartProps) {
  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg font-display">Earnings Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data || []}>
              <defs>
                <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(270, 95%, 65%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(270, 95%, 65%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 15%)" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(240, 5%, 55%)"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(240, 5%, 55%)"
                fontSize={12}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(240, 10%, 8%)',
                  border: '1px solid hsl(240, 10%, 15%)',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(0, 0%, 98%)' }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Earnings']}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="hsl(270, 95%, 65%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorEarnings)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
