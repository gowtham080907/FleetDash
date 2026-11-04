// Event loop sanity test:
// Concurrently sends a 10,000-point batch to /api/telemetry/process-batch
// and fires GET /api/health to measure event loop unblocking.

const http = require('http');

function postBatch(points) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ points });
    const req = http.request(
      'http://localhost:5000/api/telemetry/process-batch',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getHealth() {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const req = http.request('http://localhost:5000/api/health', (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        const latencyMs = Number((performance.now() - start).toFixed(2));
        resolve({ status: res.statusCode, latencyMs, data: JSON.parse(body) });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('Generating 5,000 coordinate points...');
  const points = [];
  for (let i = 1; i <= 5000; i++) {
    points.push({
      vehicleId: `VH-${i}`,
      latitude: 17.385044 + (i % 100) * 0.001,
      longitude: 78.486671 + (i % 100) * 0.001,
      speed: 45.0 + (i % 50),
      heading: (i * 15) % 360,
      timestamp: Date.now(),
    });
  }

  console.log('Dispatching 5,000-point batch and concurrent health check...');
  const batchStart = performance.now();
  const batchPromise = postBatch(points);

  // Slight delay to ensure the batch request has reached server and worker
  await new Promise((r) => setTimeout(r, 10));

  const healthRes = await getHealth();
  const batchRes = await batchPromise;
  const batchTotalMs = Number((performance.now() - batchStart).toFixed(2));

  console.log('=== Event Loop Sanity Check Results ===');
  console.log(`Health Check Status:   ${healthRes.status} (OK)`);
  console.log(`Health Latency:        ${healthRes.latencyMs} ms`);
  console.log(`Batch Received:        ${batchRes.data.stats.received} points`);
  console.log(`Batch Valid:           ${batchRes.data.stats.valid} points`);
  console.log(`Worker Duration:       ${batchRes.data.stats.durationMs} ms`);
  console.log(`Total HTTP Batch Time: ${batchTotalMs} ms`);
  console.log(`Worker Pool Ready:     ${healthRes.data.worker.ready}`);
  console.log('========================================');
}

run().catch((err) => {
  console.error('Error during sanity check:', err);
  process.exit(1);
});
