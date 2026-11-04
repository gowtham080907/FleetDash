import { db } from '../src/db/database';

async function main() {
  await db.init();
  await db.flush();
  console.log('Legacy JSON migration check completed.');
  console.log(`Vehicles: ${db.getAllVehicles().length}`);
  console.log(`Geofences: ${db.getGeofences().length}`);
  console.log(`Alerts: ${db.getAlerts({ limit: 200 }).length}`);
  console.log('The migration runs automatically on first startup when MongoDB collections are empty.');
  await db.close();
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
