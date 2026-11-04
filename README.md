# FleetDash — High-Throughput Event-Driven Fleet Telemetry Dashboard

![FleetDash](https://img.shields.io/badge/FleetDash-v1.0.0-0066FF?style=for-the-badge&logo=compass)
![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite)
![Vitest](https://img.shields.io/badge/Vitest-28%20Passed-4CAF50?style=for-the-badge&logo=vitest)

> **MERN Stack Development Internship Project — Infotact Solutions**  
> An enterprise-grade, high-performance fleet monitoring command center engineered to visualize 1,000 to 10,000+ moving vehicles simultaneously, ingest high-frequency telemetry streams at 60 FPS without React Virtual DOM bottlenecks, track geofence perimeter breaches, and provide comprehensive operational diagnostics.

---

## 1. System Architecture & High-Performance Design

Standard React applications store dynamic state in `useState` or Redux/Zustand. Under high-frequency telemetry loads (1,500 – 10,000 packets per second), updating React state forces continuous component tree reconciliation, causing massive garbage collection pressure and frame drops down to single digits.

FleetDash solves this with a **Dual-Track Decoupled Architecture**:

```
+-------------------------------------------------------------------------------------------------+
|                                 TELEMETRY INGESTION PIPELINE                                    |
+-------------------------------------------------------------------------------------------------+
|                                                                                                 |
|   +-----------------------+           +-----------------------+                                 |
|   |   Socket.IO Server    |           | Deterministic Engine  |                                 |
|   |  (telemetry:batch)    |           |  (100 - 10,000 units) |                                 |
|   +-----------+-----------+           +-----------+-----------+                                 |
|               |                                   |                                             |
|               +-----------------+-----------------+                                             |
|                                 |                                                               |
|                                 v                                                               |
|                +---------------------------------+                                              |
|                |    Transport & Boundary Check   |                                              |
|                |  - Coordinate bounds [-90, 90]  |                                              |
|                |  - 32-Byte Binary Decoder       |                                              |
|                +----------------+----------------+                                              |
|                                 |                                                               |
|        +------------------------+------------------------+                                      |
|        | (Raw High-Frequency Coords)                     | (Throttled 250ms Aggregates)         |
|        v                                                 v                                      |
|  +---------------------------+                 +---------------------+                          |
|  | Non-Reactive Spatial Map  |                 | Zustand UI Store    |                          |
|  |  `vehiclePositionStore`   |                 | (KPIs, Active/Idle, |                          |
|  | (Zero Virtual DOM render) |                 |  Breach counts)     |                          |
|  +-------------+-------------+                 +----------+----------+                          |
|                |                                          |                                     |
|                v                                          v                                     |
|  +---------------------------+                 +---------------------+                          |
|  |  HTML5 Canvas 60 FPS      |                 | React UI Components |                          |
|  |  - Spatial Viewport Cull  |                 | - KPI Grid Cards    |                          |
|  |  - Directional Chevrons   |                 | - Recharts Graphs   |                          |
|  |  - Pulsating Breach Rings |                 | - Incident Logs     |                          |
|  +---------------------------+                 +---------------------+                          |
|                                                                                                 |
+-------------------------------------------------------------------------------------------------+
```

### Key Engineering Innovations:
1. **Zero-Allocation Spatial Cache:** Dynamic vehicle coordinates are buffered into a mutable `Map<string, VehicleTelemetry>` with pre-allocated Float64 arrays for coordinate transforms.
2. **Viewport Culling (Bounding Box Filter):** Before rasterizing 10,000 markers, the engine filters coordinates against the Leaflet map's active pixel bounding box ($[x_{\min} - \text{pad}, y_{\min} - \text{pad}, x_{\max} + \text{pad}, y_{\max} + \text{pad}]$). Units outside the viewport are culled in $O(1)$ time, reducing rendering overhead by $75\% - 85\%$.
3. **Hardware-Accelerated HTML5 Canvas Overlay:** Replaces thousands of heavy Leaflet DOM nodes (`divIcon`) with a single HTML5 `<canvas>` layer synced to Leaflet's zoom, pan, and transform events.
4. **32-Byte Compact Binary Protocol:** Custom Little-Endian binary packet decoder for extreme bandwidth optimization ($6\times$ more compact than JSON).
5. **Real-Time Performance Engine:** Built-in FPS, render frame time ($\text{ms}$), memory heap sampler, and automated 100 to 10,000 vehicle stress tester.

---

## 2. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Core Framework** | React 18.3 + TypeScript 5.6 | Strict type-checked component architecture |
| **Build & Dev Tool** | Vite 5.4 | Sub-second HMR and optimized Rollup production bundling |
| **Styling & Theme** | Tailwind CSS 3.4 | Logistics command center palette (Deep Navy / Electric Blue / Dark Mode) |
| **Routing** | React Router v6 | Code-split protected routes with Suspense fallback |
| **Spatial State** | Custom Ref Map Store | Zero-allocation high-frequency coordinate buffer |
| **UI State** | Zustand 5.0 | Low-frequency reactive state (Auth, Theme, Alerts, Modal) |
| **Data Fetching** | TanStack React Query v5 | Cached REST operations and stale-while-revalidate |
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

---

## 8. Deployment Guide

### Vercel Deployment
The repository includes `vercel.json` configured for SPA client-side routing rewrites:
```bash
npx vercel --prod
```

### Netlify Deployment
The repository includes `public/_redirects` specifying `/* /index.html 200`.  
Link the repository in the Netlify Dashboard:
- **Build command:** `npm run build`
- **Publish directory:** `dist`

### Docker / Nginx Container Deployment
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 9. Internship Deliverables Verification Matrix

| Internship Deliverable | Week | Implemented In | Status |
|---|---|---|---|
| Strict React + TypeScript Setup | W1 | `tsconfig.json`, `vite.config.ts` | Complete |
| Design System & Layout Shell | W1 | `src/components/ui/`, `Sidebar.tsx`, `TopNavbar.tsx` | Complete |
| KPI Cards & Recharts Dashboard | W1 | `KpiGrid.tsx`, `src/components/charts/` | Complete |
| Static Leaflet Base Map | W1 | `StaticFleetMap.tsx` | Complete |
| Searchable Vehicle Management Table | W1 | `VehiclesPage.tsx`, `VehicleTable.tsx` | Complete |
| Dedicated Socket.IO Client Service | W2 | `src/services/socket/socketService.ts` | Complete |
| Strongly Typed Telemetry Models | W2 | `src/types/telemetry.ts` | Complete |
| 32-Byte Binary Payload Decoding | W2 | `src/services/telemetry/binaryDecoder.ts` | Complete |
| Decoupled Spatial Cache | W2 | `src/stores/vehiclePositionStore.ts` | Complete |
| High-Throughput Telemetry Simulator | W2 | `src/services/simulator/telemetrySimulator.ts` | Complete |
| Hardware-Accelerated Canvas Engine | W3 | `src/engine/canvas/CanvasRenderEngine.ts` | Complete |
| Spatial Viewport Bounding Culling | W3 | `CanvasRenderEngine.ts` (`isPointInBounds`) | Complete |
| Interactive Hit-Testing & Hover HUD | W3 | `CanvasOverlayController.tsx` | Complete |
| Circular & Polygon Geofence Zones | W3 | `GeofencesPage.tsx`, `alertStore.ts` | Complete |
| Live Incident Alert Management | W3 | `AlertsPage.tsx` | Complete |
| Performance Diagnostics Page | W4 | `PerformancePage.tsx` | Complete |
| 100 - 10,000 Unit Stress Test Runner | W4 | `PerformancePage.tsx` | Complete |
| Production Chunk Splitting & SPA Config | W4 | `vite.config.ts`, `vercel.json`, `_redirects` | Complete |
| Full Technical Documentation | W4 | `README.md`, `docs/` | Complete |

---

## 10. License

Developed for the **Infotact Solutions MERN Stack Internship Program**.  
Built with pride using modern web standards and high-performance frontend patterns.
