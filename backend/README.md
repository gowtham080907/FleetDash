# FleetDash Backend — Week 2 Caching & Binary Transport

High-throughput, event-driven Node.js + Express + TypeScript telemetry microservice with multi-core `worker_threads` for CPU-intensive coordinate validation and binary encoding, Redis Pub/Sub message broker abstraction with automatic in-memory fallback, and a duplex Socket.IO server utilizing 32-byte ArrayBuffer frames for real-time frontend streaming.

---

## 1. Week 2 Implementation Overview

### What Was Implemented:
- **Redis Pub/Sub Message Broker (`src/services/broker/`):**
  - Clean `MessageBroker` abstraction supporting both `RedisBroker` (ioredis) and in-process `MemoryBroker`.
  - **Two-Connection Architecture:** Separate dedicated publisher and subscriber Redis clients to adhere strictly to Redis RESP2 pub/sub protocol.
  - **Binary Buffer-Safe Transport:** Subscriptions consume raw `messageBuffer` events to eliminate UTF-8 transcoding corruption of IEEE-754 floats and binary bytes.
  - **Automatic Resilient Fallback:** If `BROKER_MODE=redis` is configured but Redis cannot be reached within `REDIS_CONNECT_TIMEOUT_MS`, the system logs a clear warning and seamlessly falls back to `MemoryBroker` (unless `REDIS_REQUIRED=true` is set).
  - **Safe URL Logging:** Masks credentials (`redis://***:***@host:port`) to prevent security leaks in logs.
- **Worker-Thread Binary Telemetry Encoder (`src/workers/binaryEncoder.ts`):**
  - Pure, unit-testable encoder packing telemetry records into versioned 32-byte binary structures matching the frontend decoder (`decodeBinaryBatch`) byte-for-byte.
  - Uses `DataView` with explicit Little Endian byte ordering.
  - Offloaded to worker pool (`ENCODE_BATCH` request) and transferred back to the main thread using zero-copy `ArrayBuffer` transfer lists.
  - Validates coordinate bounds and ranges, isolating invalid points into `rejected` with original array indices without failing the batch.
- **High-Frequency Ingestion Pipeline (`POST /api/telemetry/ingest`):**
  - Accepts `{ points: [...] }` batches, validates the outer envelope on the main thread, and dispatches validation/encoding to worker threads.
  - Returns HTTP `202 Accepted` with `{ success, requestId, accepted, rejected, published }`.
  - **Backpressure Protection:** Bounded in-flight queue ceiling (`INGEST_MAX_QUEUE`, default 10,000); when reached, returns HTTP 503 `INGESTION_QUEUE_FULL`.
  - **Live Counters & Rate Window:** In-memory tracking of received, accepted, rejected, published, broadcast, and dropped points, with a rolling events/second window exposed via `GET /api/telemetry/pipeline-stats`.
  - Bounded in-memory snapshot store for immediate dispatch to newly connected frontend clients.
  - Week 1 endpoint `POST /api/telemetry/process-batch` preserved unchanged.
- **Socket.IO Server & Telemetry Broadcaster (`src/socket/`):**
  - Attached to the same HTTP server instance created in `server.ts`.
  - Strictly adheres to frontend connection options (path `/socket.io`, transports `['websocket', 'polling']`, CORS origin check).
  - Emits binary `telemetry:batch` events using raw `ArrayBuffer`/`Buffer` payloads.
  - **Batching & Coalescing:** Broadcaster aggregates incoming records from the subscriber and flushes every `SOCKET_BATCH_INTERVAL_MS` (50ms) or when `SOCKET_MAX_BATCH_RECORDS` (500) is reached.
  - **Per-Client Backpressure:** Checks `socket.conn.transport.writable` before dispatch and uses volatile emits to prevent slow mobile/canvas clients from exhausting server memory.
- **Developer Tooling & Load Testing:**
  - `scripts/simulate-fleet.ts`: Generates realistic moving vehicles (default 2,000) around Hyderabad (~17.385, 78.4867) at configurable rates (`npm run simulate`).
  - `scripts/load-test.ts`: Automated load harness verifying sustained throughput (>1,800 records/sec) and **zero data omission** against a real `socket.io-client`.
- **Test Suite Expansion:**
  - 58 passing tests across 11 test suites covering binary encoding, byte layouts, endianness, memory broker, Redis broker, Socket.IO streaming, backpressure, and resilience.

### What Was Intentionally Deferred (Strict Scope Exclusions):
- ❌ **No Frontend Edits:** `src/`, `public/`, and Vite configuration were left completely untouched.
- ❌ **No Database:** No MongoDB, PostgreSQL, SQLite, or ORM drivers. Telemetry is streamed in memory, not persisted.
- ❌ **No Geofencing Engine:** Ray-casting Point-in-Polygon (PIP) and `geofence:breach`/`geofence:clear` events scheduled for Week 3.
- ❌ **No Authentication / Vehicles CRUD:** REST vehicle registries and auth APIs scheduled for Week 4.

---

## 2. Directory Structure & File Map

```
backend/
├── scripts/
│   ├── load-test.ts              # End-to-end load & zero-omission validation script
│   └── simulate-fleet.ts         # Realistic moving fleet telemetry simulator (2,000 units)
├── src/
│   ├── config/
│   │   └── env.ts                # Validated environment configuration parser with safe defaults
│   ├── middleware/
│   │   ├── errorHandler.ts      # Centralized 4-arg JSON error handler (no stack leaks)
│   │   ├── notFound.ts          # Standardized 404 handler for unknown routes
│   │   └── validateBatch.ts     # Main-thread request envelope & batch bounds validation
│   ├── routes/
│   │   ├── health.routes.ts     # GET /api/health (status, uptime, worker, broker)
│   │   ├── telemetry.routes.ts  # POST /process-batch, POST /ingest, GET /pipeline-stats
│   │   └── index.ts             # API subroute mounting
│   ├── services/
│   │   ├── broker/              # Message broker abstraction
│   │   │   ├── broker.types.ts  # MessageBroker and MessageHandler interfaces
│   │   │   ├── memoryBroker.ts  # In-process EventEmitter-based broker
│   │   │   ├── redisBroker.ts   # ioredis dual-connection Pub/Sub broker
│   │   │   └── index.ts         # Broker factory with automatic fallback
│   │   ├── pipelineStats.service.ts # In-memory counters and rolling rate window
│   │   ├── telemetry.service.ts # Telemetry dispatcher (processBatch + ingestBatch)
│   │   └── workerPool.service.ts# Multi-core worker pool manager with crash recovery
│   ├── socket/                  # Socket.IO & WebSocket transport
│   │   ├── broadcaster.ts       # Coalescing batcher & per-client backpressure
│   │   └── socketServer.ts      # Socket.IO lifecycle, CORS, and connection snapshot
│   ├── types/
│   │   ├── telemetry.ts         # Telemetry contracts
│   │   └── worker-protocol.ts   # Typed message contracts (includes ENCODE_BATCH)
│   ├── utils/
│   │   └── AppError.ts          # Operational error class with HTTP status
│   ├── workers/
│   │   ├── binaryEncoder.ts     # Pure 32-byte binary encoder & decoder
│   │   ├── coordinateProcessor.ts # Pure coordinate validation & rounding
│   │   └── telemetry.worker.ts  # Worker thread execution loop
│   ├── app.ts                   # Express application setup
│   └── server.ts                # Server startup, broker/socket binding, graceful shutdown
├── tests/
│   ├── integration/
│   │   ├── cors.test.ts         # HTTP REST CORS validation
│   │   ├── health.test.ts       # Health endpoint validation
│   │   ├── ingest.test.ts       # Full ingestion + socket streaming integration
│   │   ├── resilience.test.ts   # Broker disconnect and recovery tests
│   │   ├── socketCors.test.ts   # Socket.IO handshake CORS tests
│   │   └── telemetry.test.ts    # Week 1 process-batch tests
│   ├── unit/
│   │   ├── binaryEncoder.test.ts# 32-byte layout, endianness, and round-trip tests
│   │   ├── broadcaster.test.ts  # Batching interval and threshold tests
│   │   ├── broker.test.ts       # MemoryBroker and RedisBroker tests
│   │   └── coordinateProcessor.test.ts # Coordinate validation tests
│   └── worker/
│       └── workerPool.test.ts   # Thread pool lifecycle tests
├── .env.example                 # Template configuration
├── package.json                 # Backend dependencies and scripts
├── tsconfig.json                # TypeScript compilation config
└── vitest.config.ts             # Vitest test runner configuration
```

---

## 3. Windows PowerShell Quick Start

Execute all commands from the `backend/` directory:

```powershell
cd backend

# 1. Install dependencies
npm install

# 2. Run TypeScript typecheck
npm run typecheck

# 3. Execute all 59 automated unit, integration, and worker tests
npm test

# 4. Compile TypeScript to production bundle (dist/)
npm run build

# 5. Start development server with live watch mode (tsx)
npm run dev

# 6. Start production server (loads compiled dist/ bundle)
npm start

# 7. Run fleet telemetry simulator (2,000 vehicles, 2,000 records/sec, 15 seconds)
npm run simulate -- --vehicles 2000 --rate 2000 --duration 15

# 8. Run end-to-end load validation and zero data omission test
npx tsx scripts/load-test.ts
```

---

## 4. Environment Variables Specification

Configuration is managed via `backend/.env`. If `.env` is absent, safe defaults are automatically applied:

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | integer | `5000` | Port for Express HTTP & Socket.IO server |
| `NODE_ENV` | string | `development` | Environment mode (`development`, `production`, `test`) |
| `CORS_ORIGINS` | string | `http://localhost:5173,http://127.0.0.1:5173` | Allowed frontend origins (no wildcard) |
| `WORKER_POOL_SIZE` | integer | `2` | Fixed number of CPU worker threads |
| `WORKER_TASK_TIMEOUT_MS` | integer | `5000` | Worker task execution timeout |
| `MAX_BATCH_SIZE` | integer | `10000` | Maximum points allowed per batch request |
| `JSON_BODY_LIMIT` | string | `1mb` | Express body-parser size limit |
| `WORKER_QUEUE_MAX_SIZE` | integer | `500` | Worker pool task backpressure limit |
| `REDIS_URL` | string | `redis://localhost:6379` | Redis server connection URI |
| `REDIS_ENABLED` | boolean | `true` | Enable Redis broker attempt |
| `REDIS_REQUIRED` | boolean | `false` | Fail startup if Redis is down (`true`), or fallback (`false`) |
| `REDIS_CHANNEL_TELEMETRY` | string | `fleetdash:telemetry` | Pub/Sub channel for binary telemetry |
| `REDIS_CONNECT_TIMEOUT_MS` | integer | `3000` | Redis initial connection timeout |
| `BROKER_MODE` | string | `redis` | Message broker mode: `redis` or `memory` |
| `SOCKET_PATH` | string | `/socket.io` | Socket.IO server path |
| `SOCKET_BATCH_INTERVAL_MS` | integer | `50` | Broadcaster periodic flush interval in ms |
| `SOCKET_MAX_BATCH_RECORDS` | integer | `500` | Broadcaster record threshold triggering immediate flush |
| `SOCKET_PING_INTERVAL_MS` | integer | `25000` | WebSocket heartbeat ping interval |
| `SOCKET_PING_TIMEOUT_MS` | integer | `20000` | WebSocket heartbeat ping timeout |
| `INGEST_MAX_QUEUE` | integer | `10000` | Telemetry ingestion backpressure limit |

---

## 5. Binary Telemetry Protocol Specification

Telemetry records are packed into fixed 32-byte binary structures. Batches of $N$ vehicle records form a contiguous buffer of exactly $N \times 32$ bytes.

### 5.1 Record Byte Layout (32 Bytes per Vehicle)

```
+---------------+---------------+---------------+---------------+
| Byte 0        | Byte 1        | Byte 2        | Byte 3        |
| Magic (0xFD)  | Version(0x01) | Status Code   | Geofence Code |
+---------------+---------------+---------------+---------------+
| Bytes 4 - 7 (Uint32 LE)                                       |
| Numeric Vehicle Identifier (e.g. 1001 for VH-1001)            |
+---------------------------------------------------------------+
| Bytes 8 - 15 (Float64 LE)                                     |
| Latitude (IEEE 754 Double Precision, -90.0 to 90.0)           |
+---------------------------------------------------------------+
| Bytes 16 - 23 (Float64 LE)                                    |
| Longitude (IEEE 754 Double Precision, -180.0 to 180.0)        |
+-------------------------------+-------------------------------+
| Bytes 24 - 25 (Uint16 LE)     | Bytes 26 - 27 (Uint16 LE)     |
| Speed * 10 (0 to 3500)        | Heading * 10 (0 to 3600)      |
+-------------------------------+-------------------------------+
| Bytes 28 - 31 (Uint32 LE)                                     |
| Relative Milliseconds from Base Epoch (1704067200000)         |
+---------------------------------------------------------------+
```

| Offset (Bytes) | Field Name | Data Type | Endianness | Scaling / Range | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `0` | Magic Byte | `Uint8` | — | `0xFD` | Protocol packet identifier |
| `1` | Version | `Uint8` | — | `0x01` | Protocol Version 1.0 |
| `2` | Status Code | `Uint8` | — | `0`=active, `1`=idle, `2`=offline | Operational vehicle state |
| `3` | Geofence Code | `Uint8` | — | `0`=inside, `1`=breached, `2`=clear, `3`=none | Geofence boundary code |
| `4 – 7` | Vehicle ID | `Uint32` | Little Endian | `1` to `4,294,967,295` | Numeric vehicle ID (e.g. 1001 for VH-1001) |
| `8 – 15` | Latitude | `Float64` | Little Endian | `[-90.0, 90.0]` | WGS-84 decimal latitude (IEEE 754) |
| `16 – 23` | Longitude | `Float64` | Little Endian | `[-180.0, 180.0]` | WGS-84 decimal longitude (IEEE 754) |
| `24 – 25` | Speed | `Uint16` | Little Endian | `0` to `3500` (Speed $\times$ 10) | Vehicle velocity in 0.1 km/h increments |
| `26 – 27` | Heading | `Uint16` | Little Endian | `0` to `3600` (Heading $\times$ 10) | Azimuth from North in 0.1 degree units |
| `28 – 31` | Timestamp | `Uint32` | Little Endian | Relative ms modulo $2^{32}-1$ | Milliseconds since Jan 1, 2024 (`1704067200000`) |

### 5.2 Worked Byte Example

For record:
- Vehicle: `VH-1001` (numeric ID `1001` = `0x000003E9`)
- Status: `active` (`0`)
- Geofence: `inside` (`0`)
- Latitude: `17.3850` (IEEE 754 Float64 LE: `0x4031628F5C28F5C3`)
- Longitude: `78.4867` (IEEE 754 Float64 LE: `0x40539F26E978D4FE`)
- Speed: `68.4 km/h` $\rightarrow$ $684$ (`0x02AC` LE $\rightarrow$ `[0xAC, 0x02]`)
- Heading: `182.5°` $\rightarrow$ $1825$ (`0x0721` LE $\rightarrow$ `[0x21, 0x07]`)
- Relative Timestamp: `1000 ms` $\rightarrow$ `0x000003E8` LE $\rightarrow$ `[0xE8, 0x03, 0x00, 0x00]`

```
Bytes 00-03: [ FD 01 00 00 ]                         # Header: Magic, Version, Status, Geofence
Bytes 04-07: [ E9 03 00 00 ]                         # Vehicle ID: 1001
Bytes 08-15: [ C3 F5 28 5C 8F 62 31 40 ]             # Latitude: 17.3850 (Float64 LE)
Bytes 16-23: [ FE D4 78 E9 26 9F 53 40 ]             # Longitude: 78.4867 (Float64 LE)
Bytes 24-25: [ AC 02 ]                               # Speed: 684 (68.4 km/h)
Bytes 26-27: [ 21 07 ]                               # Heading: 1825 (182.5 deg)
Bytes 28-31: [ E8 03 00 00 ]                         # Relative Timestamp: 1000 ms
Total: 32 bytes
```

### 5.3 Header Discrepancy Resolution
- **api-contract.md** stated 1-byte magic `0xFD` + 1-byte version `0x01`.
- **README.md** stated 2-byte magic `0xFD01`.
- **Frontend Code Ground Truth:** In `src/services/telemetry/binaryDecoder.ts`, lines 108–109 explicitly read byte 0 with `getUint8(0)` expecting `0xFD` and byte 1 with `getUint8(1)` expecting `0x01`. In big-endian representation, the two-byte integer is `0xFD01`. The backend encoder sets byte 0 as `0xFD` and byte 1 as `0x01` using `setUint8`, ensuring exact 100% interoperability with the frontend decoder.

---

## 6. API Testing & Examples (Windows PowerShell & curl.exe)

### 6.1 Health Check (`GET /api/health`)
```powershell
Invoke-RestMethod http://localhost:5000/api/health | ConvertTo-Json -Depth 5
```
Response (HTTP 200):
```json
{
  "status": "ok",
  "service": "fleetdash-backend",
  "uptime": 35.14,
  "timestamp": "2026-10-30T16:46:53.115Z",
  "worker": {
    "ready": true,
    "poolSize": 2
  },
  "broker": {
    "type": "memory",
    "healthy": true
  }
}
```

---

### 6.2 Ingest Telemetry Batch (`POST /api/telemetry/ingest`)
```powershell
# In PowerShell:
$body = '{"points":[{"vehicleId":"VH-1001","latitude":17.385,"longitude":78.4867,"speed":40,"heading":90,"timestamp":1704067200000,"status":"active"}]}'
Invoke-RestMethod -Method Post http://localhost:5000/api/telemetry/ingest -ContentType 'application/json' -Body $body | ConvertTo-Json -Depth 5
```
Response (HTTP 202 Accepted):
```json
{
  "success": true,
  "requestId": "2fe269fd-a6a6-4e87-aaf5-7ac5bfeb5c81",
  "accepted": 1,
  "rejected": [],
  "published": 1
}
```

---

### 6.3 Pipeline Metrics & Rate Window (`GET /api/telemetry/pipeline-stats`)
```powershell
Invoke-RestMethod http://localhost:5000/api/telemetry/pipeline-stats | ConvertTo-Json -Depth 5
```
Response (HTTP 200):
```json
{
  "received": 20000,
  "accepted": 20000,
  "rejected": 0,
  "published": 20000,
  "broadcast": 20000,
  "dropped": 0,
  "inFlight": 0,
  "eventsPerSecond": 1883,
  "activeVehicles": 2000,
  "skippedFrames": 0,
  "broker": {
    "type": "memory",
    "healthy": true
  },
  "socket": {
    "connectedClients": 1,
    "skippedFrames": 0
  }
}
```

---

## 7. Load Validation & Data Integrity Evidence

Verified using `scripts/load-test.ts` connecting a live `socket.io-client` against the compiled production service (`dist/`):

```
========================================================
 LOAD VALIDATION & DATA INTEGRITY REPORT
========================================================
 Broker Mode Active:     MEMORY (healthy: true)
 Duration:               10.62s
 Total Records Sent:     20,000
 Server Accepted:        20,000 (delta: 20,000)
 Server Rejected:        0
 Server Dropped:         0
 Server Published:       57,001
 Socket Frames Emitted:  101
 Client Received:        20,000 records
 Data Omission Gap:      0 (ZERO OMISSION VERIFIED)
 Sustained Ingest Rate:  1,883 records/sec
 Rolling EPS Metric:     1,633 records/sec
--------------------------------------------------------
 Ingest HTTP Latency:    p50: 8.82ms | p95: 14.95ms | p99: 39.07ms
 Health HTTP Latency:    p50: 3.94ms | p95: 5.12ms
 Memory Footprint:       Heap: 17.3 MB | RSS: 97.5 MB
 Binary Protocol Check:  PASS (ArrayBuffer / binary delivery verified)
 Sample Decoded Record:  {"vehicleId":"VH-1","latitude":17.385,"longitude":78.4867,"speed":40,"heading":90,"timestamp":1705624828935,"status":"active","geofenceStatus":"inside"}
========================================================
```

---

## 8. Week 3 Roadmap (Geofencing Milestone)

1. **Ray-Casting Point-in-Polygon (PIP) Worker Engine:** Implement Turf.js / booleanPointInPolygon within dedicated worker threads to test vehicle coordinates against complex polygon geofences.
2. **Geofence Breach State Machine:** Maintain transition state (`inside` $\rightarrow$ `breached` $\rightarrow$ `clear`) to generate authoritative `geofence:breach` and `geofence:clear` payloads matching the contract.
3. **Polygon Perimeter Definitions:** Load geofence GeoJSON coordinates from configuration or REST endpoints.
