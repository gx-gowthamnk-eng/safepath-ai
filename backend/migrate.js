const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = "postgresql://postgres:%40gow13052222@db.bxuxrxhxgrarujrvyagq.supabase.co:5432/postgres";

async function runMigration() {
  console.log("Connecting to Supabase...");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected successfully!");

    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log("Executing schema.sql...");
    await client.query(schemaSql);
    console.log("Schema applied successfully!");
    
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

runMigration();
