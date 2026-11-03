import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreateVehicle } from '@/hooks/useFleetData';
import { useToastStore } from '@/stores/toastStore';
import { Truck, User, MapPin, Gauge } from 'lucide-react';
import { VehicleStatus } from '@/types/vehicle';

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddVehicleModal: React.FC<AddVehicleModalProps> = ({ isOpen, onClose }) => {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [driverName, setDriverName] = useState('');
  const [model, setModel] = useState('Freightliner Cascadia EV');
  const [status, setStatus] = useState<VehicleStatus>('active');
  const [speed, setSpeed] = useState('55');
  const [latitude, setLatitude] = useState('41.8781');
  const [longitude, setLongitude] = useState('-87.6298');
  const [fuelLevel, setFuelLevel] = useState('90');

  const createVehicleMutation = useCreateVehicle();
  const { addToast } = useToastStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id.trim() || !name.trim()) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Vehicle ID and Name are required.',
      });
      return;
    }

    try {
      await createVehicleMutation.mutateAsync({
        id: id.toUpperCase().trim(),
        name: name.trim(),
        driverName: driverName.trim() || 'Unassigned Driver',
        model,
        status,
        speed: Number(speed) || 0,
        heading: Math.floor(Math.random() * 360),
        latitude: Number(latitude) || 41.8781,
        longitude: Number(longitude) || -87.6298,
        fuelLevel: Number(fuelLevel) || 100,
        geofenceStatus: 'inside',
        currentGeofence: 'Metro Distribution Hub A',
        odometer: 12500,
      });

      addToast({
        type: 'success',
        title: 'Vehicle Enrolled',
        message: `Asset ${id.toUpperCase()} successfully added to the active fleet registry.`,
      });

      onClose();
      // Reset form
      setId('');
      setName('');
      setDriverName('');
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Registration Failed',
        message: err instanceof Error ? err.message : 'Failed to register vehicle',
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enroll New Commercial Vehicle"
      description="Register a new fleet asset with real-time GPS coordinates and driver assignment."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Input
              label="Vehicle Identifier"
              placeholder="e.g. VH-1065"
              leftIcon={<Truck className="w-4 h-4 text-slate-400" />}
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
            />
          </div>

          <div>
            <Input
              label="Display Name"
              placeholder="e.g. Fleet Unit #1065"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Input
              label="Assigned Driver"
              placeholder="Driver Full Name"
              leftIcon={<User className="w-4 h-4 text-slate-400" />}
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Vehicle Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-electric"
            >
              <option value="Freightliner Cascadia EV">Freightliner Cascadia EV</option>
              <option value="Volvo VNL 860 Long-Haul">Volvo VNL 860 Long-Haul</option>
              <option value="Kenworth T680 Autonomous-Ready">Kenworth T680 Autonomous-Ready</option>
              <option value="Ford E-Transit Cargo">Ford E-Transit Cargo</option>
              <option value="Peterbilt 579 UltraLoft">Peterbilt 579 UltraLoft</option>
              <option value="Rivian Commercial Van 700">Rivian Commercial Van 700</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Initial Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as VehicleStatus)}
              className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-electric"
            >
              <option value="active">Active</option>
              <option value="idle">Idle</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          <div>
            <Input
              label="Speed (km/h)"
              type="number"
              leftIcon={<Gauge className="w-3.5 h-3.5 text-slate-400" />}
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
              min="0"
              max="200"
            />
          </div>

          <div>
            <Input
              label="Fuel / Battery %"
              type="number"
              value={fuelLevel}
              onChange={(e) => setFuelLevel(e.target.value)}
              min="0"
              max="100"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input
              label="GPS Latitude"
              placeholder="41.8781"
              leftIcon={<MapPin className="w-3.5 h-3.5 text-slate-400" />}
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
          </div>

          <div>
            <Input
              label="GPS Longitude"
              placeholder="-87.6298"
              leftIcon={<MapPin className="w-3.5 h-3.5 text-slate-400" />}
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="electric"
            size="sm"
            isLoading={createVehicleMutation.isPending}
          >
            Register Asset
          </Button>
        </div>
      </form>
    </Modal>
  );
};

