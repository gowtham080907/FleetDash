import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { ThroughputPoint } from '@/types/vehicle';
import { Zap } from 'lucide-react';

interface Props {
  data: ThroughputPoint[];
  isLoading?: boolean;
}

export const ThroughputChart: React.FC<Props> = ({ data }) => {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Zap className="w-4 h-4 text-brand-electric" />
            Telemetry Ingestion Throughput
          </CardTitle>
          <span className="text-[11px] font-mono text-brand-electric font-semibold">Events / Sec</span>
        </div>
        <CardDescription>Live packet rate processed across socket message batches</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as ThroughputPoint;
                    return (
                      <div className="rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-xs text-white shadow-xl space-y-1">
                        <p className="font-mono text-slate-400 font-semibold">{label}</p>
                        <p className="text-sky-400 font-mono font-bold">{item.events.toLocaleString()} events/sec</p>
                        <p className="text-slate-400 font-mono text-[11px]">Payload: {item.bytesKb} KB/s</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="events" fill="#0066FF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
