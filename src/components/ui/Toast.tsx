import React from 'react';
import { useToastStore, ToastType } from '@/stores/toastStore';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/utils/cn';

const toastIcons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
  error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
  info: <Info className="w-5 h-5 text-sky-500 shrink-0" />,
};

const toastBorderColors: Record<ToastType, string> = {
  success: 'border-emerald-500/30',
  error: 'border-rose-500/30',
  warning: 'border-amber-500/30',
  info: 'border-sky-500/30',
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-4 shadow-xl backdrop-blur-md transition-all duration-200 dark:bg-slate-900/95 dark:text-slate-100',
            toastBorderColors[toast.type]
          )}
        >
          {toastIcons[toast.type]}
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">{toast.title}</h4>
            {toast.message && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 break-words">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
