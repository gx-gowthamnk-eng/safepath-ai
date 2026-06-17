const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:%40gow13052222@db.bxuxrxhxgrarujrvyagq.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

// This is bcrypt hash of the string 'password'
const hash = '$2a$10$JmS1LWF2QXbQ2qXueBEgOuPI6ayKVkNGqMzEbaiZupLkUPm.65RCq';

client.connect()
  .then(() => {
    console.log('Connected!');
    return client.query(
      'UPDATE users SET password_hash = $1 WHERE email IN ($2, $3)',
      [hash, 'admin@safepath.ai', 'citizen@safepath.ai']
    );
  })
  .then(r => {
    console.log('Updated rows:', r.rowCount);
    return client.end();
  })
  .then(() => console.log('Done!'))
  .catch(err => { console.error('Error:', err); process.exit(1); });
