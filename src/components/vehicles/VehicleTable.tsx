import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Vehicle, VehicleFilterParams } from '@/types/vehicle';
import { useVehicles } from '@/hooks/useFleetData';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { VehicleQuickViewModal } from './VehicleQuickViewModal';
import {
  Search,
  Filter,
  ArrowUpDown,
  Eye,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  RotateCw,
} from 'lucide-react';

interface VehicleTableProps {
  initialSearch?: string;
  onSelectVehicle?: (vehicle: Vehicle) => void;
}

export const VehicleTable: React.FC<VehicleTableProps> = ({ initialSearch = '' }) => {
  const navigate = useNavigate();
  const [params, setParams] = useState<VehicleFilterParams>({
    search: initialSearch,
    status: 'all',
    geofenceStatus: 'all',
    sortBy: 'id',
    sortOrder: 'asc',
    page: 1,
    pageSize: 10,
  });

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useVehicles(params);

  const handleSort = (column: 'id' | 'name' | 'speed' | 'status' | 'lastUpdated') => {
    setParams((prev) => ({
      ...prev,
      sortBy: column,
      sortOrder: prev.sortBy === column && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1, // Reset to first page on sort
    }));
  };

  const handleInspect = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Input
            placeholder="Search by ID, driver, or vehicle name..."
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            value={params.search}
            onChange={(e) => setParams((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
            className="h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 text-[11px]">Status:</span>
            <select
              value={params.status}
              onChange={(e) =>
                setParams((prev) => ({
                  ...prev,
                  status: e.target.value as VehicleFilterParams['status'],
                  page: 1,
                }))
              }
              className="bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All States</option>
              <option value="active">Active Only</option>
              <option value="idle">Idle Only</option>
              <option value="offline">Offline Only</option>
            </select>
          </div>

          {/* Geofence Breach Filter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-xs">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <select
              value={params.geofenceStatus}
              onChange={(e) =>
                setParams((prev) => ({
                  ...prev,
                  geofenceStatus: e.target.value as VehicleFilterParams['geofenceStatus'],
                  page: 1,
                }))
              }
              className="bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Geofence States</option>
              <option value="breached">Breaches Only</option>
              <option value="inside">Inside Perimeter</option>
            </select>
          </div>

          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8 px-2" title="Refresh">
            <RotateCw className="w-3.5 h-3.5 text-slate-500" />
          </Button>
        </div>
      </div>

      {/* Main Vehicle Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-[11px] uppercase font-semibold text-slate-500 dark:text-slate-400 select-none">
              <tr>
                <th
                  onClick={() => handleSort('id')}
                  className="py-3 px-4 cursor-pointer hover:text-brand-electric transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Vehicle ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-brand-electric transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Name & Model</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Driver</th>
                <th
                  onClick={() => handleSort('speed')}
                  className="py-3 px-4 cursor-pointer hover:text-brand-electric transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Speed</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 hidden md:table-cell">GPS Coordinates</th>
                <th
                  onClick={() => handleSort('lastUpdated')}
                  className="py-3 px-4 cursor-pointer hover:text-brand-electric transition hidden sm:table-cell"
                >
                  <div className="flex items-center gap-1">
                    <span>Last Updated</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-4 cursor-pointer hover:text-brand-electric transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Geofence</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-4 w-14" /></td>
                    <td className="py-3 px-4 hidden md:table-cell"><Skeleton className="h-4 w-28" /></td>
                    <td className="py-3 px-4 hidden sm:table-cell"><Skeleton className="h-4 w-20" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-6 w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-rose-500 font-medium">
                    Failed to retrieve vehicle records. Please verify connection.
                  </td>
                </tr>
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12">
                    <EmptyState
                      title="No matching vehicles found"
                      description="Try adjusting your search criteria, status filter, or geofence parameters."
                      actionLabel="Reset Filters"
                      onAction={() =>
                        setParams({
                          search: '',
                          status: 'all',
                          geofenceStatus: 'all',
                          sortBy: 'id',
                          sortOrder: 'asc',
                          page: 1,
                          pageSize: 10,
                        })
                      }
                    />
                  </td>
                </tr>
              ) : (
                data.items.map((vehicle) => {
                  const isBreached = vehicle.geofenceStatus === 'breached';

                  return (
                    <tr
                      key={vehicle.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Vehicle ID */}
                      <td className="py-3 px-4 font-mono font-bold text-brand-electric">
                        {vehicle.id}
                      </td>

                      {/* Name & Model */}
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                        <div className="flex flex-col">
                          <span>{vehicle.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{vehicle.model}</span>
                        </div>
                      </td>

                      {/* Driver */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {vehicle.driverName || '—'}
                      </td>

                      {/* Speed */}
                      <td className="py-3 px-4 font-mono">
                        <span
                          className={
                            vehicle.speed > 80
                              ? 'text-rose-600 dark:text-rose-400 font-bold'
                              : vehicle.speed > 0
                              ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                              : 'text-slate-400'
                          }
                        >
                          {vehicle.speed} km/h
                        </span>
                      </td>

                      {/* Coordinates */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 hidden md:table-cell">
                        {vehicle.latitude.toFixed(4)}, {vehicle.longitude.toFixed(4)}
                      </td>

                      {/* Last Updated */}
                      <td className="py-3 px-4 text-[11px] text-slate-500 dark:text-slate-400 hidden sm:table-cell font-mono">
                        {new Date(vehicle.lastUpdated).toLocaleTimeString()}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <StatusBadge status={vehicle.status} />
                      </td>

                      {/* Geofence Status */}
                      <td className="py-3 px-4">
                        {isBreached ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            BREACH
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block max-w-[120px]">
                            {vehicle.currentGeofence || 'Clear'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleInspect(vehicle)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
                            title="Quick Inspect"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/live-map?focus=${vehicle.id}`)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-electric dark:hover:bg-slate-800 transition"
                            title="Locate on Live Map"
                          >
                            <MapPin className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        {data && data.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 dark:border-slate-800 px-4 py-3 gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span>Showing</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                {Math.min((data.page - 1) * data.pageSize + 1, data.total)}-
                {Math.min(data.page * data.pageSize, data.total)}
              </span>
              <span>of</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                {data.total}
              </span>
              <span>units</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px]">Rows per page:</span>
              <select
                value={params.pageSize}
                onChange={(e) =>
                  setParams((prev) => ({
                    ...prev,
                    pageSize: Number(e.target.value),
                    page: 1,
                  }))
                }
                className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>

              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={data.page <= 1}
                  onClick={() => setParams((prev) => ({ ...prev, page: (prev.page || 1) - 1 }))}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="px-2 font-mono text-xs">
                  {data.page} / {data.totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={data.page >= data.totalPages}
                  onClick={() => setParams((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))}
                  className="h-8 w-8"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick View Modal */}
      <VehicleQuickViewModal
        vehicle={selectedVehicle}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
