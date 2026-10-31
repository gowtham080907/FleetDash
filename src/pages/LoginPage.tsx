import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Radio,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  Lock,
  Mail,
  ArrowRight,
  Activity,
  Truck,
  MapPin,
  Gauge,
  ShieldAlert,
  BarChart3,
  Layers,
  Cpu,
  Server,
  CheckCircle2,
  User as UserIcon,
  Building,
  Check,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToastStore } from '@/stores/toastStore';
import { cn } from '@/utils/cn';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginSchema>;

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    organization: z.string().min(2, 'Organization / Fleet name is required'),
    role: z.enum(['fleet_manager', 'admin', 'viewer']),
    email: z.string().email('Please enter a valid work email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
    agreeTerms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms & privacy policy',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

interface SimulatedPacket {
  id: string;
  lat: string;
  lng: string;
  speed: string;
  heading: string;
  status: 'ACTIVE' | 'IDLE' | 'ALERT';
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, registerUser, isLoading, error, clearError, isDemoMode } = useAuthStore();
  const { addToast } = useToastStore();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Live ticking simulation for hero section
  const [tickerPackets, setTickerPackets] = useState<SimulatedPacket[]>([
    { id: 'VH-1082', lat: '41.8781° N', lng: '87.6298° W', speed: '64.2 km/h', heading: '182° S', status: 'ACTIVE' },
    { id: 'VH-4920', lat: '41.8902° N', lng: '87.6350° W', speed: '48.0 km/h', heading: '094° E', status: 'ACTIVE' },
    { id: 'VH-0311', lat: '41.8650° N', lng: '87.6400° W', speed: '0.0 km/h', heading: '000° -', status: 'IDLE' },
    { id: 'VH-8821', lat: '41.9742° N', lng: '87.9073° W', speed: '82.5 km/h', heading: '270° W', status: 'ALERT' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerPackets((prev) =>
        prev.map((p) => {
          if (p.status === 'IDLE') return p;
          const randomDelta = (Math.random() - 0.5) * 0.002;
          const newLat = (parseFloat(p.lat) + randomDelta).toFixed(4) + '° N';
          const newSpeed = Math.max(20, Math.min(95, parseFloat(p.speed) + (Math.random() - 0.5) * 5)).toFixed(1) + ' km/h';
          return { ...p, lat: newLat, speed: newSpeed };
        })
      );
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  // Login form
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

  // Register form
  const {
    register: registerField,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: regErrors },
    watch: watchRegister,
    setValue: setRegisterValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      organization: '',
      role: 'fleet_manager',
      email: '',
      password: '',
      confirmPassword: '',
      agreeTerms: false,
    },
  });

  const selectedRole = watchRegister('role');

  useEffect(() => {
    clearError();
  }, [clearError, authMode]);

  const switchAuthMode = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    clearError();
  };

  const scrollToAuth = (mode?: 'login' | 'register') => {
    if (mode) {
      switchAuthMode(mode);
    }
    const el = document.getElementById('login-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
        message: 'Welcome to FleetDash Operations Command Center.',
      });
      navigate(from, { replace: true });
    }
  };

  const onRegisterSubmit = async (data: RegisterFormData) => {
    const success = await registerUser({
      name: data.fullName,
      organization: data.organization,
      role: data.role,
      email: data.email,
      password: data.password,
    });

    if (success) {
      addToast({
        type: 'success',
        title: 'Workspace Initialized',
        message: `Welcome, ${data.fullName}! Your fleet dashboard is ready.`,
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
        message: 'Signed in as Fleet Operations Director with live simulated telemetry.',
      });
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-brand-electric selection:text-white relative overflow-x-hidden font-sans">
      {/* Background radial gradients */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-brand-electric/15 via-blue-900/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-3xl pointer-events-none -z-10" />

      {/* 1. TOP NAVIGATION HEADER */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-electric text-white shadow-lg shadow-blue-500/25 ring-1 ring-blue-400/30">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-white flex items-center gap-1">
                FLEET<span className="text-brand-electric">DASH</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                Enterprise Telemetry
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Platform</a>
            <a href="#live-stream" className="hover:text-white transition-colors">Telemetry Mesh</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#performance" className="hover:text-white transition-colors">Performance SLA</a>
          </nav>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Status Pill */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 shadow-inner">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="h-2 w-2 rounded-full bg-emerald-400 -ml-4" />
              <span>Mesh Status: <strong className="text-emerald-400 font-semibold">99.99% Uptime</strong></span>
            </div>

            {/* Instant Demo Launch Button */}
            <button
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold shadow-md shadow-amber-500/20 transition-all active:scale-95"
              title="Launch instant demo mode with simulated fleet telemetry"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>Instant Demo</span>
            </button>

            {/* Sign In CTA */}
            <button
              onClick={() => scrollToAuth('login')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition-all active:scale-95"
            >
              <span>Sign In</span>
            </button>

            {/* Register CTA */}
            <button
              onClick={() => scrollToAuth('register')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-electric hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              <span>Register</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Announcement Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 shadow-md">
              <span className="flex h-2 w-2 rounded-full bg-brand-electric animate-pulse" />
              <span className="text-brand-electric font-semibold">ENTERPRISE TELEMETRY ENGINE</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">10,000+ Concurrent Assets</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
              Real-Time Fleet Oversight at{' '}
              <span className="bg-gradient-to-r from-brand-electric via-blue-400 to-emerald-400 bg-clip-text text-transparent">
                Sub-Second Velocity
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-xl text-slate-400 leading-relaxed font-normal">
              Engineered for mission-critical logistics operations. Ingest 15,000+ telemetry events per second, compute dynamic polygon geofences, and render massive moving fleets at steady 60 FPS without browser stutter.
            </p>

            {/* Call To Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button
                variant="electric"
                size="lg"
                onClick={handleDemoLogin}
                isLoading={isLoading}
                className="w-full sm:w-auto text-base font-semibold px-8 py-3.5 shadow-xl shadow-brand-electric/20 gap-2"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Launch Live Demo Console</span>
              </Button>

              <button
                onClick={() => scrollToAuth('login')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-sm font-semibold transition-all hover:border-slate-600"
              >
                <span>Enterprise Sign In</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => scrollToAuth('register')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl border border-brand-electric/50 bg-brand-electric/10 hover:bg-brand-electric/20 text-brand-electric text-sm font-semibold transition-all"
              >
                <UserIcon className="w-4 h-4" />
                <span>Create Account</span>
              </button>
            </div>
          </div>

          {/* Interactive Live Telemetry Hero Mockup */}
          <div id="live-stream" className="mt-14 sm:mt-20 max-w-5xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-xl shadow-2xl p-4 sm:p-6 lg:p-8 relative scroll-mt-24">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
                <div>
                  <h3 className="text-sm font-mono font-bold text-white tracking-wide uppercase">
                    Live Telemetry Mesh • Chicago Freight Corridor
                  </h3>
                  <p className="text-xs text-slate-400">Stream frequency: 60 updates/sec • Zero packet drops</p>
                </div>
              </div>

              {/* Status indicators */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2.5 py-1 rounded bg-slate-800 text-emerald-400 font-bold border border-slate-700">
                  10,000+ UNITS ACTIVE
                </span>
                <span className="px-2.5 py-1 rounded bg-slate-800 text-blue-400 font-bold border border-slate-700">
                  60 FPS RENDERER
                </span>
              </div>
            </div>

            {/* Live Ticking Stream Grid */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {tickerPackets.map((pkt) => (
                <div
                  key={pkt.id}
                  className={`p-3.5 rounded-xl border transition-all duration-300 font-mono text-xs ${
                    pkt.status === 'ALERT'
                      ? 'bg-rose-950/30 border-rose-800/80 text-rose-200'
                      : pkt.status === 'IDLE'
                      ? 'bg-slate-900/80 border-slate-800 text-slate-400'
                      : 'bg-slate-800/50 border-slate-700/70 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-brand-electric" />
                      {pkt.id}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        pkt.status === 'ALERT'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : pkt.status === 'IDLE'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {pkt.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Coord:</span>
                      <span className="text-slate-300">{pkt.lat}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Speed:</span>
                      <span className="font-semibold text-white">{pkt.speed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Heading:</span>
                      <span className="text-slate-300">{pkt.heading}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom mini benchmark bar */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Ingestion Throughput: <strong className="text-white">15,240 msg/s</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-brand-electric" />
                <span>Mean Frame Latency: <strong className="text-white">1.8 ms</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Geofence Precision: <strong className="text-white">Sub-Meter Boundary</strong></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. OPERATIONAL KPI TICKER STRIP */}
      <section className="border-y border-slate-800 bg-slate-900/40 py-10" id="performance">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">10,000+</p>
              <p className="text-xs sm:text-sm font-medium text-slate-400">Active Concurrent Assets</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold text-brand-electric tracking-tight">15,000+</p>
              <p className="text-xs sm:text-sm font-medium text-slate-400">Events Ingested / Sec</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold text-emerald-400 tracking-tight">&lt; 25ms</p>
              <p className="text-xs sm:text-sm font-medium text-slate-400">End-to-End Latency</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold text-amber-400 tracking-tight">99.99%</p>
              <p className="text-xs sm:text-sm font-medium text-slate-400">Operational Uptime SLA</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CORE PLATFORM CAPABILITIES */}
      <section className="py-20 sm:py-28" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="text-xs font-mono font-bold tracking-wider text-brand-electric uppercase">
              Core Architecture & Features
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Built for High-Throughput Fleet Demands
            </h3>
            <p className="text-sm sm:text-base text-slate-400">
              FleetDash combines high-frequency stream processing with hardware-accelerated canvas mapping to deliver unprecedented responsiveness.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-brand-electric/50 transition-all space-y-3 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-brand-electric border border-blue-500/20 group-hover:scale-105 transition-transform">
                <MapPin className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Hardware-Accelerated Canvas Map</h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Replaces heavy DOM markers with a custom HTML5 Canvas overlay powered by requestAnimationFrame. Viewport bounding culling ignores off-screen vehicles for zero frame drops.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-emerald-500/50 transition-all space-y-3 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Dynamic Geofence Security</h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Monitor circular perimeters and complex polygonal containment zones with instant breach beaconing and automated dispatcher incident dispatches.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-amber-500/50 transition-all space-y-3 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform">
                <Activity className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-white">High-Throughput Ingestion</h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                High-frequency vehicle coordinates bypass React Virtual DOM reconciler through a decoupled mutable spatial cache, completely eliminating garbage collection pauses.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-purple-500/50 transition-all space-y-3 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-105 transition-transform">
                <Gauge className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Real-Time Performance HUD</h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Continuous frame rendering diagnostics, frame time latency sampling, memory heap tracking, and automated 100 to 10,000 unit stress testing.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-sky-500/50 transition-all space-y-3 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:scale-105 transition-transform">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Executive KPI Dashboards</h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Live vehicle status distribution, speed dispersion curves, fleet activity trends, and incident severity analytics rendered with clean responsive Recharts.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-rose-500/50 transition-all space-y-3 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:scale-105 transition-transform">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Zero-Trust Enterprise Security</h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Role-based dispatcher access control, protected application routes, TLS 1.3 session encryption, and strict data boundary validation at ingestion time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ARCHITECTURE BLUEPRINT SECTION */}
      <section className="py-20 sm:py-28 border-t border-slate-800 bg-slate-950 relative scroll-mt-20" id="architecture">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-xs font-mono font-bold tracking-wider text-brand-electric uppercase">
              Engineered for High-Throughput
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Dual-Track Ingestion Architecture
            </h3>
            <p className="text-sm sm:text-base text-slate-400">
              How FleetDash renders 10,000+ active moving assets at 60 FPS without React Virtual DOM bottlenecks.
            </p>
          </div>

          {/* 4-Stage Pipeline Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-3 relative overflow-hidden group hover:border-slate-700 transition">
              <div className="text-xs font-mono font-bold text-brand-electric">STAGE 01</div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-brand-electric border border-blue-500/20">
                <Server className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-white">Stream Ingestion</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ingests high-frequency telemetry batches (15,000+ msg/s) over persistent WebSocket transports with automatic backoff reconnection.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-3 relative overflow-hidden group hover:border-slate-700 transition">
              <div className="text-xs font-mono font-bold text-emerald-400">STAGE 02</div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-white">Boundary Validator</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Validates WGS-84 coordinate bounds [-90, 90], speed ceilings, and unpacks compact 32-byte Little-Endian binary packets on the fly.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-3 relative overflow-hidden group hover:border-slate-700 transition">
              <div className="text-xs font-mono font-bold text-amber-400">STAGE 03</div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Layers className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-white">Non-Reactive Spatial Store</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Buffers coordinates into a zero-allocation mutable map outside the React component tree, preventing continuous reconciliation cycles.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-3 relative overflow-hidden group hover:border-slate-700 transition">
              <div className="text-xs font-mono font-bold text-sky-400">STAGE 04</div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Cpu className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-white">60 FPS Canvas Viewport</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Directly reads buffered coordinates inside requestAnimationFrame. Rejects off-screen vehicles via spatial bounding-box culling.
              </p>
            </div>
          </div>

          {/* Comparison Banner */}
          <div className="max-w-4xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 p-4 rounded-xl bg-rose-950/20 border border-rose-900/40">
              <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">Traditional Web Architecture</span>
              <p className="text-sm font-semibold text-white">High-Frequency State Re-Renders</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Storing 10,000 coordinates in React useState causes 15,000 Virtual DOM tree diffs per second, locking the main thread and crashing frame rates below 10 FPS.
              </p>
            </div>

            <div className="space-y-2 p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">FleetDash Decoupled Mesh</span>
              <p className="text-sm font-semibold text-white">Hardware-Accelerated Dual Track</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Coordinates are queried directly by HTML5 Canvas overlay at screen refresh rate. React only updates low-frequency dashboard aggregates at 250ms intervals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. ENTERPRISE AUTHENTICATION SECTION */}
      <section className="py-20 sm:py-28 border-t border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative scroll-mt-10" id="login-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left side explanation */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-navy-light/80 border border-slate-800 text-brand-electric">
                <Radio className="w-4 h-4 animate-pulse text-brand-electric" />
                <span className="text-xs font-mono font-bold tracking-wider uppercase">
                  {authMode === 'login' ? 'OPERATIONS CONSOLE' : 'WORKSPACE ONBOARDING'}
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {authMode === 'login' ? 'Access FleetDash Command Center' : 'Create Enterprise Fleet Workspace'}
              </h2>

              <p className="text-sm text-slate-400 leading-relaxed">
                {authMode === 'login'
                  ? 'Sign in with enterprise credentials to monitor moving assets, configure dynamic perimeters, inspect real-time telemetry streams, and run performance diagnostics.'
                  : 'Deploy mission-critical fleet telemetry. Register your organization to ingest live GPS updates, configure smart perimeters, and monitor high-density fleets at 60 FPS.'}
              </p>

              {authMode === 'register' && (
                <div className="space-y-3 pt-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Hardware-accelerated 60 FPS Canvas overlay</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Circular and polygon geofence breach automation</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Sub-second telemetry ingestion & packet inspector</span>
                  </div>
                </div>
              )}

              {/* Demo Mode Notice */}
              {isDemoMode && (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Instant Demo Mode Active</span>
                  </div>
                  <p className="text-xs text-amber-200/80 leading-relaxed">
                    Evaluate all frontend capabilities with simulated fleet data without setting up a backend server.
                  </p>
                  <button
                    type="button"
                    onClick={handleDemoLogin}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow"
                  >
                    <span>Instant Demo Login</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Encrypted Session • Transport Layer Security Protected</span>
              </div>
            </div>

            {/* Right side auth card */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
                {/* Mode Selector Tabs */}
                <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => switchAuthMode('login')}
                    className={cn(
                      "flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all",
                      authMode === 'login'
                        ? "bg-brand-electric text-white shadow-md shadow-blue-500/25"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => switchAuthMode('register')}
                    className={cn(
                      "flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all",
                      authMode === 'register'
                        ? "bg-brand-electric text-white shadow-md shadow-blue-500/25"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    Register Account
                  </button>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white">
                    {authMode === 'login' ? 'Sign In to Account' : 'Register New Workspace'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {authMode === 'login'
                      ? 'Enter your dispatcher or fleet manager credentials'
                      : 'Set up your operational credentials and organization access'}
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-400">
                    {error}
                  </div>
                )}

                {authMode === 'login' ? (
                  /* Sign In Form */
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

                      <span className="text-slate-500 cursor-not-allowed">
                        Forgot password?
                      </span>
                    </div>

                    <Button
                      type="submit"
                      variant="electric"
                      size="lg"
                      className="w-full text-sm font-semibold tracking-wide py-3"
                      isLoading={isLoading}
                    >
                      Sign In to Command Center
                    </Button>

                    <div className="text-center pt-2">
                      <p className="text-xs text-slate-400">
                        Don't have an enterprise account?{' '}
                        <button
                          type="button"
                          onClick={() => switchAuthMode('register')}
                          className="text-brand-electric font-semibold hover:underline"
                        >
                          Register here
                        </button>
                      </p>
                    </div>
                  </form>
                ) : (
                  /* Registration Form */
                  <form onSubmit={handleRegisterSubmit(onRegisterSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Input
                          label="Full Name"
                          type="text"
                          placeholder="Sarah Jenkins"
                          leftIcon={<UserIcon className="w-4 h-4" />}
                          error={regErrors.fullName?.message}
                          {...registerField('fullName')}
                        />
                      </div>
                      <div>
                        <Input
                          label="Organization / Fleet Name"
                          type="text"
                          placeholder="Apex Logistics Corp"
                          leftIcon={<Building className="w-4 h-4" />}
                          error={regErrors.organization?.message}
                          {...registerField('organization')}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Operational Role
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'fleet_manager', label: 'Fleet Manager' },
                          { id: 'admin', label: 'Operations Lead' },
                          { id: 'viewer', label: 'Dispatcher' },
                        ].map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setRegisterValue('role', r.id as any)}
                            className={cn(
                              "px-2 py-2 text-xs font-semibold rounded-lg border text-center transition-all",
                              selectedRole === r.id
                                ? "border-brand-electric bg-brand-electric/15 text-brand-electric shadow-sm"
                                : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                            )}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Input
                        label="Work Email Address"
                        type="email"
                        placeholder="dispatcher@company.com"
                        leftIcon={<Mail className="w-4 h-4" />}
                        error={regErrors.email?.message}
                        {...registerField('email')}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Input
                          label="Password"
                          type={showRegPassword ? 'text' : 'password'}
                          placeholder="••••••••••••"
                          leftIcon={<Lock className="w-4 h-4" />}
                          rightIcon={
                            <button
                              type="button"
                              onClick={() => setShowRegPassword(!showRegPassword)}
                              className="hover:text-slate-200 transition"
                            >
                              {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          }
                          error={regErrors.password?.message}
                          {...registerField('password')}
                        />
                      </div>
                      <div>
                        <Input
                          label="Confirm Password"
                          type={showRegConfirmPassword ? 'text' : 'password'}
                          placeholder="••••••••••••"
                          leftIcon={<Lock className="w-4 h-4" />}
                          rightIcon={
                            <button
                              type="button"
                              onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                              className="hover:text-slate-200 transition"
                            >
                              {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          }
                          error={regErrors.confirmPassword?.message}
                          {...registerField('confirmPassword')}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-400 hover:text-slate-300 select-none">
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded border-slate-700 bg-slate-900 text-brand-electric focus:ring-brand-electric"
                          {...registerField('agreeTerms')}
                        />
                        <span>
                          I agree to FleetDash Terms of Service, Operational SLA, and Privacy Policy.
                        </span>
                      </label>
                      {regErrors.agreeTerms?.message && (
                        <p className="mt-1 text-xs text-rose-400">{regErrors.agreeTerms.message}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="electric"
                      size="lg"
                      className="w-full text-sm font-semibold tracking-wide py-3"
                      isLoading={isLoading}
                    >
                      Create FleetDash Account
                    </Button>

                    <div className="text-center pt-2">
                      <p className="text-xs text-slate-400">
                        Already have an account?{' '}
                        <button
                          type="button"
                          onClick={() => switchAuthMode('login')}
                          className="text-brand-electric font-semibold hover:underline"
                        >
                          Sign in here
                        </button>
                      </p>
                    </div>
                  </form>
                )}

                {/* Quick Demo Credentials Footer */}
                <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
                  <span>Demo email: <strong className="text-slate-300">s.jenkins@fleetdash.io</strong></span>
                  <span>Role: <strong className="text-slate-300">Fleet Operations Lead</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. ENTERPRISE FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-electric text-white">
              <Radio className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">
              FLEET<span className="text-brand-electric">DASH</span>
            </span>
            <span className="text-xs text-slate-500 pl-2 border-l border-slate-800">
              Enterprise Fleet Telemetry Platform
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500">
            <a href="#features" className="hover:text-slate-300 transition-colors">Features</a>
            <a href="#performance" className="hover:text-slate-300 transition-colors">Performance</a>
            <button onClick={() => scrollToAuth('login')} className="hover:text-slate-300 transition-colors">Sign In</button>
            <button onClick={() => scrollToAuth('register')} className="hover:text-slate-300 transition-colors">Register</button>
            <button onClick={handleDemoLogin} className="text-amber-400 hover:text-amber-300 transition-colors font-medium">Demo Console</button>
          </div>

          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} FleetDash. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
