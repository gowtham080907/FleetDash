import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-slate-100">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight font-mono text-white">404</h1>
          <h2 className="text-lg font-bold text-slate-200">Route Coordinates Not Found</h2>
          <p className="text-xs text-slate-400">
            The telemetry path you requested does not correspond to an active operational module or fleet endpoint.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Previous View
          </Button>
          <Button
            variant="electric"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto"
          >
            <Home className="w-4 h-4 mr-1.5" />
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
