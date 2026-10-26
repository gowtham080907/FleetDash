import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { VehicleTable } from '@/components/vehicles/VehicleTable';
import { Truck } from 'lucide-react';

export const VehiclesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const search = searchParams.get('search') || '';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Truck className="w-5 h-5 text-brand-electric" />
          Vehicle Fleet Registry
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Search, filter by operational status, inspect speed metrics, and track individual vehicle telemetry.
        </p>
      </div>

      <VehicleTable initialSearch={search} />
    </div>
  );
};
