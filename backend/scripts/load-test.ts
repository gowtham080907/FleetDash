import { io as ioClient, Socket } from 'socket.io-client';
import { RawCoordinatePoint } from '../src/types/telemetry';
import { decodeTelemetryBatch } from '../src/workers/binaryEncoder';

interface LoadTestOptions {
  url: string;
  socketUrl: string;
  targetRate: number; // records / second
  durationSec: number;
  batchSize: number;
}

function parseArgs(): LoadTestOptions {
  const args = process.argv.slice(2);
  const options: LoadTestOptions = {
    url: 'http://localhost:5000/api/telemetry/ingest',
    socketUrl: 'http://localhost:5000',
    targetRate: 2000,
    durationSec: 10,
    batchSize: 200,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--rate' && args[i + 1]) {
      options.targetRate = parseInt(args[++i]!, 10) || options.targetRate;
    } else if (arg === '--duration' && args[i + 1]) {
      options.duration = parseInt(args[++i]!, 10) || options.duration;
    } else if (arg === '--url' && args[i + 1]) {
      options.url = args[++i]!;
    } else if (arg === '--socketUrl' && args[i + 1]) {
      options.socketUrl = args[++i]!;
    } else if (arg === '--batchSize' && args[i + 1]) {
      options.batchSize = parseInt(args[++i]!, 10) || options.batchSize;
    }
  }

  return options;
}

function generateBatch(size: number, batchIndex: number): RawCoordinatePoint[] {
  const points: RawCoordinatePoint[] = [];
  const baseLat = 17.385;
  const baseLng = 78.4867;
  const now = Date.now();

  for (let i = 0; i < size; i++) {
    const vId = (batchIndex * size + i) % 3000 + 1;
    points.push({
      vehicleId: `VH-${1000 + vId}`,
      latitude: Number((baseLat + (Math.random() - 0.5) * 0.1).toFixed(6)),
      longitude: Number((baseLng + (Math.random() - 0.5) * 0.1).toFixed(6)),
      speed: Math.round(20 + Math.random() * 80),
      heading: Math.round(Math.random() * 360),
      timestamp: now,
      status: 'active',
      geofenceStatus: 'inside',
    });
  }

  return points;
}

async function runLoadTest(): Promise<void> {
  const options = parseArgs();

  console.log('========================================================');
  console.log(' FleetDash High-Throughput Load & Zero-Omission Test');
  console.log('========================================================');
  console.log(` Ingest URL:         ${options.url}`);
  console.log(` Socket.IO URL:      ${options.socketUrl}`);
  console.log(` Target Rate:        ${options.targetRate} records/sec`);
  console.log(` Test Duration:      ${options.durationSec} seconds`);
  console.log(` Batch Size:         ${options.batchSize} records/batch`);
  console.log('--------------------------------------------------------');

  // 1. Establish Socket.IO Client for verifying binary reception
  console.log('[Test Setup] Connecting Socket.IO client...');
  let clientReceivedRecords = 0;
  let clientFramesCount = 0;
  let clientBinaryVerified = false;
  let sampleDecodedRecord: unknown = null;

  const socket: Socket = ioClient(options.socketUrl, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    timeout: 10000,
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Socket client failed to connect within 5s')), 5000);
    socket.on('connect', () => {
      clearTimeout(timeout);
      console.log(`[Test Setup] Socket.IO client connected (id: ${socket.id}).`);
      resolve();
    });
    socket.on('connect_error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  // Listen for binary telemetry:batch frames
  socket.on('telemetry:batch', (payload: unknown) => {
    clientFramesCount++;

    const isBinary = payload instanceof ArrayBuffer || Buffer.isBuffer(payload);
    if (!clientBinaryVerified && isBinary) {
      clientBinaryVerified = true;
    }

    if (isBinary) {
      const decoded = decodeTelemetryBatch(payload as ArrayBuffer | Buffer);
      clientReceivedRecords += decoded.records.length;
      if (!sampleDecodedRecord && decoded.records.length > 0) {
        sampleDecodedRecord = decoded.records[0];
      }
    }
  });

  // Wait briefly for initial snapshot frame (if server already had vehicles in memory)
  let initialSnapshotCount = 0;
  await new Promise((r) => setTimeout(r, 300));
  if (clientReceivedRecords > 0) {
    initialSnapshotCount = clientReceivedRecords;
    console.log(`[Test Setup] Received initial snapshot of ${initialSnapshotCount} vehicle records. Resetting stream counter.`);
    clientReceivedRecords = 0;
  }

  // 2. Fetch initial baseline pipeline stats
  const initialStatsRes = await fetch('http://localhost:5000/api/telemetry/pipeline-stats');
  const initialStats = await initialStatsRes.json() as { accepted?: number };
  const baselineAccepted = initialStats.accepted ?? 0;

  // 3. Ingestion Loop (High-throughput with drift compensation)
  let totalSent = 0;
  let totalAccepted = 0;
  let totalRejected = 0;
  let totalErrors = 0;
  const ingestLatencies: number[] = [];
  const healthLatencies: number[] = [];

  const batchSize = options.batchSize;
  const targetBatchesTotal = Math.round((options.targetRate * options.durationSec) / batchSize);
  const totalDurationMs = options.durationSec * 1000;

  console.log(`[Load Generator] Starting dispatch of ${targetBatchesTotal} batches (${batchSize} records each)...`);
  const startTime = Date.now();
  let batchIndex = 0;

  while (batchIndex < targetBatchesTotal) {
    const batch = generateBatch(batchSize, batchIndex++);

    try {
      const t0 = performance.now();
      const res = await fetch(options.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: batch }),
      });
      const t1 = performance.now();
      ingestLatencies.push(t1 - t0);
      totalSent += batch.length;

      if (res.status === 202) {
        const body = await res.json() as { accepted?: number; rejected?: unknown[] };
        totalAccepted += body.accepted ?? batch.length;
        totalRejected += body.rejected?.length ?? 0;
      } else {
        totalErrors += batch.length;
      }
    } catch {
      totalErrors += batch.length;
    }

    // Measure health latency concurrently
    if (batchIndex % 10 === 0) {
      void (async () => {
        try {
          const ht0 = performance.now();
          const hres = await fetch('http://localhost:5000/api/health');
          if (hres.ok) {
            healthLatencies.push(performance.now() - ht0);
          }
        } catch {
          // ignore background health probe error
        }
      })();
    }

    // Drift-compensated sleep
    const expectedElapsedMs = (batchIndex / targetBatchesTotal) * totalDurationMs;
    const actualElapsedMs = Date.now() - startTime;
    const sleepMs = expectedElapsedMs - actualElapsedMs;
    if (sleepMs > 2) {
      await new Promise((r) => setTimeout(r, sleepMs));
    }
  }

  // 4. Grace period for pipeline flush
  console.log('[Load Generator] Ingestion ended. Awaiting final frame flushes (600ms)...');
  await new Promise((r) => setTimeout(r, 600));

  // 5. Query final pipeline stats
  const finalStatsRes = await fetch('http://localhost:5000/api/telemetry/pipeline-stats');
  const finalStats = await finalStatsRes.json() as {
    accepted: number;
    published: number;
    broadcast: number;
    dropped: number;
    eventsPerSecond: number;
    broker: { type: string; healthy: boolean };
    socket: { connectedClients: number; skippedFrames: number };
  };

  socket.disconnect();

  const actualDurationSec = (Date.now() - startTime) / 1000;
  const achievedRate = Math.round(totalSent / actualDurationSec);

  // Latency percentiles
  ingestLatencies.sort((a, b) => a - b);
  const p50 = ingestLatencies[Math.floor(ingestLatencies.length * 0.5)]?.toFixed(2) || '0';
  const p95 = ingestLatencies[Math.floor(ingestLatencies.length * 0.95)]?.toFixed(2) || '0';
  const p99 = ingestLatencies[Math.floor(ingestLatencies.length * 0.99)]?.toFixed(2) || '0';

  healthLatencies.sort((a, b) => a - b);
  const hp50 = healthLatencies[Math.floor(healthLatencies.length * 0.5)]?.toFixed(2) || '0';
  const hp95 = healthLatencies[Math.floor(healthLatencies.length * 0.95)]?.toFixed(2) || '0';

  const acceptedDelta = finalStats.accepted - baselineAccepted;
  const omissionGap = acceptedDelta - clientReceivedRecords;

  const mem = process.memoryUsage();
  const heapUsedMb = (mem.heapUsed / 1024 / 1024).toFixed(1);
  const rssMb = (mem.rss / 1024 / 1024).toFixed(1);

  console.log('========================================================');
  console.log(' LOAD VALIDATION & DATA INTEGRITY REPORT');
  console.log('========================================================');
  console.log(` Broker Mode Active:     ${finalStats.broker.type.toUpperCase()} (healthy: ${finalStats.broker.healthy})`);
  console.log(` Duration:               ${actualDurationSec.toFixed(2)}s`);
  console.log(` Total Records Sent:     ${totalSent.toLocaleString()}`);
  console.log(` Server Accepted:        ${totalAccepted.toLocaleString()} (delta: ${acceptedDelta.toLocaleString()})`);
  console.log(` Server Rejected:        ${totalRejected}`);
  console.log(` Server Dropped:         ${finalStats.dropped}`);
  console.log(` Server Published:       ${finalStats.published.toLocaleString()}`);
  console.log(` Socket Frames Emitted:  ${clientFramesCount}`);
  console.log(` Client Received:        ${clientReceivedRecords.toLocaleString()} records`);
  console.log(` Data Omission Gap:      ${omissionGap} (${omissionGap === 0 ? 'ZERO OMISSION VERIFIED' : 'GAP DETECTED'})`);
  console.log(` Sustained Ingest Rate:  ${achievedRate.toLocaleString()} records/sec`);
  console.log(` Rolling EPS Metric:     ${finalStats.eventsPerSecond.toLocaleString()} records/sec`);
  console.log('--------------------------------------------------------');
  console.log(` Ingest HTTP Latency:    p50: ${p50}ms | p95: ${p95}ms | p99: ${p99}ms`);
  console.log(` Health HTTP Latency:    p50: ${hp50}ms | p95: ${hp95}ms`);
  console.log(` Memory Footprint:       Heap: ${heapUsedMb} MB | RSS: ${rssMb} MB`);
  console.log(` Binary Protocol Check:  ${clientBinaryVerified ? 'PASS (ArrayBuffer / binary delivery verified)' : 'FAIL'}`);
  if (sampleDecodedRecord) {
    console.log(` Sample Decoded Record:  ${JSON.stringify(sampleDecodedRecord)}`);
  }
  console.log('========================================================');

  if (achievedRate < 1800) {
    console.warn(`[Warning] Achieved rate ${achievedRate} is below the 2,000 records/sec target.`);
  }
}

runLoadTest().catch((err) => {
  console.error('[LoadTest] Error running load test:', err);
  process.exit(1);
});
