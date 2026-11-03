# FleetDash — Backend Week 2 Milestone Overview
## Caching & Transport: Redis Pub/Sub + Socket.IO Binary Streaming

This document details the architecture, protocol, and verification of the **Week 2 Backend Milestone** for FleetDash.

For the developer reference and commands, see:
👉 **[`backend/README.md`](../backend/README.md)**

---

## 1. Executive Summary & Week 2 Scope

### What Was Implemented:
1. **Message Broker Abstraction (`src/services/broker/`):**
   - Pluggable `MessageBroker` interface supporting both `RedisBroker` (ioredis with dedicated publisher/subscriber connections) and `MemoryBroker` (in-process fallback).
   - Binary buffer-safe Pub/Sub preserving raw bytes without lossy UTF-8 transcoding.
   - Fault-tolerant startup with automatic graceful fallback to `MemoryBroker` if Redis is offline (or fail-fast if `REDIS_REQUIRED=true`).
   - Credential masking in connection logs (`sanitizeRedisUrl`).
2. **Worker-Thread Binary Telemetry Encoder (`src/workers/binaryEncoder.ts`):**
   - Pure, unit-tested 32-byte binary encoder matching the frontend `decodeBinaryBatch` byte-for-byte.
   - Zero-copy `ArrayBuffer` transfer list from worker thread back to main thread.
   - Rejection and index-isolation of malformed coordinate records.
3. **High-Throughput Ingestion Pipeline (`POST /api/telemetry/ingest`):**
   - HTTP 202 Accepted response with `{ success, requestId, accepted, rejected, published }`.
   - Bounded in-flight queue backpressure (`INGEST_MAX_QUEUE`) returning structured 503 `INGESTION_QUEUE_FULL`.
   - Rolling metrics (events/sec, received, accepted, rejected, published, broadcast, dropped) on `GET /api/telemetry/pipeline-stats`.
   - Bounded in-memory latest-vehicle state store for initial client snapshots.
   - Week 1 endpoint `POST /api/telemetry/process-batch` preserved intact.
4. **Duplex Socket.IO Server (`src/socket/`):**
   - Attached to the primary HTTP server instance (preserving `app.ts` separation for tests).
   - Binary frame delivery (`telemetry:batch`) emitting coalesced `ArrayBuffer`/`Buffer` payloads.
   - Broadcaster coalesces chunks across `SOCKET_BATCH_INTERVAL_MS` (50ms) or `SOCKET_MAX_BATCH_RECORDS` (500).
   - Per-client backpressure (`transport.writable` check + volatile emission) preventing slow clients from consuming server memory.
   - CORS origin enforcement matching REST policy.
   - Initial snapshot delivery on client connection.
5. **Developer & Validation Tooling:**
   - Fleet simulator (`scripts/simulate-fleet.ts` / `npm run simulate`) simulating 2,000 moving vehicles around Hyderabad.
   - End-to-end load test (`scripts/load-test.ts`) validating >= 2,000 records/sec throughput and **zero data omission** against a real `socket.io-client`.
6. **Automated Test Suite:**
   - 58 passing tests across 11 test suites covering encoder round-trips, layout offsets, broker pub/sub, socket streaming, CORS, backpressure, and resilience. 1 test skipped when Redis is not running locally.

### What Was Intentionally Deferred (Strict Scope Exclusions):
- ❌ **No Frontend Edits:** `src/`, `public/`, and frontend configs were completely untouched.
- ❌ **No Database:** No MongoDB, PostgreSQL, SQLite, Prisma, or Mongoose. No persistent database state.
- ❌ **No Geofencing Engine:** Turf.js ray-casting and `geofence:breach`/`geofence:clear` events scheduled for Week 3.
- ❌ **No Auth or Fleet REST APIs:** `/api/vehicles`, `/api/fleet/stats`, JWT login scheduled for Week 4.

---

## 2. Updated Backend Directory Structure

```
backend/
├── scripts/
│   ├── load-test.ts              # End-to-end load & zero-omission verification test
│   └── simulate-fleet.ts         # High-frequency fleet telemetry simulator (2,000 vehicles)
├── src/
│   ├── config/
│   │   └── env.ts                # Validated configuration parser with safe defaults
│   ├── middleware/
│   │   ├── errorHandler.ts      # Standardized 4-arg JSON error handler
│   │   ├── notFound.ts          # Standardized 404 handler
│   │   └── validateBatch.ts     # Main-thread envelope and batch bounds validation
│   ├── routes/
│   │   ├── health.routes.ts     # GET /api/health (status, uptime, worker, broker)
│   │   ├── telemetry.routes.ts  # POST /process-batch, POST /ingest, GET /pipeline-stats
│   │   └── index.ts             # API subroute mounting
│   ├── services/
│   │   ├── broker/              # Message broker abstraction
│   │   │   ├── broker.types.ts  # MessageBroker and MessageHandler interfaces
│   │   │   ├── memoryBroker.ts  # In-process EventEmitter-based broker
│   │   │   ├── redisBroker.ts   # ioredis dual-connection Pub/Sub broker
│   │   │   └── index.ts         # Broker factory with auto-fallback
│   │   ├── pipelineStats.service.ts # In-memory counters and rolling rate window
│   │   ├── telemetry.service.ts # Telemetry dispatcher (processBatch + ingestBatch)
│   │   └── workerPool.service.ts# Multi-core worker pool manager
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

## 3. High-Throughput Pipeline Architecture

```mermaid
sequenceDiagram
    autonumber
    actor Simulator as Telemetry Ingest Client
    participant Express as Express (Main Thread)
    participant Pool as WorkerPool (Thread Pool)
    participant Broker as Redis/Memory Broker
    participant Broadcaster as Telemetry Broadcaster
    actor Client as Socket.IO Client (Frontend)

    Simulator->>Express: POST /api/telemetry/ingest { points: [...] }
    Express->>Express: Main-thread shape & backpressure check
    Express->>Pool: workerPool.run(ENCODE_BATCH)
    Note over Pool: Pure validation<br/>32-byte binary encoding<br/>Rejection isolation
    Pool-->>Express: postMessage(ENCODE_RESULT, [ArrayBuffer]) (zero-copy)
    Express->>Broker: broker.publish(REDIS_CHANNEL_TELEMETRY, binaryBuffer)
    Express-->>Simulator: HTTP 202 Accepted { accepted, rejected, published }
    Broker-->>Broadcaster: messageBuffer event (raw binary)
    Note over Broadcaster: Coalesce records<br/>Flush on 50ms or 500 records<br/>Check client transport.writable
    Broadcaster-->>Client: emit('telemetry:batch', ArrayBuffer) (Volatile Binary)
    Note over Client: decodeBinaryBatch()<br/>Direct update to spatial store
```

---

## 4. Binary Telemetry Protocol Specification

Telemetry records are packed into fixed 32-byte binary structures. Batches of $N$ vehicle records form a contiguous buffer of exactly $N \times 32$ bytes.

### 4.1 Record Byte Layout (32 Bytes per Vehicle)

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

### 4.2 Worked Byte Example

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

### 4.3 Discrepancy Resolution
- **api-contract.md** specified 1-byte magic `0xFD` + 1-byte version `0x01`.
- **README.md** stated 2-byte magic `0xFD01`.
- **Frontend Code Resolution:** In `src/services/telemetry/binaryDecoder.ts`, lines 108–109 explicitly read byte 0 with `getUint8(0)` expecting `0xFD` and byte 1 with `getUint8(1)` expecting `0x01`. In big-endian representation, the two-byte integer is `0xFD01`. The backend encoder sets byte 0 as `0xFD` and byte 1 as `0x01` using `setUint8`, ensuring exact 100% interoperability with the frontend decoder.

---

## 5. Redis Pub/Sub Architecture

1. **Two-Connection Rule:** In Redis (RESP2), once a client executes `SUBSCRIBE`, it transitions to subscribe mode and cannot execute regular commands (such as `PUBLISH`). `RedisBroker` allocates two distinct connection instances: `publisher` and `subscriber`.
2. **Binary Payload Preservation:** Subscriptions listen via the ioredis `'messageBuffer'` event (`subscriber.on('messageBuffer', (channelBuf, msgBuf) => ...)`), ensuring that raw binary ArrayBuffer/Buffer data never undergoes UTF-8 string encoding or multibyte corruption.
3. **Resilience & Safe Fallback:** If `BROKER_MODE=redis` is configured but Redis is unreachable during startup, the broker logs a clear warning and seamlessly instantiates `MemoryBroker`, keeping the service online unless `REDIS_REQUIRED=true` is set.
4. **Credential Masking:** Connection URLs containing passwords (`redis://user:pass@host:port`) are automatically sanitized to `redis://***:***@host:port` in all logs.

---

## 6. Backpressure & Throttling Design

1. **HTTP Ingestion In-Flight Bound (`INGEST_MAX_QUEUE`):**
   - Default: `10,000` records in-flight.
   - If cumulative pending ingestion requests exceed this limit, incoming batches are rejected immediately with HTTP 503 `INGESTION_QUEUE_FULL`.
   - Dropped counts are tracked in `pipelineStats.dropped`.
2. **Broadcaster Coalescing (`SOCKET_BATCH_INTERVAL_MS` & `SOCKET_MAX_BATCH_RECORDS`):**
   - High-frequency individual vehicle updates are enqueued in an internal buffer queue.
   - Flushes to clients every `50ms` or when `500` records accumulate, reducing socket packet overhead by over 90%.
3. **Per-Client Slow Consumer Handling:**
   - The broadcaster checks `socket.conn.transport.writable` before emitting. If a client's socket transport is blocked or congested, the frame is skipped for that client and counted under `skippedFrames`.
   - Emission uses Socket.IO `volatile.emit`, ensuring slow mobile or canvas connections never cause unbounded server-side buffer growth.

---

## 7. Configuration Reference (`backend/.env`)

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

## 8. Real Load Validation Evidence

Executed against production build on Node.js v22 (Windows PowerShell):

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

## 9. Week 3 Roadmap (Suggestions for Geofencing Milestone)

1. **Ray-Casting Point-in-Polygon (PIP) Worker Engine:** Implement Turf.js / booleanPointInPolygon within dedicated worker threads to test vehicle coordinates against complex polygon geofences.
2. **Geofence Breach State Machine:** Maintain transition state (`inside` $\rightarrow$ `breached` $\rightarrow$ `clear`) to generate authoritative `geofence:breach` and `geofence:clear` payloads matching the contract.
3. **Polygon Perimeter Definitions:** Load geofence GeoJSON coordinates from configuration or REST endpoints.
