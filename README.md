

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
