# MongoDB Schema Reference

FleetDash uses stable string identifiers as MongoDB `_id` values. This keeps identifiers aligned with the existing TypeScript models and REST API.

## `vehicles`

```javascript
{
  _id: "VH-1001",
  id: "VH-1001",
  name: "Fleet Unit #1001",
  driverName: "Marcus Vance",
  status: "active",             // active | idle | offline
  speed: 68.4,                   // km/h
  heading: 182.5,                // degrees
  latitude: 41.8781,
  longitude: -87.6298,
  lastUpdated: 1793760000000,    // epoch milliseconds
  geofenceStatus: "inside",     // inside | breached | clear | none
  currentGeofence: "O'Hare Logistics Air Hub",
  fuelLevel: 85,
  model: "Freightliner Cascadia EV",
  odometer: 25420
}
```

## `geofences`

Stores the existing `GeofenceZone` shape. Circle zones use `center: [latitude, longitude]` and `radiusMeters`; polygon zones use `coordinates: [[latitude, longitude], ...]`.

## `alerts`

Stores the existing `GeofenceAlert` shape, including `vehicleId`, `geofenceId`, `severity`, `timestamp`, and `acknowledged`. The backend retains at most 200 active/history records in its current read model.

## `users`

Stores the existing `UserRecord` shape. `passwordHash` contains a bcrypt hash. Never store or log plaintext passwords.

## `telemetry_trails`

```javascript
{
  _id: "VH-1001",                // vehicle ID
  points: [
    {
      timestamp: 1793760000000,
      time: "10:00:00 AM",
      speed: 68.4,
      latitude: 41.8781,
      longitude: -87.6298,
      heading: 182.5,
      geofenceStatus: "inside"
    }
  ],
  updatedAt: 1793760000250
}
```

The current application keeps the newest 50 breadcrumb points per vehicle. This is recent route history, not an unlimited raw telemetry archive.

## Useful `mongosh` commands

```javascript
use fleetdash
show collections
db.vehicles.countDocuments()
db.geofences.countDocuments()
db.alerts.countDocuments()
db.users.countDocuments()
db.telemetry_trails.countDocuments()
db.vehicles.findOne({ _id: "VH-1001" })
db.vehicles.getIndexes()
```
