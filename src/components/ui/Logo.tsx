import React from 'react';
import { cn } from '@/utils/cn';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showSubtitle?: boolean;
  subtitleText?: string;
  className?: string;
  glow?: boolean;
  animate?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  showSubtitle = true,
  subtitleText = 'Telemetry Engine',
  className,
  glow = true,
  animate = true,
}) => {
  const iconSizeClasses = {
    sm: 'h-7 w-7 rounded-lg text-xs',
    md: 'h-9 w-9 rounded-xl text-sm',
    lg: 'h-11 w-11 rounded-xl text-base',
    xl: 'h-14 w-14 rounded-2xl text-lg',
  }[size];

  const svgDimensions = {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 30,
  }[size];

  const titleSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm sm:text-base',
    lg: 'text-base sm:text-lg',
    xl: 'text-xl sm:text-2xl',
  }[size];

  const subtitleSizeClasses = {
    sm: 'text-[8px]',
    md: 'text-[9px]',
    lg: 'text-[10px]',
    xl: 'text-[11px]',
  }[size];

  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none group', className)}>
      {/* Radiant Bright Emblem Icon */}
      <div
        className={cn(
          'relative flex shrink-0 items-center justify-center font-bold',
          'bg-gradient-to-tr from-cyan-500 via-sky-400 to-blue-600 text-white',
          'border border-cyan-200/50 ring-1 ring-cyan-400/40',
          glow && 'shadow-[0_0_20px_rgba(6,182,212,0.55)]',
          'transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_28px_rgba(56,189,248,0.75)]',
          iconSizeClasses
        )}
      >
        {/* Subtle pulsing background glow layer */}
        <div className="absolute inset-0 rounded-inherit bg-gradient-to-tr from-cyan-400 to-sky-300 opacity-20 blur-[3px]" />

        {/* Custom High-Tech Fleet Telemetry Mark */}
        <svg
          width={svgDimensions}
          height={svgDimensions}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cn('relative z-10 transition-transform duration-300')}
        >
          {/* Signal Wave 1 (Outer) */}
          <path
            d="M4.93 4.93a10 10 0 0 1 14.14 0"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            className={animate ? 'animate-pulse opacity-85' : 'opacity-85'}
          />
          {/* Signal Wave 2 (Middle) */}
          <path
            d="M7.76 7.76a6 6 0 0 1 8.48 0"
            stroke="#E0F2FE"
            strokeWidth="2.2"
            strokeLinecap="round"
            className={animate ? 'opacity-95' : 'opacity-95'}
          />
          {/* Aerodynamic Forward Fleet Arrow / Chevron */}
          <path
            d="M12 11.5L16 19.5L12 17.5L8 19.5L12 11.5Z"
            fill="#FFFFFF"
            stroke="#0284C7"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* Core Telemetry Node */}
          <circle cx="12" cy="12" r="2" fill="#38BDF8" className={animate ? 'animate-ping' : ''} />
          <circle cx="12" cy="12" r="1.5" fill="#FFFFFF" />
        </svg>
      </div>

      {/* Typography Brand Mark */}
      {showText && (
        <div className="flex flex-col leading-tight">
          <div className={cn('font-black tracking-tight text-white flex items-center', titleSizeClasses)}>
            <span>FLEET</span>
            <span className="ml-0.5 bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(56,189,248,0.7)]">
              DASH
            </span>
          </div>

          {showSubtitle && (
            <span
              className={cn(
                'font-mono uppercase tracking-widest font-semibold',
                'bg-gradient-to-r from-cyan-400 to-sky-400 bg-clip-text text-transparent',
                subtitleSizeClasses
              )}
            >
              {subtitleText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
