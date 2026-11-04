# MongoDB Database Design

## Collections

| Collection | Document key | Purpose | Important indexes |
|---|---|---|---|
| `vehicles` | `_id = vehicle.id` | Current vehicle state and latest location | `{ status: 1, lastUpdated: -1 }`, `{ geofenceStatus: 1 }` |
| `geofences` | `_id = geofence.id` | Circle/polygon zones and configuration | `{ name: 1 }` |
| `alerts` | `_id = alert.id` | Current alert list (bounded to 200 by existing business logic) | `{ timestamp: -1 }`, `{ acknowledged: 1, severity: 1 }` |
| `users` | `_id = user.id` | User profile and password hash | unique `{ email: 1 }` |
| `telemetry_trails` | `_id = vehicleId` | Latest 50 breadcrumbs per vehicle | `{ updatedAt: -1 }` |

## Data flow

1. The telemetry API/socket pipeline validates and processes telemetry using the existing backend workers.
2. The in-process read model is updated synchronously so existing REST handlers and services retain their current interfaces.
3. Mutations are coalesced and bulk-written to MongoDB every `MONGO_FLUSH_INTERVAL_MS` (250 ms by default).
4. Redis Pub/Sub continues to distribute live telemetry events to Socket.IO clients.
5. On startup, MongoDB data is loaded into the read model. On graceful shutdown, pending changes are flushed before MongoDB disconnects.

## Legacy JSON migration

If MongoDB is empty, the backend checks `DATA_DIR/fleetdash.json` (default: `backend/data/fleetdash.json`) and imports the existing `vehicles`, `geofences`, `alerts`, `users`, and `history` data. It then persists those records to MongoDB. Subsequent startups load MongoDB and do not re-import the JSON file. Keep a backup of the JSON file until you have verified the imported collections.

Manual migration check:

```powershell
npm run db:import-legacy
npm run db:verify
```

The import script is intentionally idempotent in normal operation because the database initialization only migrates when the target collections are empty. Do not manually clear collections unless you intend to re-seed or re-import.

## Throughput and consistency considerations

- The write-behind window is bounded by the flush interval. An abrupt power loss or forced process kill can lose changes not yet flushed. Graceful shutdown calls `db.close()` and flushes the pending snapshot.
- The current read model is appropriate for the supplied demonstration fleet and bounded recent history. It is a compatibility bridge, not a claim that an unbounded fleet can fit in process memory.
- The 50-point per-vehicle trail is deliberately bounded. For long-term raw telemetry retention at larger scale, use a MongoDB time-series collection or a dedicated append-only telemetry store with retention/TTL policies, and query history separately from current vehicle state.
- The current bulk snapshot strategy coalesces rapid updates. For production-scale multi-instance deployments, evolve this into explicit asynchronous repositories and per-entity dirty queues/change streams, and add optimistic concurrency or version fields to prevent competing application instances from overwriting each other's snapshots.
- MongoDB does not replace Redis Pub/Sub. Keep Redis for fan-out and Socket.IO event distribution.

## Security

- Do not commit `.env` or real secrets.
- Replace `JWT_SECRET` before deployment.
- Use a MongoDB user with least-privilege access and authentication for shared environments.
- Seed passwords are demonstration credentials only.
- Restrict CORS to the real frontend origins.
