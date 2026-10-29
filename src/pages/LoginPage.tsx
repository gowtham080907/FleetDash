import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Radio, Eye, EyeOff, ShieldCheck, Zap, Lock, Mail, ArrowRight, Activity, Truck } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToastStore } from '@/stores/toastStore';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError, isDemoMode } = useAuthStore();
  const { addToast } = useToastStore();
  const [showPassword, setShowPassword] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: localStorage.getItem('fleetdash_saved_email') || '',
      password: '',
      rememberMe: Boolean(localStorage.getItem('fleetdash_saved_email')),
    },
  });

  useEffect(() => {
    clearError();
  }, [clearError]);

  const onSubmit = async (data: LoginFormData) => {
    if (data.rememberMe) {
      localStorage.setItem('fleetdash_saved_email', data.email);
    } else {
      localStorage.removeItem('fleetdash_saved_email');
    }

    const success = await login(data.email, data.password, false);
    if (success) {
      addToast({
        type: 'success',
        title: 'Authentication Successful',
        message: 'Welcome back to FleetDash Command Center.',
      });
      navigate(from, { replace: true });
    }
  };

  const handleDemoLogin = async () => {
    setValue('email', 's.jenkins@fleetdash.io');
    setValue('password', 'FleetDemo2026!');
    const success = await login('s.jenkins@fleetdash.io', 'FleetDemo2026!', true);
    if (success) {
      addToast({
        type: 'info',
        title: 'Demo Access Granted',
        message: 'Signed in as Fleet Operations Director (Simulated Environment).',
      });
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-950 text-slate-100">
      {/* Left side: Interactive Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md space-y-8">
          {/* Brand header */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-brand-navy-light/80 border border-slate-800 text-brand-electric">
              <Radio className="w-4 h-4 animate-pulse text-brand-electric" />
              <span className="text-xs font-mono font-bold tracking-wider uppercase">
                FleetDash v1.0 • Telemetry Command Center
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Sign in to Operations
            </h1>
            <p className="text-sm text-slate-400">
              High-throughput real-time telemetry, geofence monitoring & geospatial analytics.
            </p>
          </div>

          {/* Demo banner indicator */}
          {isDemoMode && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <p className="font-semibold text-amber-300">Demo Mode Active</p>
                  <p className="text-amber-200/80 mt-0.5">
                    No backend connection required. Test with deterministic vehicle fleet simulations.
                  </p>
                  <button
                    type="button"
                    onClick={handleDemoLogin}
                    disabled={isLoading}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
                  >
                    <span>Instant Demo Login</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error notice */}
          {error && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-400">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Input
                label="Email Address"
                type="email"
                placeholder="dispatcher@fleetdash.io"
                leftIcon={<Mail className="w-4 h-4" />}
                error={errors.email?.message}
                {...register('email')}
              />
            </div>

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:text-slate-200 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300 select-none">
                <input
                  type="checkbox"
                  className="rounded border-slate-700 bg-slate-900 text-brand-electric focus:ring-brand-electric"
                  {...register('rememberMe')}
                />
                <span>Remember email preference</span>
              </label>

              <span className="text-slate-500 hover:text-slate-400 cursor-not-allowed">
                Forgot access key?
              </span>
            </div>

            <Button
              type="submit"
              variant="electric"
              size="lg"
              className="w-full text-sm font-semibold tracking-wide"
              isLoading={isLoading}
            >
              Sign In to Command Center
            </Button>
          </form>

          {/* Security note */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Encrypted Session • Transport Layer Security Protected</span>
          </div>
        </div>
      </div>

      {/* Right side: Futuristic Telemetry Graphic & Showcase */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-brand-navy-dark via-slate-900 to-[#030712] border-l border-slate-800 flex-col justify-between p-12 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-brand-electric/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top telemetry badge */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>FLEET NETWORK: ONLINE</span>
          </div>
          <span className="text-xs font-mono text-slate-500 tracking-wider">SUB-SECOND TELEMETRY</span>
        </div>

        {/* Center showcase card */}
        <div className="relative z-10 my-auto py-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Enterprise Operations</p>
                <h3 className="text-xl font-bold text-white">Commercial Fleet Telemetry</h3>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
                <Truck className="w-3.5 h-3.5" />
                <span>10,000+ ASSETS</span>
              </div>
            </div>

            {/* Enterprise capability cards */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/60">
                <span className="text-slate-400 block text-[10px]">MONITORING</span>
                <span className="text-brand-electric font-bold">Live GPS Fleet</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/60">
                <span className="text-slate-400 block text-[10px]">GEOFENCING</span>
                <span className="text-amber-400 font-bold">Smart Perimeters</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/60">
                <span className="text-slate-400 block text-[10px]">THROUGHPUT</span>
                <span className="text-emerald-400 font-bold">15,000+ evt/s</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/60">
                <span className="text-slate-400 block text-[10px]">LATENCY</span>
                <span className="text-sky-400 font-bold">&lt; 25ms Real-Time</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Comprehensive situational awareness across high-density commercial fleets with automated perimeter breach detection, velocity telemetry, and real-time operational diagnostics.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 pt-4">
          <span>Enterprise Fleet Telemetry System</span>
          <span>Command Center v1.0.0</span>
        </div>
      </div>
    </div>
  );
};
