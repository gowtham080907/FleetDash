# FleetDash — High-Throughput Event-Driven Fleet Telemetry Dashboard

![FleetDash](https://img.shields.io/badge/FleetDash-v1.0.0-0066FF?style=for-the-badge&logo=compass)
![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite)
![Vitest](https://img.shields.io/badge/Vitest-28%20Passed-4CAF50?style=for-the-badge&logo=vitest)

le-revalidate |
| **Map Engine** | Leaflet 1.9 + React Leaflet 4.2 | GIS base map tiles (OpenStreetMap / CartoDB Dark Matter) |
| **Graphics Engine** | HTML5 Canvas + requestAnimationFrame | High-throughput 60 FPS vehicle and breach rasterization |
| **Data Analytics** | Recharts 2.15 | Dashboard telemetry throughput, speed, and alert charts |
| **Validation** | Zod 3.23 + React Hook Form 7.53 | Strict schema validation for auth and forms |
| **Unit Testing** | Vitest 2.1 + Testing Library | 28 automated test suites passing |

---

## 3. Application Directory & Routes

All routes are fully implemented with code splitting and protected route guards:

| Route | Page Component | Key Functionality |
|---|---|---|
| `/login` | `LoginPage.tsx` | Demo / Production login, form validation, animated security indicators |
| `/dashboard` | `DashboardPage.tsx` | 8 KPI cards, 5 Recharts analytics charts, mini preview map |
| `/live-map` | `LiveMapPage.tsx` | Fullscreen 60 FPS Canvas overlay, vehicle follow mode, live HUD |
| `/vehicles` | `VehiclesPage.tsx` | Searchable, sortable vehicle registry with status filters and quick view |
| `/vehicles/:id` | `VehicleDetailsPage.tsx` | Single-unit telemetry diagnostics, breadcrumb history, specs |
| `/telemetry` | `TelemetryPage.tsx` | Ingestion stream control, live packet inspector, binary/JSON toggle |
| `/geofences` | `GeofencesPage.tsx` | Circular & polygon geofence zones, speed ceilings, breach triggers |
| `/alerts` | `AlertsPage.tsx` | Real-time incident feed, severity filters, acknowledgment workflow |
| `/performance` | `PerformancePage.tsx` | Real-time FPS, frame latency, memory heap graph, stress test runner |
| `/settings` | `SettingsPage.tsx` | Simulator controls, theme toggle, socket endpoint configuration |
| `*` | `NotFoundPage.tsx` | Helpful 404 recovery page |

---

## 4. 32-Byte Binary Protocol Specification

To minimize bandwidth overhead during high-frequency telemetry ingestion, FleetDash supports a versioned 32-byte Little-Endian binary protocol:

```
+------------+------------+---------------+-----------------------------------+
| Byte Range | Data Type  | Field         | Description                       |
+------------+------------+---------------+-----------------------------------+
| 0 - 1      | Uint16     | Magic Header  | 0xFD01 (Protocol identifier)      |
| 2 - 3      | Uint16     | Vehicle ID    | Numeric ID (0 - 65,535)           |
| 4 - 11     | Float64    | Latitude      | WGS-84 coordinate (-90.0 to 90.0) |
| 12 - 19    | Float64    | Longitude     | WGS-84 coordinate (-180 to 180)   |
| 20 - 23    | Float32    | Speed         | Speed in km/h (0.0 to 300.0)      |
| 24 - 27    | Float32    | Heading       | Direction in degrees (0 to 360)   |
| 28         | Uint8      | Status        | 0=active, 1=idle, 2=offline       |
| 29 - 31    | Uint8[3]   | Reserved      | Alignment padding for 32-byte quad|
+------------+------------+---------------+-----------------------------------+
```

*Binary decoder implementation: `src/services/telemetry/binaryDecoder.ts`*

---

## 5. Performance Benchmarks

Tested on standard development workstation (Google Chrome 128, 60 Hz display, Intel Core i7 / 16 GB RAM):

| Active Vehicles | Events Ingested / Sec | Canvas Render Frame Time | Target Frame Budget | Effective FPS | Viewport Culling Efficiency |
|---|---|---|---|---|---|
| **100** | 150 evt/s | **0.8 ms** | 16.67 ms | **60 FPS** | 68% culled |
| **500** | 750 evt/s | **1.2 ms** | 16.67 ms | **60 FPS** | 74% culled |
| **1,000** | 1,500 evt/s | **1.8 ms** | 16.67 ms | **60 FPS** | 79% culled |
| **2,500** | 3,750 evt/s | **2.6 ms** | 16.67 ms | **60 FPS** | 81% culled |
| **5,000** | 7,500 evt/s | **3.4 ms** | 16.67 ms | **59-60 FPS**| 84% culled |
| **10,000** | 15,000 evt/s | **4.1 ms** | 16.67 ms | **58-60 FPS**| 86% culled |

*Full benchmark breakdown documented in `docs/performance-results.md`.*

---

## 6. Getting Started

### Prerequisites
- **Node.js:** `v18.x`, `v20.x`, or `v22.x`
- **npm:** `v9+` or `v10+`

### Installation
```bash
# Clone the repository
git clone https://github.com/infotact-solutions/fleetdash.git
cd fleetdash

# Install dependencies
npm install
```

### Environment Configuration
Create a `.env` file from the example:
```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Backend REST API endpoint | `http://localhost:5000/api` |
| `VITE_SOCKET_URL` | Socket.IO server endpoint | `http://localhost:5000` |
| `VITE_DEMO_MODE` | Deterministic demo telemetry generator | `true` |

### Development Server
```bash
npm run dev
```
Navigate to `http://localhost:5173/` in your browser.  
Click **"Instant Demo Login"** on the login screen to enter the command center immediately.

---

## 7. Verification & Production Build

### Run Automated Unit Tests (Vitest)
```bash
npm test
```
Runs 28 automated tests across 7 test suites validating:
- 32-Byte Binary packet decoder and Little-Endian byte offset reading
- Coordinate boundary validation
- Spatial Map position buffering
- Canvas rendering coordinate projection and culling algorithms
- Zustand auth and alert stores
- Mock REST API vehicle filtering and queries

### Run Strict TypeScript Type Check
```bash
npx tsc --noEmit
```

### Build Optimized Production Bundle
```bash
npm run build
```
Generates production artifacts in `dist/` with optimized vendor chunking:
- `leaflet-vendor`: Leaflet GIS runtime
- `recharts-vendor`: Data analytics visualization engine
- `react-vendor`: React DOM and core dependencies
- Granular lazy-loaded page chunks with gzip compression
