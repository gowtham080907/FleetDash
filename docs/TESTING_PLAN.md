# FleetDash Database & Integration Test Plan

## Automated tests

Run inside `backend/`:

```powershell
npm test
npm run typecheck
npm run db:verify
```

The suite includes the supplied backend unit/integration coverage plus `tests/database/database.test.ts`, which verifies seeded data, vehicle CRUD/search, telemetry trail ordering, and API-compatible synchronous read behavior. The normal Vitest run uses an isolated in-memory database adapter unless `MONGO_TEST_URL` is explicitly set. This keeps CI tests independent of a local MongoDB service.

For an actual MongoDB persistence test, set `MONGO_TEST_URL` to a dedicated disposable test database, run tests, and inspect the database after the run. Do not point test runs at a shared or production database.

## Manual acceptance tests

| ID | Test | Expected result |
|---|---|---|
| DB-01 | Start MongoDB and backend | Backend connects and reports MongoDB in health response |
| DB-02 | First run with supplied legacy JSON | Existing fleet records are imported; collection counts are non-zero |
| DB-03 | Restart backend | MongoDB records load; JSON is not re-imported |
| DB-04 | Create/update/delete vehicle via API | API responds with existing contract; change persists after restart |
| DB-05 | Create/update/delete geofence | Geofence changes persist after restart |
| DB-06 | Generate telemetry | Vehicle current position changes and recent trail is queryable |
| DB-07 | Acknowledge/clear alerts | Alert state is persisted |
| DB-08 | Register user | User record persists; password hash is stored, not plaintext |
| INT-01 | Frontend login | UI authenticates against backend, not mock data |
| INT-02 | Dashboard/vehicles pages | Counts and records come from REST API |
| INT-03 | Live telemetry | Socket.IO updates the UI; Redis broker is healthy when enabled |
| INT-04 | Backend graceful shutdown/restart | Pending database writes are flushed and state survives restart |
| PERF-01 | Controlled load test | Record offered rate, accepted/rejected records, p50/p95/p99 latency, errors, CPU, memory, MongoDB and Redis health |

## Load testing

The supplied backend has `scripts/load-test.ts` for the HTTP ingest and Socket.IO path. Use a local/test environment only, start with a low rate (e.g. 100 records/sec), then increase gradually. Do not begin at 2,000+ records/sec on a shared laptop or production database. Capture the actual console output and machine/container specs in your report. Load-test results are environment-specific and must not be represented as guaranteed MongoDB capacity.

## Test report template

| Field | Record |
|---|---|
| Date/time | |
| Git commit / package version | |
| Node.js / npm versions | |
| MongoDB version / topology | |
| Redis version / mode | |
| Machine CPU / RAM | |
| Offered records/sec | |
| Batch size / duration | |
| Accepted / rejected / failed | |
| p50 / p95 / p99 ingest latency | |
| MongoDB CPU / memory / write latency | |
| Redis health / Socket.IO clients | |
| Observations / bottlenecks | |
