import { Vehicle, FleetStats, DashboardAnalytics } from '@/types/vehicle';

const DRIVERS = [
  'Marcus Vance', 'Elena Rostova', 'David Kim', 'Amara Okafor', 'Liam O\'Connor',
  'Carlos Mendez', 'Aisha Al-Mansoor', 'James Wilson', 'Mei-Ling Chen', 'Dmitri Petrov',
  'Chloe Bennett', 'Tariq Hassan', 'Sofia Rossi', 'Jackson Reed', 'Priya Patel',
  'Johan Lindstrom', 'Fatima Zahra', 'Mateo Hernandez', 'Grace O\'Malley', 'Kenji Sato'
];

const MODELS = [
  'Freightliner Cascadia EV',
  'Volvo VNL 860 Long-Haul',
  'Kenworth T680 Autonomous-Ready',
  'Ford E-Transit Cargo',
  'Peterbilt 579 UltraLoft',
  'Mercedes-Benz Actros GigaSpace',
  'Scania R500 V8',
  'Rivian Commercial Van 700'
];

const GEOFENCE_ZONES = [
  'Metro Distribution Hub A',
  'North Logistics Yard',
  'Port Terminal Bay 4',
  'Midwest Airport Cargo Gate',
  'South Depot Annex'
];

// Center around Chicago Logistics Corridor (41.8781° N, 87.6298° W)
const CENTER_LAT = 41.8781;
const CENTER_LNG = -87.6298;

export function generateMockVehicles(count = 60): Vehicle[] {
  const vehicles: Vehicle[] = [];
  const now = Date.now();

  for (let i = 1; i <= count; i++) {
    const id = `VH-${1000 + i}`;
    const driver = DRIVERS[(i - 1) % DRIVERS.length];
    const model = MODELS[(i - 1) % MODELS.length];

    // Status distribution: ~65% active, ~20% idle, ~15% offline
    let status: 'active' | 'idle' | 'offline' = 'active';
    let speed = Math.floor(35 + Math.random() * 60); // 35 - 95 km/h
    let geofenceStatus: 'inside' | 'breached' | 'clear' | 'none' = 'inside';

    if (i % 7 === 0) {
      status = 'offline';
      speed = 0;
      geofenceStatus = 'none';
    } else if (i % 5 === 0) {
      status = 'idle';
      speed = 0;
      geofenceStatus = 'inside';
    }

    // 4 vehicles flagged with active geofence breach
    if (i === 12 || i === 27 || i === 44 || i === 58) {
      status = 'active';
      speed = Math.floor(75 + Math.random() * 30);
      geofenceStatus = 'breached';
    }

    const latOffset = (Math.sin(i * 1.7) * 0.12) + ((Math.random() - 0.5) * 0.04);
    const lngOffset = (Math.cos(i * 1.3) * 0.14) + ((Math.random() - 0.5) * 0.04);

    vehicles.push({
      id,
      name: `Fleet Unit #${1000 + i}`,
      driverName: driver,
      status,
      speed,
      heading: Math.floor(Math.random() * 360),
      latitude: Number((CENTER_LAT + latOffset).toFixed(6)),
      longitude: Number((CENTER_LNG + lngOffset).toFixed(6)),
      lastUpdated: now - Math.floor(Math.random() * 120_000), // Updated in last 2 mins
      geofenceStatus,
      currentGeofence: GEOFENCE_ZONES[i % GEOFENCE_ZONES.length],
      fuelLevel: Math.floor(25 + Math.random() * 75),
      batteryLevel: Math.floor(30 + Math.random() * 70),
      model,
      odometer: Math.floor(24000 + i * 1420 + Math.random() * 500),
    });
  }

  return vehicles;
}

export const MOCK_VEHICLES = generateMockVehicles(60);

export function getMockFleetStats(vehicles: Vehicle[] = MOCK_VEHICLES): FleetStats {
  const total = vehicles.length;
  const active = vehicles.filter((v) => v.status === 'active').length;
  const idle = vehicles.filter((v) => v.status === 'idle').length;
  const offline = vehicles.filter((v) => v.status === 'offline').length;
  const breached = vehicles.filter((v) => v.geofenceStatus === 'breached').length;

  const totalSpeed = vehicles.reduce((sum, v) => sum + v.speed, 0);
  const averageSpeed = active > 0 ? Math.round(totalSpeed / active) : 0;

  return {
    totalVehicles: total,
    activeVehicles: active,
    idleVehicles: idle,
    offlineVehicles: offline,
    activeAlerts: breached + 2, // Breaches + 2 speed warnings
    eventsPerSecond: 1840,
    averageSpeed,
    connectionStatus: 'connected',
    lastIngestionTime: Date.now(),
  };
}

export const MOCK_DASHBOARD_ANALYTICS: DashboardAnalytics = {
  statusDistribution: [
    { name: 'Active', value: 39, color: '#10B981' },
    { name: 'Idle', value: 12, color: '#F59E0B' },
    { name: 'Offline', value: 9, color: '#64748B' },
  ],
  activityTrends: [
    { time: '00:00', active: 18, idle: 6, offline: 36 },
    { time: '03:00', active: 14, idle: 8, offline: 38 },
    { time: '06:00', active: 29, idle: 11, offline: 20 },
    { time: '09:00', active: 46, idle: 8, offline: 6 },
    { time: '12:00', active: 51, idle: 5, offline: 4 },
    { time: '15:00', active: 48, idle: 7, offline: 5 },
    { time: '18:00', active: 41, idle: 12, offline: 7 },
    { time: '21:00', active: 28, idle: 14, offline: 18 },
  ],
  throughputHistory: [
    { time: '12:00', events: 1420, bytesKb: 380 },
    { time: '12:05', events: 1650, bytesKb: 440 },
    { time: '12:10', events: 1890, bytesKb: 510 },
    { time: '12:15', events: 2100, bytesKb: 565 },
    { time: '12:20', events: 1950, bytesKb: 520 },
    { time: '12:25', events: 2340, bytesKb: 630 },
    { time: '12:30', events: 2510, bytesKb: 675 },
    { time: '12:35', events: 2280, bytesKb: 615 },
  ],
  speedDistribution: [
    { range: '0-20 km/h', count: 14 },
    { range: '21-40 km/h', count: 8 },
    { range: '41-60 km/h', count: 16 },
    { range: '61-80 km/h', count: 17 },
    { range: '80+ km/h', count: 5 },
  ],
  alertBreakdown: [
    { severity: 'critical', count: 4, color: '#EF4444' }, // 4 Geofence Breaches
    { severity: 'warning', count: 7, color: '#F59E0B' },  // Speed / Sensor warnings
    { severity: 'info', count: 15, color: '#3B82F6' },    // Zone Entry / Route Clear
  ],
};
