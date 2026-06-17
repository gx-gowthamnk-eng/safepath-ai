const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
  connectionString: 'postgresql://postgres:%40gow13052222@db.bxuxrxhxgrarujrvyagq.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function checkHash() {
  await client.connect();
  
  // Get the stored hash
  const result = await client.query("SELECT email, password_hash FROM users WHERE email = 'citizen@safepath.ai'");
  if (result.rows.length === 0) {
    console.log('User not found!');
    await client.end();
    return;
  }
  
  const user = result.rows[0];
  console.log('Found user:', user.email);
  console.log('Hash:', user.password_hash);
  
  const isValid = await bcrypt.compare('password', user.password_hash);
  console.log('Password "password" matches:', isValid);
  
  await client.end();
}

checkHash().catch(console.error);
