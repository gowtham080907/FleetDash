import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { AlertSeverityPoint } from '@/types/vehicle';
import { ShieldAlert, AlertTriangle, Info } from 'lucide-react';

interface Props {
  data: AlertSeverityPoint[];
  isLoading?: boolean;
}

export const AlertSeverityChart: React.FC<Props> = ({ data }) => {
  const total = data.reduce((acc, curr) => acc + curr.count, 0);

  const icons = {
    critical: <ShieldAlert className="w-4 h-4 text-rose-500" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    info: <Info className="w-4 h-4 text-sky-500" />,
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            Geofence Alerts by Severity
          </CardTitle>
          <span className="text-[11px] font-mono text-rose-500 font-semibold">{total} Total</span>
        </div>
        <CardDescription>Security breaches and operational threshold warnings</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-4 flex flex-col justify-center space-y-4">
        {data.map((item) => {
          const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
          return (
            <div key={item.severity} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 capitalize font-medium text-slate-700 dark:text-slate-300">
                  {icons[item.severity]}
                  <span>{item.severity} Events</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{item.count}</span>
                  <span className="text-[10px] text-slate-400">({percent}%)</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
