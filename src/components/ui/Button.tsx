import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'electric';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-lg select-none';

    const variants = {
      primary: 'bg-brand-navy hover:bg-brand-navy-light text-white focus-visible:ring-brand-navy dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white',
      secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-900 focus-visible:ring-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:text-slate-100',
      outline: 'border border-slate-300 hover:bg-slate-100 text-slate-700 focus-visible:ring-slate-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
      ghost: 'hover:bg-slate-100 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
      danger: 'bg-rose-600 hover:bg-rose-700 text-white focus-visible:ring-rose-500 shadow-sm',
      electric: 'bg-brand-electric hover:bg-brand-electric-hover text-white shadow-sm shadow-blue-500/20 focus-visible:ring-brand-electric',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-11 px-6 text-base gap-2.5',
      icon: 'h-9 w-9 p-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
