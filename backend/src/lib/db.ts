import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bxuxrxhxgrarujrvyagq.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

// Use service role key (bypasses Row Level Security for backend operations)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// SQL query adapter: translate raw SQL into Supabase JS client calls
// This allows all existing route code to keep working without changes
export const query = async (text: string, params?: any[]): Promise<any> => {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('FATAL: SUPABASE_SERVICE_KEY environment variable is not set!');
    throw new Error('Supabase service key not configured');
  }

  const cmd = text.toLowerCase().trim();

  // ─── SELECT ───────────────────────────────────────────────────────────────

  if (cmd.startsWith('select')) {
    // SELECT * FROM users WHERE email = $1
    if (cmd.includes('from users') && cmd.includes('email =')) {
      const { data, error } = await supabase.from('users').select('*').eq('email', params?.[0]);
      if (error) throw error;
      return { rows: data || [], rowCount: data?.length || 0 };
    }
    // SELECT ... FROM users WHERE id = $1
    if (cmd.includes('from users') && cmd.includes('id =')) {
      const cols = cmd.includes('id, email') 
        ? 'id,email,name,phone,role,mode,language_pref,emergency_pin' 
        : '*';
      const { data, error } = await supabase.from('users').select(cols).eq('id', params?.[0]);
      if (error) throw error;
      return { rows: data || [], rowCount: data?.length || 0 };
    }
    // SELECT * FROM users (all)
    if (cmd.includes('from users')) {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      return { rows: data || [], rowCount: data?.length || 0 };
    }
    // SELECT * FROM contacts WHERE user_id = $1
    if (cmd.includes('from contacts') && cmd.includes('user_id =')) {
      const { data, error } = await supabase.from('contacts').select('*').eq('user_id', params?.[0]).order('created_at', { ascending: false });
      if (error) throw error;
      return { rows: data || [], rowCount: data?.length || 0 };
    }
    // SELECT * FROM reports
    if (cmd.includes('from reports')) {
      const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return { rows: data || [], rowCount: data?.length || 0 };
    }
    // SELECT * FROM trips WHERE user_id = $1 AND status = 'active'
    if (cmd.includes('from trips') && cmd.includes('user_id =') && cmd.includes('active')) {
      const { data, error } = await supabase.from('trips').select('*').eq('user_id', params?.[0]).eq('status', 'active');
      if (error) throw error;
      return { rows: data || [], rowCount: data?.length || 0 };
    }
    // SELECT * FROM trips WHERE id = $1
    if (cmd.includes('from trips') && cmd.includes('id =') && !cmd.includes('user_id')) {
      const { data, error } = await supabase.from('trips').select('*').eq('id', params?.[0]);
      if (error) throw error;
      return { rows: data || [], rowCount: data?.length || 0 };
    }
    // SELECT * FROM trips WHERE user_id = $1
    if (cmd.includes('from trips') && cmd.includes('user_id =')) {
      const { data, error } = await supabase.from('trips').select('*').eq('user_id', params?.[0]).order('start_time', { ascending: false });
      if (error) throw error;
      return { rows: data || [], rowCount: data?.length || 0 };
    }
    // SELECT * FROM trips (all)
    if (cmd.includes('from trips')) {
      const { data, error } = await supabase.from('trips').select('*').order('start_time', { ascending: false });
      if (error) throw error;
      return { rows: data || [], rowCount: data?.length || 0 };
    }
    // SELECT * FROM sos_events WHERE user_id = $1
    if (cmd.includes('from sos_events') && cmd.includes('user_id =')) {
      const { data, error } = await supabase.from('sos_events').select('*').eq('user_id', params?.[0]);
      if (error) throw error;
      return { rows: data || [], rowCount: data?.length || 0 };
    }
    // SELECT * FROM sos_events (all)
    if (cmd.includes('from sos_events')) {
      const { data, error } = await supabase.from('sos_events').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return { rows: data || [], rowCount: data?.length || 0 };
    }
    // COUNT queries
    if (cmd.includes('count(*)')) {
      const tableMatch = cmd.match(/from (\w+)/);
      const table = tableMatch?.[1];
      if (table) {
        let q = supabase.from(table).select('*', { count: 'exact', head: true });
        if (cmd.includes("status = 'active'")) q = q.eq('status', 'active');
        const { count, error } = await q;
        if (error) throw error;
        return { rows: [{ count: String(count || 0) }], rowCount: 1 };
      }
    }
  }

  // ─── INSERT ───────────────────────────────────────────────────────────────

  if (cmd.startsWith('insert into users')) {
    const [email, password_hash, name, phone, role, mode, language_pref] = params || [];
    const { data, error } = await supabase.from('users').insert({
      email, password_hash, name, phone: phone || '', role: role || 'user',
      mode: mode || 'standard', language_pref: language_pref || 'en', emergency_pin: '1234'
    }).select();
    if (error) throw error;
    return { rows: data || [], rowCount: data?.length || 0 };
  }

  if (cmd.startsWith('insert into contacts')) {
    const [user_id, name, phone, relationship, priority] = params || [];
    const { data, error } = await supabase.from('contacts').insert({
      user_id, name, phone, relationship: relationship || '', priority: priority || 'friend'
    }).select();
    if (error) throw error;
    return { rows: data || [], rowCount: data?.length || 0 };
  }

  if (cmd.startsWith('insert into reports')) {
    const [user_id, category, description, latitude, longitude, safety_rating] = params || [];
    const { data, error } = await supabase.from('reports').insert({
      user_id, category, description, latitude: Number(latitude),
      longitude: Number(longitude), safety_rating: Number(safety_rating)
    }).select();
    if (error) throw error;
    return { rows: data || [], rowCount: data?.length || 0 };
  }

  if (cmd.startsWith('insert into trips')) {
    const [user_id, origin_address, destination_address, origin_lat, origin_lng,
           destination_lat, destination_lng, current_lat, current_lng,
           battery_percent, safety_status, status] = params || [];
    const { data, error } = await supabase.from('trips').insert({
      user_id, origin_address, destination_address,
      origin_lat: Number(origin_lat), origin_lng: Number(origin_lng),
      destination_lat: Number(destination_lat), destination_lng: Number(destination_lng),
      current_lat: Number(current_lat || origin_lat), current_lng: Number(current_lng || origin_lng),
      battery_percent: Number(battery_percent || 100),
      safety_status: safety_status || 'safe', status: status || 'active'
    }).select();
    if (error) throw error;
    return { rows: data || [], rowCount: data?.length || 0 };
  }

  if (cmd.startsWith('insert into sos_events')) {
    const [user_id, trip_id, latitude, longitude, status, audio_url, video_url, screenshot_url] = params || [];
    const { data, error } = await supabase.from('sos_events').insert({
      user_id, trip_id: trip_id || null, latitude: Number(latitude),
      longitude: Number(longitude), status: status || 'active',
      audio_url: audio_url || '', video_url: video_url || '', screenshot_url: screenshot_url || ''
    }).select();
    if (error) throw error;
    return { rows: data || [], rowCount: data?.length || 0 };
  }

  if (cmd.startsWith('insert into deviations')) {
    const [trip_id, lat, lng, deviation_type, details] = params || [];
    const { data, error } = await supabase.from('deviations').insert({
      trip_id, lat: Number(lat), lng: Number(lng),
      deviation_type, details: details || ''
    }).select();
    if (error) throw error;
    return { rows: data || [], rowCount: data?.length || 0 };
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────

  if (cmd.startsWith('update users') && cmd.includes('set mode')) {
    const [mode, userId] = params || [];
    const { data, error } = await supabase.from('users')
      .update({ mode })
      .eq('id', userId)
      .select('id,email,name,role,mode,language_pref');
    if (error) throw error;
    return { rows: data || [], rowCount: data?.length || 0 };
  }

  if (cmd.startsWith('update users') && cmd.includes('password_hash')) {
    const [password_hash, ...rest] = params || [];
    // update by email list — used for seed fix
    const { data, error } = await supabase.from('users').update({ password_hash }).in('email', rest);
    if (error) throw error;
    return { rows: data || [], rowCount: 0 };
  }

  if (cmd.startsWith('update trips') && cmd.includes('current_lat')) {
    const [current_lat, current_lng, battery_percent, safety_status, tripId] = params || [];
    const { data, error } = await supabase.from('trips')
      .update({ current_lat: Number(current_lat), current_lng: Number(current_lng), battery_percent: Number(battery_percent), safety_status })
      .eq('id', tripId).select();
    if (error) throw error;
    return { rows: data || [], rowCount: data?.length || 0 };
  }

  if (cmd.startsWith('update trips') && cmd.includes('end_time')) {
    const [status, end_time, tripId] = params || [];
    const { data, error } = await supabase.from('trips')
      .update({ status, end_time })
      .eq('id', tripId).select();
    if (error) throw error;
    return { rows: data || [], rowCount: data?.length || 0 };
  }

  if (cmd.startsWith('update sos_events')) {
    const [status, resolved_at, sosId] = params || [];
    const { data, error } = await supabase.from('sos_events')
      .update({ status, resolved_at })
      .eq('id', sosId).select();
    if (error) throw error;
    return { rows: data || [], rowCount: data?.length || 0 };
  }

  // ─── DELETE ───────────────────────────────────────────────────────────────

  if (cmd.startsWith('delete from contacts')) {
    const [contactId, userId] = params || [];
    const { error, count } = await supabase.from('contacts')
      .delete({ count: 'exact' })
      .eq('id', contactId)
      .eq('user_id', userId);
    if (error) throw error;
    return { rowCount: count || 0 };
  }

  if (cmd.startsWith('delete from reports')) {
    const [reportId, userId] = params || [];
    const { error, count } = await supabase.from('reports')
      .delete({ count: 'exact' })
      .eq('id', reportId)
      .eq('user_id', userId);
    if (error) throw error;
    return { rowCount: count || 0 };
  }

  console.warn('Unhandled SQL query pattern:', text);
  return { rows: [], rowCount: 0 };
};
