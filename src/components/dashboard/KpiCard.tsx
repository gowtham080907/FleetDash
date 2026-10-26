import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/utils/cn';

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  accentColor?: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate';
  isLoading?: boolean;
  error?: boolean;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  unit,
  subtitle,
  icon,
  trend,
  accentColor = 'blue',
  isLoading = false,
  error = false,
  className,
}) => {
  const accentBorders = {
    blue: 'border-l-4 border-l-brand-electric',
    emerald: 'border-l-4 border-l-emerald-500',
    amber: 'border-l-4 border-l-amber-500',
    rose: 'border-l-4 border-l-rose-500',
    slate: 'border-l-4 border-l-slate-400',
  };

  const iconBackgrounds = {
    blue: 'bg-blue-500/10 text-brand-electric dark:bg-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 dark:bg-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 dark:bg-rose-500/20',
    slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 dark:bg-slate-500/20',
  };

  if (isLoading) {
    return (
      <Card className={cn('p-5', className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-20 mt-3" />
        <Skeleton className="h-3 w-36 mt-2" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('p-5 border-rose-300 dark:border-rose-900', className)}>
        <p className="text-xs font-semibold text-rose-500">Failed to load metric</p>
        <p className="text-[11px] text-slate-400 mt-1">{label}</p>
      </Card>
    );
  }

  return (
    <Card className={cn('hover:shadow-md transition-shadow relative overflow-hidden', accentBorders[accentColor], className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </span>
          <div className={cn('p-2 rounded-lg flex items-center justify-center', iconBackgrounds[accentColor])}>
            {icon}
          </div>
        </div>

        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {value}
          </span>
          {unit && <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{unit}</span>}
        </div>

        <div className="mt-2 flex items-center justify-between text-xs">
          {subtitle && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{subtitle}</span>
          )}
          {trend && (
            <span
              className={cn(
                'font-mono text-[11px] font-semibold ml-auto shrink-0',
                trend.isNeutral
                  ? 'text-slate-500'
                  : trend.isPositive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              )}
            >
              {trend.value}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
