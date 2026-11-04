import { RawCoordinatePoint } from '../src/types/telemetry';

interface SimulatorOptions {
  vehicles: number;
  rate: number; // records per second
  duration: number; // seconds
  url: string;
  batchSize: number;
}

function parseArgs(): SimulatorOptions {
  const args = process.argv.slice(2);
  const options: SimulatorOptions = {
    vehicles: 2000,
    rate: 2000,
    duration: 15,
    url: 'http://localhost:5000/api/telemetry/ingest',
    batchSize: 200,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--vehicles' && args[i + 1]) {
      options.vehicles = parseInt(args[++i]!, 10) || options.vehicles;
    } else if (arg === '--rate' && args[i + 1]) {
      options.rate = parseInt(args[++i]!, 10) || options.rate;
    } else if (arg === '--duration' && args[i + 1]) {
      options.duration = parseInt(args[++i]!, 10) || options.duration;
    } else if (arg === '--url' && args[i + 1]) {
      options.url = args[++i]!;
    } else if (arg === '--batchSize' && args[i + 1]) {
      options.batchSize = parseInt(args[++i]!, 10) || options.batchSize;
    }
  }

  return options;
}

interface VehicleState {
  id: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  status: 'active' | 'idle' | 'offline';
  geofenceStatus: 'inside' | 'breached' | 'clear' | 'none';
}

function initVehicles(count: number): VehicleState[] {
  const centerLat = 17.3850;
  const centerLng = 78.4867;
  const vehicles: VehicleState[] = [];

  for (let i = 1; i <= count; i++) {
    const latOffset = (Math.random() - 0.5) * 0.15;
    const lngOffset = (Math.random() - 0.5) * 0.15;
    const speed = Math.round(20 + Math.random() * 70); // 20 - 90 km/h
    const heading = Math.round(Math.random() * 360);

    const statusRoll = Math.random();
    const status = statusRoll < 0.85 ? 'active' : statusRoll < 0.95 ? 'idle' : 'offline';

    vehicles.push({
      id: `VH-${1000 + i}`,
      lat: Number((centerLat + latOffset).toFixed(6)),
      lng: Number((centerLng + lngOffset).toFixed(6)),
      speed,
      heading,
      status,
      geofenceStatus: 'inside',
    });
  }

  return vehicles;
}

function updateVehicle(v: VehicleState, deltaSec: number): void {
  if (v.status !== 'active') return;

  // Approx conversion: 1 deg lat ~ 111 km, 1 deg lng ~ 111 * cos(lat) km
  const speedKmPerSec = v.speed / 3600;
  const distKm = speedKmPerSec * deltaSec;

  const rad = (v.heading * Math.PI) / 180;
  const deltaLat = (distKm * Math.cos(rad)) / 111;
  const deltaLng = (distKm * Math.sin(rad)) / (111 * Math.cos((v.lat * Math.PI) / 180));

  v.lat = Number((v.lat + deltaLat).toFixed(6));
  v.lng = Number((v.lng + deltaLng).toFixed(6));

  // Small heading drift
  v.heading = (v.heading + Math.round((Math.random() - 0.5) * 10) + 360) % 360;

  // Occasional speed change
  if (Math.random() < 0.1) {
    v.speed = Math.max(10, Math.min(120, v.speed + Math.round((Math.random() - 0.5) * 15)));
  }
}

async function runSimulator(): Promise<void> {
  const options = parseArgs();
  console.log('========================================================');
  console.log(' FleetDash Telemetry Fleet Simulator (Week 2)');
  console.log('========================================================');
  console.log(` Target URL:        ${options.url}`);
  console.log(` Simulated Fleet:   ${options.vehicles} vehicles`);
  console.log(` Ingestion Target:  ${options.rate} records/sec`);
  console.log(` Run Duration:      ${options.duration} seconds`);
  console.log(` Batch Size:        ${options.batchSize} points/batch`);
  console.log('--------------------------------------------------------');

  const vehicles = initVehicles(options.vehicles);
  let totalSent = 0;
  let totalAccepted = 0;
  let totalRejected = 0;
  let totalErrors = 0;
  const latencies: number[] = [];

  const batchesPerSec = Math.max(1, Math.round(options.rate / options.batchSize));
  const intervalMs = Math.round(1000 / batchesPerSec);

  const startTime = Date.now();
  const endTime = startTime + options.duration * 1000;
  let vehicleCursor = 0;

  console.log(`Sending ${batchesPerSec} batch(es) of size ${options.batchSize} every ~${intervalMs}ms...`);

  while (Date.now() < endTime) {
    const batchStart = Date.now();
    const batchPoints: RawCoordinatePoint[] = [];

    for (let i = 0; i < options.batchSize; i++) {
      const v = vehicles[vehicleCursor]!;
      vehicleCursor = (vehicleCursor + 1) % vehicles.length;

      updateVehicle(v, 0.5);

      batchPoints.push({
        vehicleId: v.id,
        latitude: v.lat,
        longitude: v.lng,
        speed: v.speed,
        heading: v.heading,
        timestamp: Date.now(),
        status: v.status,
        geofenceStatus: v.geofenceStatus,
      });
    }

    try {
      const reqStart = performance.now();
      const res = await fetch(options.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: batchPoints }),
      });

      const reqDuration = performance.now() - reqStart;
      latencies.push(reqDuration);
      totalSent += batchPoints.length;

      if (res.status === 202) {
        const body = await res.json() as { accepted?: number; rejected?: unknown[] };
        totalAccepted += body.accepted ?? batchPoints.length;
        totalRejected += body.rejected?.length ?? 0;
      } else {
        totalErrors += batchPoints.length;
        const errText = await res.text();
        console.warn(`[Simulator] Non-202 status: ${res.status} - ${errText}`);
      }
    } catch (err) {
      totalErrors += batchPoints.length;
      console.error('[Simulator] Network dispatch error:', err instanceof Error ? err.message : String(err));
    }

    const elapsedMs = Date.now() - batchStart;
    const sleepMs = Math.max(0, intervalMs - elapsedMs);
    if (sleepMs > 0) {
      await new Promise((r) => setTimeout(r, sleepMs));
    }
  }

  const actualDurationSec = (Date.now() - startTime) / 1000;
  const achievedRate = Math.round(totalSent / actualDurationSec);
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)]?.toFixed(1) || '0';
  const p95 = latencies[Math.floor(latencies.length * 0.95)]?.toFixed(1) || '0';
  const p99 = latencies[Math.floor(latencies.length * 0.99)]?.toFixed(1) || '0';

  console.log('--------------------------------------------------------');
  console.log(' Simulation Complete — Summary');
  console.log('--------------------------------------------------------');
  console.log(` Total Records Sent:     ${totalSent.toLocaleString()}`);
  console.log(` Total Accepted (202):   ${totalAccepted.toLocaleString()}`);
  console.log(` Total Rejected (bad):   ${totalRejected}`);
  console.log(` Total Errors / Dropped: ${totalErrors}`);
  console.log(` Elapsed Duration:       ${actualDurationSec.toFixed(2)}s`);
  console.log(` Achieved Ingest Rate:   ${achievedRate.toLocaleString()} records/sec`);
  console.log(` HTTP Ingest Latency:    p50: ${p50}ms | p95: ${p95}ms | p99: ${p99}ms`);
  console.log('========================================================');
}

runSimulator().catch((err) => {
  console.error('[Simulator] Fatal error:', err);
  process.exit(1);
});
