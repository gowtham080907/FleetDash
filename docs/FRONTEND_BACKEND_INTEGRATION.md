# Frontend + Backend Integration Checklist

## Before merging

- [ ] Use this package's `backend/` folder as the backend database-integrated version, or port its MongoDB changes into your team's canonical backend branch.
- [ ] Do not keep the old JSON persistence class active as a second source of truth.
- [ ] Preserve the current REST routes and response shapes (`/api/auth`, `/api/vehicles`, `/api/fleet`, `/api/geofences`, `/api/alerts`, `/api/telemetry`).
- [ ] Preserve Socket.IO path `/socket.io` and existing event names/payloads.
- [ ] Keep Redis Pub/Sub enabled for live event fan-out; MongoDB is durable storage.
- [ ] Ensure the frontend's API base URL points to `http://localhost:5000/api` and demo mode is disabled.

## Local run order

1. Start Docker Desktop.
2. From `backend/`, run `docker compose up -d`.
3. Copy `.env.example` to `.env`; set a private JWT secret.
4. From `backend/`, run `npm install` and `npm run dev`.
5. From the frontend folder, set the three `VITE_*` values shown in the root README.
6. Start the frontend with `npm install` and `npm run dev`.
7. Open the UI and verify dashboard counts, vehicle list, vehicle detail/history, geofences, alerts, login, and live map updates.
8. Restart the backend and verify created/updated vehicle data still exists in MongoDB.

## API contract

The database integration intentionally retains the existing backend API. The supplied frontend's API contract is copied to `docs/API_CONTRACT.md`. If the frontend team has changed any endpoint, request field, response field, or Socket.IO event, update the backend and contract together and add a regression test.

## Common issues

| Symptom | Check |
|---|---|
| Backend exits during startup | MongoDB is running; `MONGO_URL` is correct; port 27017 is reachable |
| UI shows demo data | `VITE_DEMO_MODE=false`; restart Vite after editing `.env` |
| Browser API calls fail | `VITE_API_BASE_URL`, `CORS_ORIGINS`, backend port 5000 |
| Live map does not update | `VITE_SOCKET_URL`, Socket.IO path, Redis health, browser console |
| Redis unavailable | Start Redis or set `BROKER_MODE=memory` for local fallback testing; this disables cross-process Pub/Sub |
| Data appears reset | Confirm same `MONGO_DB_NAME` and MongoDB volume; inspect MongoDB collections before deleting anything |
