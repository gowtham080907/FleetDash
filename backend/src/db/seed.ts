import bcrypt from 'bcryptjs';
import { Vehicle } from '../types/vehicle';
import { GeofenceZone, GeofenceAlert } from '../types/geofence';
import { UserRecord } from '../types/auth';

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

const CENTER_LAT = 41.8781;
const CENTER_LNG = -87.6298;

export function getSeedVehicles(count = 60): Vehicle[] {
  const vehicles: Vehicle[] = [];
  const now = Date.now();

  for (let i = 1; i <= count; i++) {
    const id = `VH-${1000 + i}`;
    const driver = DRIVERS[(i - 1) % DRIVERS.length];
    const model = MODELS[(i - 1) % MODELS.length];

    let status: 'active' | 'idle' | 'offline' = 'active';
    let speed = Math.floor(35 + (i * 7) % 55); // 35 - 90 km/h
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

    if (i === 12 || i === 27 || i === 44 || i === 58) {
      status = 'active';
      speed = Math.floor(75 + (i * 3) % 25);
      geofenceStatus = 'breached';
    }

    // Deterministic jitter around Chicago logistics corridors
    const angle = ((i * 137.5) * Math.PI) / 180;
    const distanceKm = 2 + (i % 15) * 1.8;
    const latDelta = (distanceKm * Math.cos(angle)) / 111;
    const lngDelta = (distanceKm * Math.sin(angle)) / (111 * Math.cos((CENTER_LAT * Math.PI) / 180));

    vehicles.push({
      id,
      name: `Fleet Unit #${1000 + i}`,
      driverName: driver,
      status,
      speed,
      heading: (i * 47) % 360,
      latitude: Number((CENTER_LAT + latDelta).toFixed(6)),
      longitude: Number((CENTER_LNG + lngDelta).toFixed(6)),
      lastUpdated: now - (i % 60) * 1000,
      geofenceStatus,
      currentGeofence: i % 2 === 0 ? 'O\'Hare Logistics Air Hub' : 'Midwest Central Freight Depot',
      fuelLevel: Math.max(10, 100 - ((i * 13) % 90)),
      batteryLevel: Math.max(15, 100 - ((i * 17) % 85)),
      model,
      odometer: 10000 + i * 450,
    });
  }

  return vehicles;
}

export const SEED_GEOFENCES: GeofenceZone[] = [
  {
    id: 'geo-ohare-hub',
    name: "O'Hare Logistics Air Hub",
    type: 'circle',
    center: [41.9742, -87.9073],
    radiusMeters: 6500,
    color: '#0066FF',
    fillOpacity: 0.15,
    speedLimitKmH: 45,
    description: 'High-security priority air freight handling corridor',
    visible: true,
    activeVehiclesCount: 18,
    breachCount: 1,
  },
  {
    id: 'geo-central-freight',
    name: 'Midwest Central Freight Depot',
    type: 'polygon',
    coordinates: [
      [41.9100, -87.7200],
      [41.9100, -87.6100],
      [41.8300, -87.6100],
      [41.8300, -87.7200],
    ],
    color: '#10B981',
    fillOpacity: 0.12,
    speedLimitKmH: 60,
    description: 'Central distribution hub and inland intermodal yard',
    visible: true,
    activeVehiclesCount: 26,
    breachCount: 2,
  },
  {
    id: 'geo-south-marine',
    name: 'South Shore Marine Port Gate',
    type: 'circle',
    center: [41.7580, -87.5540],
    radiusMeters: 5500,
    color: '#F59E0B',
    fillOpacity: 0.15,
    speedLimitKmH: 35,
    description: 'Port container terminal transfer and customs yard',
    visible: true,
    activeVehiclesCount: 12,
    breachCount: 1,
  },
  {
    id: 'geo-north-corridor',
    name: 'North Interstate Freight Belt',
    type: 'polygon',
    coordinates: [
      [42.0400, -87.8500],
      [42.0400, -87.7500],
      [41.9600, -87.7500],
      [41.9600, -87.8500],
    ],
    color: '#8B5CF6',
    fillOpacity: 0.12,
    speedLimitKmH: 80,
    description: 'Heavy industrial transit route and staging bays',
    visible: true,
    activeVehiclesCount: 14,
    breachCount: 0,
  },
];

export const SEED_ALERTS: GeofenceAlert[] = [
  {
    id: 'alt-101',
    vehicleId: 'VH-1012',
    geofenceId: 'geo-ohare-hub',
    geofenceName: "O'Hare Logistics Air Hub",
    type: 'breach',
    severity: 'critical',
    timestamp: Date.now() - 4 * 60 * 1000,
    latitude: 41.9812,
    longitude: -87.9150,
    speed: 84.2,
    acknowledged: false,
  },
  {
    id: 'alt-102',
    vehicleId: 'VH-1027',
    geofenceId: 'geo-central-freight',
    geofenceName: 'Midwest Central Freight Depot',
    type: 'breach',
    severity: 'critical',
    timestamp: Date.now() - 11 * 60 * 1000,
    latitude: 41.8210,
    longitude: -87.6050,
    speed: 76.5,
    acknowledged: false,
  },
  {
    id: 'alt-103',
    vehicleId: 'VH-1044',
    geofenceId: 'geo-central-freight',
    geofenceName: 'Midwest Central Freight Depot',
    type: 'breach',
    severity: 'critical',
    timestamp: Date.now() - 22 * 60 * 1000,
    latitude: 41.9150,
    longitude: -87.6200,
    speed: 91.0,
    acknowledged: true,
  },
  {
    id: 'alt-104',
    vehicleId: 'VH-1058',
    geofenceId: 'geo-south-marine',
    geofenceName: 'South Shore Marine Port Gate',
    type: 'breach',
    severity: 'critical',
    timestamp: Date.now() - 35 * 60 * 1000,
    latitude: 41.7500,
    longitude: -87.5400,
    speed: 78.0,
    acknowledged: true,
  },
];

export function getSeedUsers(): UserRecord[] {
  const salt = bcrypt.genSaltSync(10);
  const now = Date.now();

  return [
    {
      id: 'usr-demo-01',
      name: 'Sarah Jenkins',
      email: 's.jenkins@fleetdash.io',
      role: 'fleet_manager',
      department: 'Real-Time Dispatch Operations',
      passwordHash: bcrypt.hashSync('FleetDemo2026!', salt),
      createdAt: now - 30 * 86400000,
      updatedAt: now,
    },
    {
      id: 'usr-admin-01',
      name: 'Fleet Administrator',
      email: 'admin@fleetdash.io',
      role: 'admin',
      department: 'Fleet Infrastructure & Systems',
      passwordHash: bcrypt.hashSync('Admin123!', salt),
      createdAt: now - 60 * 86400000,
      updatedAt: now,
    },
    {
      id: 'usr-dispatch-01',
      name: 'Marcus Dispatcher',
      email: 'dispatcher@fleetdash.io',
      role: 'viewer',
      department: 'Ground Operations Desk',
      passwordHash: bcrypt.hashSync('Dispatch2026!', salt),
      createdAt: now - 15 * 86400000,
      updatedAt: now,
    },
  ];
}

