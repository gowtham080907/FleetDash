import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAlertStore } from '@/stores/alertStore';
import { useToastStore } from '@/stores/toastStore';
import { ShieldAlert, Gauge } from 'lucide-react';

interface CreateGeofenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateGeofenceModal: React.FC<CreateGeofenceModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'circle' | 'polygon'>('circle');
  const [speedLimitKmH, setSpeedLimitKmH] = useState('50');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#0066FF');
  // For circle
  const [centerLat, setCenterLat] = useState('41.8781');
  const [centerLng, setCenterLng] = useState('-87.6298');
  const [radiusMeters, setRadiusMeters] = useState('5000');
  // For polygon
  const [polygonCoords, setPolygonCoords] = useState(
    '41.9000, -87.7000\n41.9000, -87.6000\n41.8200, -87.6000\n41.8200, -87.7000'
  );

  const [isLoading, setIsLoading] = useState(false);
  const { addGeofence } = useAlertStore();
  const { addToast } = useToastStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Zone name is required.' });
      return;
    }

    setIsLoading(true);
    try {
      if (type === 'circle') {
        await addGeofence({
          name: name.trim(),
          type: 'circle',
          center: [Number(centerLat) || 41.8781, Number(centerLng) || -87.6298],
          radiusMeters: Number(radiusMeters) || 5000,
          color,
          fillOpacity: 0.15,
          speedLimitKmH: Number(speedLimitKmH) || 50,
          description: description.trim() || 'Radial security perimeter',
          visible: true,
        });
      } else {
        // Parse polygon coordinates lines
        const lines = polygonCoords
          .trim()
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);

        const coords: [number, number][] = [];
        for (const line of lines) {
          const parts = line.split(',').map((p) => Number(p.trim()));
          if (parts.length >= 2 && !isNaN(parts[0]!) && !isNaN(parts[1]!)) {
            coords.push([parts[0]!, parts[1]!]);
          }
        }

        if (coords.length < 3) {
          throw new Error('Polygon must contain at least 3 vertex coordinates (lat, lng).');
        }

        await addGeofence({
          name: name.trim(),
          type: 'polygon',
          coordinates: coords,
          color,
          fillOpacity: 0.12,
          speedLimitKmH: Number(speedLimitKmH) || 60,
          description: description.trim() || 'Polygonal transit corridor',
          visible: true,
        });
      }

      addToast({
        type: 'success',
        title: 'Geofence Created',
        message: `Perimeter "${name}" active in real-time monitoring engine.`,
      });

      onClose();
      setName('');
      setDescription('');
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Creation Failed',
        message: err instanceof Error ? err.message : 'Failed to create geofence',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Define Operational Geofence Perimeter"
      description="Configure radial or polygon boundary coordinates and enforced velocity ceilings."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            label="Geofence Name"
            placeholder="e.g. O'Hare Air Cargo North Gate"
            leftIcon={<ShieldAlert className="w-4 h-4 text-slate-400" />}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Perimeter Geometry Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'circle' | 'polygon')}
              className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-electric"
            >
              <option value="circle">Radial (Circular Hub)</option>
              <option value="polygon">Custom Polygon Boundary</option>
            </select>
          </div>

          <div>
            <Input
              label="Speed Ceiling (km/h)"
              type="number"
              leftIcon={<Gauge className="w-4 h-4 text-slate-400" />}
              value={speedLimitKmH}
              onChange={(e) => setSpeedLimitKmH(e.target.value)}
              min="10"
              max="150"
            />
          </div>
        </div>

        {type === 'circle' ? (
          <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div>
              <Input
                label="Center Lat"
                value={centerLat}
                onChange={(e) => setCenterLat(e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Center Lng"
                value={centerLng}
                onChange={(e) => setCenterLng(e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Radius (Meters)"
                type="number"
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(e.target.value)}
                min="500"
                max="50000"
              />
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Vertices (lat, lng per line, min 3 points)
            </label>
            <textarea
              rows={4}
              value={polygonCoords}
              onChange={(e) => setPolygonCoords(e.target.value)}
              className="w-full font-mono text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-electric"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Boundary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-14 rounded cursor-pointer border border-slate-300 dark:border-slate-700 p-0.5 bg-transparent"
              />
              <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{color}</span>
            </div>
          </div>

          <div>
            <Input
              label="Operational Description"
              placeholder="e.g. Priority Logistics Bay"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="electric" size="sm" isLoading={isLoading}>
            Deploy Boundary
          </Button>
        </div>
      </form>
    </Modal>
  );
};
