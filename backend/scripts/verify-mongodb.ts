import 'dotenv/config';
const { MongoClient } = require('mongodb') as { MongoClient: new (uri: string) => any };

async function main() {
  const client = new MongoClient(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017');
  try {
    await client.connect();
    const db = client.db(process.env.MONGO_DB_NAME || 'fleetdash');
    await db.command({ ping: 1 });
    const names = ['vehicles', 'geofences', 'alerts', 'users', 'telemetry_trails'];
    console.log('\nFleetDash MongoDB verification');
    console.log('Database:', db.databaseName);
    for (const name of names) console.log(`${name.padEnd(18)} ${await db.collection(name).countDocuments()} document(s)`);
    console.log('\nMongoDB connection: OK');
  } finally {
    await client.close();
  }
}

main().catch((error) => { console.error('MongoDB verification failed:', error); process.exitCode = 1; });
