# FleetDash — Architecture & Real-Time Visualization Blueprint

## 1. Executive Summary

**FleetDash** is engineered to visualize real-time high-throughput telemetry streams comprising up to **10,000 concurrent moving fleet vehicles** while maintaining a steady **60 FPS** viewport and an instantaneous, responsive user interface.

In high-frequency event-driven telemetry applications, naive UI architectures collapse under memory churn and main-thread execution locks. This document details the architectural decisions, pipeline separation, and spatial indexing strategies implemented in FleetDash.

---

## 2. Decoupled Ingestion & Rendering Pipeline

FleetDash strictly enforces a 5-stage directional pipeline where each stage has isolated, well-defined responsibilities:

```
┌──────────────────────────────────────────────────────────────────┐
│                   STAGE 1: TRANSPORT LAYER                       │
│    Socket.IO Client (Duplex WebSocket / Binary / JSON Stream)     │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ Raw Batches (10 - 200 units)
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│              STAGE 2: BOUNDARY DECODER & VALIDATOR               │
│ - TypedArray DataView Parser (32-byte Binary Protocol)           │
│ - Coordinate Boundary Verification (lat: ±90, lng: ±180)         │
│ - Monotonic Timestamp Check & Out-of-Order Packet Drop           │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ Validated `VehicleTelemetry`
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│          STAGE 3: MUTABLE SPATIAL STORE (NON-REACTIVE)           │
│ - Mutable Map<string, VehicleTelemetry>                          │
│ - Pre-allocated Flat Array Cache (Zero Allocation per Frame)     │
│ - COMPLETELY OUTSIDE REACT STATE (Bypasses React VDOM)           │
└───────────────────┬──────────────────────────────┬───────────────┘
                    │                              │ Throttled (250ms)
                    │ Direct Reading (60 FPS)      ▼
                    ▼               ┌──────────────────────────────┐
┌─────────────────────────────────┐ │  REACT UI & SHELL (LOW FREQ) │
│ STAGE 4: HARDWARE CANVAS ENGINE │ │ - Selected Vehicle HUD       │
│ - requestAnimationFrame Loop    │ │ - Topbar & Breadcrumbs       │
│ - Viewport Culling (BBox Filter)│ │ - KPI Overview Summary       │
│ - Heading Vector Transformations│ │ - Geofence Incident Toasts   │
└─────────────────┬───────────────┘ └──────────────────────────────┘
                  │ Rendered Pixels
                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                   STAGE 5: VISIBLE FLEET MAP                     │
│    Leaflet GIS Projection Layer + Synchronized HTML5 Canvas      │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Why High-Frequency Telemetry Must Bypass React State

### 3.1 The Virtual DOM Churn Problem
In standard React state (`useState` / `useReducer`):
1. Every state mutation triggers component reconciliation and Virtual DOM diffing.
2. When streaming $2,500\,\text{events/sec}$ across thousands of moving vehicles, triggering React state updates creates $\sim 2,500$ re-render evaluations per second.
3. React's fiber scheduler becomes completely saturated; JavaScript garbage collection spikes due to continuous object allocation, resulting in frame drops ($< 15\,\text{FPS}$) and frozen UI controls.

### 3.2 The Zero-Allocation Mutable Buffer Solution
FleetDash decouples telemetry storage from the React render lifecycle:
- High-frequency telemetry updates directly mutate a pre-allocated internal `Map<string, VehicleTelemetry>` inside [`vehiclePositionStore.ts`](file:///c:/Users/sandh/OneDrive/Desktop/Fleetdash/src/stores/vehiclePositionStore.ts).
- React components only listen to **throttled aggregated metrics** ($4\,\text{Hz} = 250\,\text{ms}$) for display in summary KPI cards.
- The Canvas rendering engine directly references the mutable store at screen refresh rates ($60\,\text{Hz}$ via `requestAnimationFrame`), performing zero React reconciliations during coordinate updates.

---

## 4. Viewport Culling & Mathematical Optimization

Even with hardware acceleration, executing canvas rendering operations for 10,000 objects per frame when only 400 are visible on screen creates unnecessary GPU overhead.

### 4.1 Bounding Box Spatial Filter
During each animation frame, the rendering engine extracts the geographical bounding box of the active Leaflet viewport with safety padding:
$$\text{minLat} \le \text{lat} \le \text{maxLat} \quad \text{and} \quad \text{minLng} \le \text{lng} \le \text{maxLng}$$

Only vehicles within this bounding box are projected into container pixel coordinates $(x, y)$ via:
$$(x, y) = \text{map.latLngToContainerPoint}([\text{lat}, \text{lng}])$$

### 4.2 Mathematical Transformation Pipeline
To orient each vehicle symbol accurately without creating intermediate SVG DOM nodes:
1. `ctx.save()`
2. `ctx.translate(x, y)`
3. `ctx.rotate((heading \times \pi) / 180)`
4. Draw vehicle vector polygon:
   - Nose point: $(0, -r)$
   - Right wing: $(r \times 0.75, r)$
   - Inward indent: $(0, r \times 0.6)$
   - Left wing: $(-r \times 0.75, r)$
5. `ctx.restore()`

---

## 5. Lifecycle Safety & Resource Management

To prevent browser memory leaks in long-running command-center dispatch sessions:
- **Single Render Loop:** Exactly one `requestAnimationFrame` loop runs per active map viewport.
- **Tab Inactivity Detection:** Listens to `document.visibilitychange`. If the operator switches browser tabs, the render loop pauses automatically to save CPU cycles and battery.
- **Component Teardown:** Upon unmount, `cancelAnimationFrame(frameId)` is invoked, Leaflet event listeners (`move`, `zoom`, `viewreset`, `resize`) are detached, and canvas contexts are cleaned.
