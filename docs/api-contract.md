# FleetDash — API & Socket.IO Contract Specification

This document details the interface contracts between the **FleetDash Frontend** and the backend event-driven services (Node.js, Express, Socket.IO, Redis Pub/Sub, MongoDB).

---

## 1. REST API Endpoints (Low-Frequency State)

All low-frequency state queries operate over standard JSON REST APIs.

### 1.1 Authentication
- **`POST /api/auth/login`**
  - **Request Body:** `{ email: string, password?: string }`
  - **Response (200):** `{ user: { id, name, email, role, department }, token?: string }`
- **`POST /api/auth/logout`**
  - **Response (200):** `{ success: true }`
- **`GET /api/auth/me`**
  - **Response (200):** Current authenticated user session object

### 1.2 Fleet Overview & Statistics
- **`GET /api/fleet/stats`**
  - **Response (200):**
    ```json
    {
      "totalVehicles": 1000,
      "activeVehicles": 680,
      "idleVehicles": 210,
      "offlineVehicles": 110,
      "activeAlerts": 4,
      "eventsPerSecond": 1850,
      "averageSpeed": 54,
      "connectionStatus": "connected",
      "lastIngestionTime": 1704067200000
    }
    ```

### 1.3 Vehicle Registry
- **`GET /api/vehicles`**
  - **Query Parameters:**
    - `search`: string (matches Vehicle ID, Driver Name, or Model)
    - `status`: `'active' | 'idle' | 'offline' | 'all'`
    - `geofenceStatus`: `'inside' | 'breached' | 'clear' | 'all'`
    - `sortBy`: `'id' | 'name' | 'speed' | 'status' | 'lastUpdated'`
    - `sortOrder`: `'asc' | 'desc'`
    - `page`: integer (default `1`)
    - `pageSize`: integer (default `10`)
  - **Response (200):**
    ```json
    {
      "items": [
        {
          "id": "VH-1001",
          "name": "Fleet Unit #1001",
          "driverName": "Marcus Vance",
          "status": "active",
          "speed": 68.4,
          "heading": 182.5,
          "latitude": 41.8781,
          "longitude": -87.6298,
          "lastUpdated": 1704067200000,
          "geofenceStatus": "inside",
          "currentGeofence": "Metro Distribution Hub A",
          "fuelLevel": 85,
          "model": "Freightliner Cascadia EV",
          "odometer": 25420
        }
      ],
      "total": 60,
      "page": 1,
      "pageSize": 10,
      "totalPages": 6
    }
    ```

- **`GET /api/vehicles/:id`**
  - **Response (200):** Single `Vehicle` telemetry object.
  - **Response (404):** `{ error: "Vehicle not found" }`

### 1.4 Historical Analytics
- **`GET /api/telemetry/stats`**
  - **Response (200):** Returns status distributions, 24-hour activity trends, speed histogram brackets, and alert severity breakdowns.

---

## 2. High-Frequency Socket.IO Event Contract

Real-time telemetry streams over duplex WebSockets via Socket.IO.

### 2.1 Proposed Event Names

| Event Name | Direction | Payload Type | Description |
| :--- | :--- | :--- | :--- |
| `telemetry:batch` | Server &rarr; Client | `Array<VehicleTelemetry>` OR `ArrayBuffer` | High-frequency telemetry stream emitted in batches (10–200 units). |
| `vehicle:updated` | Server &rarr; Client | `VehicleTelemetry` | Single unit delta update. |
| `vehicle:status` | Server &rarr; Client | `{ vehicleId, status }` | Immediate status transition (e.g. active to idle). |
| `geofence:breach` | Server &rarr; Client | `GeofenceEventPayload` | Authoritative geofence breach event computed by backend worker thread. |
| `geofence:clear` | Server &rarr; Client | `{ vehicleId, geofenceId, timestamp }` | Recovery or cleared breach state. |
| `fleet:stats` | Server &rarr; Client | `FleetStats` | Periodic broadcast of aggregate fleet statistics. |

### 2.2 Telemetry JSON Schema (`VehicleTelemetry`)
```typescript
interface VehicleTelemetry {
  vehicleId: string;       // Unique vehicle identifier (e.g. "VH-1001")
  latitude: number;        // WGS84 decimal degrees [-90.0, 90.0]
  longitude: number;       // WGS84 decimal degrees [-180.0, 180.0]
  speed: number;           // Velocity in km/h [0.0, 350.0]
  heading: number;         // Azimuth clockwise from North in degrees [0.0, 360.0]
  timestamp: number;       // Unix epoch milliseconds
  status: "active" | "idle" | "offline";
  geofenceStatus?: "inside" | "breached" | "clear" | "none";
  altitude?: number;       // Optional meters above sea level
}
```

### 2.3 Geofence Breach Event Schema (`geofence:breach`)
```typescript
interface GeofenceEventPayload {
  eventId: string;         // Unique event identifier (e.g. "ev-br-1704067200")
  vehicleId: string;       // Target vehicle identifier
  geofenceId: string;      // Identifier of perimeter breached
  geofenceName: string;    // Human-readable perimeter name
  type: "breach" | "entry" | "exit";
  timestamp: number;       // Unix epoch milliseconds
  latitude: number;        // Breach coordinate latitude
  longitude: number;       // Breach coordinate longitude
  speed: number;           // Speed at time of breach
}
```

---

## 3. Versioned 32-Byte Binary Protocol Specification

For maximum network efficiency under high-throughput workloads (thousands of moving vehicles), telemetry batches can be transmitted as binary `ArrayBuffer` payloads.

### 3.1 Packet Layout (Fixed 32 Bytes per Vehicle Record)

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

### 3.2 Field Details & Encodings
1. **Magic Byte (`0xFD`):** Identifies packet as FleetDash telemetry protocol. Packets lacking `0xFD` at index 0 are rejected as malformed.
2. **Version Byte (`0x01`):** Protocol version 1.
3. **Status Code (1 byte):**
   - `0` = `active`
   - `1` = `idle`
   - `2` = `offline`
4. **Geofence Code (1 byte):**
   - `0` = `inside`
   - `1` = `breached`
   - `2` = `clear`
   - `3` = `none`
5. **Endianness:** Explicit Little Endian (`LE`) across all multi-byte numeric primitives.
6. **Batch Framing:** A batch of $N$ vehicle telemetry updates is transmitted as a single contiguous `ArrayBuffer` with length $N \times 32$ bytes.

---

## 4. Frontend Decoupled Ingestion Architecture

```
[ WebSocket / ArrayBuffer / JSON ]
               │
               ▼
   [ Telemetry Decoder & Boundary Validator ]
               │ (Drops malformed / out-of-bounds packets)
               ▼
   [ Mutable Spatial Position Store (Map / Ref) ]  <─── Zero React Rerenders
               │
        ┌──────┴──────────────────────────┐
        │ Direct Reading                  │ Throttled (250ms)
        ▼                                 ▼
[ HTML5 Canvas Engine (60 FPS rAF) ]    [ Low-Frequency UI / HUD / KPI ]
```
