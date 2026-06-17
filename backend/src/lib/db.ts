import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const DB_FILE_PATH = path.join(__dirname, '../../database.json');

// Initialize Pool (if DATABASE_URL exists)
let pool: Pool | null = null;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false
  });
}

// In-Memory/File backup database structure
interface DatabaseSchema {
  users: any[];
  contacts: any[];
  trips: any[];
  deviations: any[];
  reports: any[];
  sos_events: any[];
}

const defaultSchema: DatabaseSchema = {
  users: [
    {
      id: 'a0e829c6-a320-4b2a-a9a3-a7b2bc2c8e31',
      email: 'admin@safepath.ai',
      password_hash: '$2a$10$JmS1LWF2QXbQ2qXueBEgOuPI6ayKVkNGqMzEbaiZupLkUPm.65RCq', // pass: password
      name: 'SafePath Admin',
      phone: '+15550199',
      role: 'admin',
      mode: 'standard',
      language_pref: 'en',
      emergency_pin: '1234',
      created_at: new Date().toISOString()
    },
    {
      id: 'c3f912d8-b210-4c3b-b9b4-b8b3bc3c9f42',
      email: 'citizen@safepath.ai',
      password_hash: '$2a$10$JmS1LWF2QXbQ2qXueBEgOuPI6ayKVkNGqMzEbaiZupLkUPm.65RCq', // pass: password
      name: 'Anjali Devi',
      phone: '+15550188',
      role: 'user',
      mode: 'standard',
      language_pref: 'ta',
      emergency_pin: '1234',
      created_at: new Date().toISOString()
    }
  ],
  contacts: [],
  trips: [],
  deviations: [],
  reports: [
    {
      id: 'r1',
      user_id: 'c3f912d8-b210-4c3b-b9b4-b8b3bc3c9f42',
      category: 'dark_street',
      description: 'Streetlights broken for 2 weeks. Very dark and isolated.',
      latitude: 13.0827,
      longitude: 80.2707,
      safety_rating: 2,
      created_at: new Date().toISOString()
    },
    {
      id: 'r2',
      user_id: 'c3f912d8-b210-4c3b-b9b4-b8b3bc3c9f42',
      category: 'harassment',
      description: 'Repeated catcalling near the bus stop in the evenings.',
      latitude: 13.0602,
      longitude: 80.2462,
      safety_rating: 1,
      created_at: new Date().toISOString()
    }
  ],
  sos_events: []
};

// Check if database.json exists, if not initialize it
const loadDb = (): DatabaseSchema => {
  try {
    if (!fs.existsSync(DB_FILE_PATH)) {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(defaultSchema, null, 2));
      return defaultSchema;
    }
    const data = fs.readFileSync(DB_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading JSON database, using memory-fallback:', error);
    return defaultSchema;
  }
};

const saveDb = (db: DatabaseSchema) => {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Error writing to JSON database:', error);
  }
};

export const query = async (text: string, params?: any[]): Promise<any> => {
  if (pool) {
    try {
      const res = await pool.query(text, params);
      return { rows: res.rows, rowCount: res.rowCount };
    } catch (err) {
      console.warn('PostgreSQL query failed, falling back to JSON db mock operations...', err);
    }
  }

  // Fallback engine: Parse simple commands using local database.json
  const db = loadDb();
  
  // Clean query formatting to inspect what tables are requested
  const cmd = text.toLowerCase().trim();

  // 1. SELECT operations
  if (cmd.startsWith('select')) {
    if (cmd.includes('from users') && cmd.includes('email =')) {
      const email = params?.[0];
      const found = db.users.find(u => u.email === email);
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }
    if (cmd.includes('from users') && cmd.includes('id =')) {
      const id = params?.[0];
      const found = db.users.find(u => u.id === id);
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }
    if (cmd.includes('from contacts') && cmd.includes('user_id =')) {
      const userId = params?.[0];
      const found = db.contacts.filter(c => c.user_id === userId);
      return { rows: found, rowCount: found.length };
    }
    if (cmd.includes('from reports')) {
      return { rows: db.reports, rowCount: db.reports.length };
    }
    if (cmd.includes('from trips') && cmd.includes('user_id =') && cmd.includes('active')) {
      const userId = params?.[0];
      const found = db.trips.filter(t => t.user_id === userId && t.status === 'active');
      return { rows: found, rowCount: found.length };
    }
    if (cmd.includes('from trips') && cmd.includes('id =')) {
      const id = params?.[0];
      const found = db.trips.find(t => t.id === id);
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }
    if (cmd.includes('from trips')) {
      return { rows: db.trips, rowCount: db.trips.length };
    }
    if (cmd.includes('from sos_events')) {
      return { rows: db.sos_events, rowCount: db.sos_events.length };
    }
    if (cmd.includes('from users')) {
      return { rows: db.users, rowCount: db.users.length };
    }
  }

  // 2. INSERT operations
  if (cmd.startsWith('insert into users')) {
    // [email, password_hash, name, phone, role, mode, language_pref]
    const newUser = {
      id: Math.random().toString(36).substring(2, 15),
      email: params?.[0],
      password_hash: params?.[1],
      name: params?.[2],
      phone: params?.[3] || '',
      role: params?.[4] || 'user',
      mode: params?.[5] || 'standard',
      language_pref: params?.[6] || 'en',
      emergency_pin: '1234',
      created_at: new Date().toISOString()
    };
    db.users.push(newUser);
    saveDb(db);
    return { rows: [newUser], rowCount: 1 };
  }

  if (cmd.startsWith('insert into contacts')) {
    // [user_id, name, phone, relationship, priority]
    const newContact = {
      id: Math.random().toString(36).substring(2, 15),
      user_id: params?.[0],
      name: params?.[1],
      phone: params?.[2],
      relationship: params?.[3],
      priority: params?.[4] || 'friend',
      created_at: new Date().toISOString()
    };
    db.contacts.push(newContact);
    saveDb(db);
    return { rows: [newContact], rowCount: 1 };
  }

  if (cmd.startsWith('insert into reports')) {
    // [user_id, category, description, latitude, longitude, safety_rating]
    const newReport = {
      id: Math.random().toString(36).substring(2, 15),
      user_id: params?.[0],
      category: params?.[1],
      description: params?.[2],
      latitude: Number(params?.[3]),
      longitude: Number(params?.[4]),
      safety_rating: Number(params?.[5]),
      created_at: new Date().toISOString()
    };
    db.reports.push(newReport);
    saveDb(db);
    return { rows: [newReport], rowCount: 1 };
  }

  if (cmd.startsWith('insert into trips')) {
    // [user_id, origin_address, destination_address, origin_lat, origin_lng, destination_lat, destination_lng, current_lat, current_lng, battery_percent, safety_status, status]
    const newTrip = {
      id: Math.random().toString(36).substring(2, 15),
      user_id: params?.[0],
      origin_address: params?.[1],
      destination_address: params?.[2],
      origin_lat: Number(params?.[3]),
      origin_lng: Number(params?.[4]),
      destination_lat: Number(params?.[5]),
      destination_lng: Number(params?.[6]),
      current_lat: Number(params?.[7] || params?.[3]),
      current_lng: Number(params?.[8] || params?.[4]),
      battery_percent: Number(params?.[9] || 100),
      safety_status: params?.[10] || 'safe',
      status: params?.[11] || 'active',
      start_time: new Date().toISOString()
    };
    db.trips.push(newTrip);
    saveDb(db);
    return { rows: [newTrip], rowCount: 1 };
  }

  if (cmd.startsWith('insert into sos_events')) {
    // [user_id, trip_id, latitude, longitude, status, audio_url, video_url, screenshot_url]
    const newSos = {
      id: Math.random().toString(36).substring(2, 15),
      user_id: params?.[0],
      trip_id: params?.[1] || null,
      latitude: Number(params?.[2]),
      longitude: Number(params?.[3]),
      status: params?.[4] || 'active',
      audio_url: params?.[5] || '',
      video_url: params?.[6] || '',
      screenshot_url: params?.[7] || '',
      created_at: new Date().toISOString()
    };
    db.sos_events.push(newSos);
    saveDb(db);
    return { rows: [newSos], rowCount: 1 };
  }

  if (cmd.startsWith('insert into deviations')) {
    // [trip_id, lat, lng, deviation_type, details]
    const newDev = {
      id: Math.random().toString(36).substring(2, 15),
      trip_id: params?.[0],
      lat: Number(params?.[1]),
      lng: Number(params?.[2]),
      deviation_type: params?.[3],
      details: params?.[4] || '',
      created_at: new Date().toISOString()
    };
    db.deviations.push(newDev);
    saveDb(db);
    return { rows: [newDev], rowCount: 1 };
  }

  // 3. UPDATE operations
  if (cmd.startsWith('update users')) {
    const userId = params?.[1];
    const mode = params?.[0]; // assuming update users set mode = $1 where id = $2
    const uIdx = db.users.findIndex(u => u.id === userId);
    if (uIdx !== -1) {
      if (cmd.includes('set mode')) {
        db.users[uIdx].mode = mode;
      }
      saveDb(db);
      return { rows: [db.users[uIdx]], rowCount: 1 };
    }
  }

  if (cmd.startsWith('update trips')) {
    // assuming update trips set current_lat = $1, current_lng = $2, battery_percent = $3, safety_status = $4 where id = $5
    if (cmd.includes('current_lat')) {
      const lat = Number(params?.[0]);
      const lng = Number(params?.[1]);
      const bat = Number(params?.[2]);
      const safety = params?.[3];
      const tripId = params?.[4];
      const tIdx = db.trips.findIndex(t => t.id === tripId);
      if (tIdx !== -1) {
        db.trips[tIdx].current_lat = lat;
        db.trips[tIdx].current_lng = lng;
        db.trips[tIdx].battery_percent = bat;
        db.trips[tIdx].safety_status = safety;
        saveDb(db);
        return { rows: [db.trips[tIdx]], rowCount: 1 };
      }
    }
    // assuming update trips set status = $1, end_time = $2 where id = $3
    if (cmd.includes('set status =') && cmd.includes('end_time')) {
      const status = params?.[0];
      const endTime = params?.[1];
      const tripId = params?.[2];
      const tIdx = db.trips.findIndex(t => t.id === tripId);
      if (tIdx !== -1) {
        db.trips[tIdx].status = status;
        db.trips[tIdx].end_time = endTime;
        saveDb(db);
        return { rows: [db.trips[tIdx]], rowCount: 1 };
      }
    }
  }

  // 4. DELETE operations
  if (cmd.startsWith('delete from contacts')) {
    const contactId = params?.[0];
    const initialLen = db.contacts.length;
    db.contacts = db.contacts.filter(c => c.id !== contactId);
    saveDb(db);
    return { rowCount: initialLen - db.contacts.length };
  }

  return { rows: [], rowCount: 0 };
};
