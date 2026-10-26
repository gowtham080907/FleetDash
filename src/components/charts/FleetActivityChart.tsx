import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { ActivityPoint } from '@/types/vehicle';
import { TrendingUp } from 'lucide-react';

interface Props {
  data: ActivityPoint[];
  isLoading?: boolean;
}

export const FleetActivityChart: React.FC<Props> = ({ data }) => {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Fleet Activity Over Time (24h)
          </CardTitle>
          <span className="text-[11px] font-mono text-emerald-500 font-semibold">Active Fleet Curve</span>
        </div>
        <CardDescription>Hourly shifts in active transit vs idle and garaged units</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="idleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-xs text-white shadow-xl space-y-1">
                        <p className="font-mono text-slate-400 font-semibold">{label}</p>
                        <p className="text-emerald-400 font-medium">Active: {payload[0]?.value} units</p>
                        <p className="text-amber-400 font-medium">Idle: {payload[1]?.value} units</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="active"
                name="Active"
                stroke="#10B981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#activeGrad)"
              />
              <Area
                type="monotone"
                dataKey="idle"
                name="Idle"
                stroke="#F59E0B"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#idleGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
