import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { SpeedBin } from '@/types/vehicle';
import { Gauge } from 'lucide-react';

interface Props {
  data: SpeedBin[];
  isLoading?: boolean;
}

const SPEED_COLORS = ['#64748B', '#0066FF', '#10B981', '#F59E0B', '#EF4444'];

export const SpeedDistributionChart: React.FC<Props> = ({ data }) => {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Gauge className="w-4 h-4 text-emerald-500" />
            Speed Distribution (km/h)
          </CardTitle>
          <span className="text-[11px] font-mono text-slate-500">Fleet Velocity</span>
        </div>
        <CardDescription>Number of vehicles grouped by current speed brackets</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as SpeedBin;
                    return (
                      <div className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-white shadow-xl">
                        <p className="font-semibold text-slate-300">{item.range}</p>
                        <p className="font-mono text-emerald-400 font-bold">{item.count} vehicles</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={SPEED_COLORS[index % SPEED_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
