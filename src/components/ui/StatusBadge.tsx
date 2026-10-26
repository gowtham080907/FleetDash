import React from 'react';
import { cn } from '@/utils/cn';

export type StatusType = 'active' | 'idle' | 'offline' | 'breach' | 'connected' | 'disconnected' | 'connecting';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  showDot?: boolean;
  pulse?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<StatusType, { label: string; bg: string; text: string; dot: string; ring: string }> = {
  active: {
    label: 'Active',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-500/30',
  },
  idle: {
    label: 'Idle',
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
    ring: 'ring-amber-500/30',
  },
  offline: {
    label: 'Offline',
    bg: 'bg-slate-500/10 dark:bg-slate-500/20',
    text: 'text-slate-700 dark:text-slate-400',
    dot: 'bg-slate-400',
    ring: 'ring-slate-500/30',
  },
  breach: {
    label: 'Breach Alert',
    bg: 'bg-rose-500/15 dark:bg-rose-500/25',
    text: 'text-rose-700 dark:text-rose-400 font-semibold',
    dot: 'bg-rose-500',
    ring: 'ring-rose-500/40',
  },
  connected: {
    label: 'Connected',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-500/30',
  },
  connecting: {
    label: 'Connecting...',
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
    ring: 'ring-amber-500/30',
  },
  disconnected: {
    label: 'Disconnected',
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    text: 'text-rose-700 dark:text-rose-400',
    dot: 'bg-rose-500',
    ring: 'ring-rose-500/30',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  showDot = true,
  pulse = false,
  className,
  size = 'sm',
}) => {
  const config = statusConfig[status] || statusConfig.offline;
  const displayLabel = label || config.label;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium transition-colors select-none',
        config.bg,
        config.text,
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className
      )}
    >
      {showDot && (
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span
              className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                config.dot
              )}
            />
          )}
          <span className={cn('relative inline-flex rounded-full h-2 w-2', config.dot)} />
        </span>
      )}
      {displayLabel}
    </span>
  );
};
