import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { StatusDistribution } from '@/types/vehicle';
import { PieChart as PieIcon } from 'lucide-react';

interface Props {
  data: StatusDistribution[];
  isLoading?: boolean;
}

export const StatusDistributionChart: React.FC<Props> = ({ data }) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-brand-electric" />
            Vehicle Status Distribution
          </CardTitle>
          <span className="text-[11px] font-mono text-slate-500">{total} Total</span>
        </div>
        <CardDescription>Live operational distribution across fleet units</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as StatusDistribution;
                    const percent = Math.round((item.value / total) * 100);
                    return (
                      <div className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-white shadow-lg">
                        <p className="font-semibold" style={{ color: item.color }}>
                          {item.name}
                        </p>
                        <p className="text-slate-300 font-mono">
                          {item.value} vehicles ({percent}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
          {data.map((item) => (
            <div key={item.name} className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 dark:text-slate-400 font-medium">{item.name}</span>
              </div>
              <span className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                {item.value} <span className="text-[10px] text-slate-400 font-normal">({Math.round((item.value / total) * 100)}%)</span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
