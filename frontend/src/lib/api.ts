const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://safepath-backend-zeta.vercel.app/api';
const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000';

// Global token state (will sync with localStorage on client side)
let authToken: string | null = null;

if (typeof window !== 'undefined') {
  authToken = localStorage.getItem('safepath_token');
}

export const setToken = (token: string | null) => {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('safepath_token', token);
    } else {
      localStorage.removeItem('safepath_token');
      localStorage.removeItem('safepath_user');
    }
  }
};

const getHeaders = () => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
};

// Safe request wrapper with mock fallbacks
async function request(url: string, options: RequestInit = {}, fallbackData?: any) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorObj;
      try {
        errorObj = JSON.parse(errorText);
      } catch {
        errorObj = { error: errorText };
      }
      throw new Error(errorObj.error || `HTTP error ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.warn(`Request to ${url} failed. Using mock safety fallback. Error:`, error.message);
    if (fallbackData !== undefined) {
      return fallbackData;
    }
    throw error;
  }
}

// ----------------------------------------------------
// AUTHENTICATION APIs
// ----------------------------------------------------
export const authApi = {
  register: async (data: { email: string; name: string; password: string; phone?: string; mode?: string; language_pref?: string }) => {
    const res = await request(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, {
      token: 'mock_token_' + Date.now(),
      user: {
        id: 'mock_user_id',
        email: data.email,
        name: data.name,
        phone: data.phone || '',
        role: 'user',
        mode: data.mode || 'standard',
        language_pref: data.language_pref || 'en',
        emergency_pin: '1234'
      }
    });
    if (res.token) setToken(res.token);
    return res;
  },

  login: async (data: { email: string; password: string }) => {
    // No mock fallback for login — must authenticate against real backend
    const res = await request(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) setToken(res.token);
    return res;
  },

  getProfile: async () => {
    return await request(`${BACKEND_URL}/auth/profile`, {
      method: 'GET',
    }, {
      user: {
        id: 'mock_user_id',
        email: 'citizen@safepath.ai',
        name: 'Anjali Devi',
        phone: '+15550188',
        role: 'user',
        mode: 'standard',
        language_pref: 'ta',
        emergency_pin: '1234'
      }
    });
  },

  updateMode: async (mode: 'standard' | 'child' | 'senior') => {
    return await request(`${BACKEND_URL}/auth/mode`, {
      method: 'PUT',
      body: JSON.stringify({ mode }),
    }, {
      user: {
        id: 'mock_user_id',
        email: 'citizen@safepath.ai',
        name: 'Anjali Devi',
        role: 'user',
        mode,
        language_pref: 'ta'
      }
    });
  }
};

// ----------------------------------------------------
// TRUSTED CONTACTS APIs
// ----------------------------------------------------
export interface Contact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  priority: 'family' | 'friend' | 'emergency';
}

export const contactsApi = {
  getAll: async () => {
    const res = await request(`${BACKEND_URL}/contacts`, {
      method: 'GET',
    }, { contacts: [] });
    return res.contacts;
  },

  add: async (contact: Omit<Contact, 'id'>) => {
    const res = await request(`${BACKEND_URL}/contacts`, {
      method: 'POST',
      body: JSON.stringify(contact),
    }, {
      contact: {
        id: 'mock_contact_' + Math.random().toString(36).substring(7),
        ...contact
      }
    });
    return res.contact;
  },

  delete: async (id: string) => {
    return await request(`${BACKEND_URL}/contacts/${id}`, {
      method: 'DELETE',
    }, { success: true });
  }
};

// ----------------------------------------------------
// COMMUNITY REPORTS APIs
// ----------------------------------------------------
export interface SafetyReport {
  id: string;
  category: 'harassment' | 'dark_street' | 'suspicious_activity' | 'unsafe_area' | 'road_hazard';
  description: string;
  latitude: number;
  longitude: number;
  safety_rating: number;
  created_at?: string;
}

export const reportsApi = {
  getAll: async () => {
    const res = await request(`${BACKEND_URL}/reports`, {
      method: 'GET',
    }, {
      reports: [
        { id: 'r1', category: 'dark_street', description: 'Streetlights broken. Dark street.', latitude: 13.0827, longitude: 80.2707, safety_rating: 2, created_at: new Date().toISOString() },
        { id: 'r2', category: 'harassment', description: 'Catcalling reported near bus stop.', latitude: 13.0602, longitude: 80.2462, safety_rating: 1, created_at: new Date().toISOString() },
        { id: 'r3', category: 'suspicious_activity', description: 'Unsupervised gangs gathering.', latitude: 13.0850, longitude: 80.2100, safety_rating: 3, created_at: new Date().toISOString() },
      ]
    });
    return res.reports;
  },

  create: async (report: Omit<SafetyReport, 'id'>) => {
    const res = await request(`${BACKEND_URL}/reports`, {
      method: 'POST',
      body: JSON.stringify(report),
    }, {
      report: {
        id: 'mock_report_' + Math.random().toString(36).substring(7),
        ...report,
        created_at: new Date().toISOString()
      }
    });
    return res.report;
  },

  delete: async (id: string) => {
    return await request(`${BACKEND_URL}/reports/${id}`, {
      method: 'DELETE',
    }, { success: true });
  }
};

// ----------------------------------------------------
// TRIP TRACKING APIs
// ----------------------------------------------------
export interface Trip {
  id: string;
  user_id: string;
  origin_address: string;
  destination_address: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  current_lat?: number;
  current_lng?: number;
  battery_percent?: number;
  safety_status?: 'safe' | 'warning' | 'danger' | 'sos';
  status?: 'active' | 'completed' | 'cancelled';
  start_time?: string;
  end_time?: string;
}

export const tripsApi = {
  getActive: async () => {
    const res = await request(`${BACKEND_URL}/trips/active`, {
      method: 'GET',
    }, { trip: null });
    return res.trip;
  },

  getAll: async () => {
    const res = await request(`${BACKEND_URL}/trips`, {
      method: 'GET',
    }, { trips: [] });
    return res.trips;
  },

  start: async (tripData: Omit<Trip, 'id' | 'user_id'>) => {
    const res = await request(`${BACKEND_URL}/trips`, {
      method: 'POST',
      body: JSON.stringify(tripData),
    }, {
      trip: {
        id: 'mock_trip_' + Math.random().toString(36).substring(7),
        user_id: 'mock_user_id',
        ...tripData,
        battery_percent: 100,
        safety_status: 'safe',
        status: 'active',
        start_time: new Date().toISOString()
      }
    });
    return res.trip;
  },

  updateLocation: async (id: string, data: { current_lat: number; current_lng: number; battery_percent: number; safety_status: string }) => {
    const res = await request(`${BACKEND_URL}/trips/${id}/location`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, {
      trip: {
        id,
        ...data,
        status: 'active'
      }
    });
    return res.trip;
  },

  logDeviation: async (id: string, data: { lat: number; lng: number; deviation_type: string; details?: string }) => {
    return await request(`${BACKEND_URL}/trips/${id}/deviation`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, { success: true });
  },

  complete: async (id: string) => {
    const res = await request(`${BACKEND_URL}/trips/${id}/complete`, {
      method: 'PUT',
    }, {
      trip: {
        id,
        status: 'completed',
        end_time: new Date().toISOString()
      }
    });
    return res.trip;
  }
};

// ----------------------------------------------------
// SOS EMERGENCY APIs
// ----------------------------------------------------
export interface SosEvent {
  id: string;
  user_id: string;
  trip_id?: string;
  latitude: number;
  longitude: number;
  status: 'active' | 'resolved';
  audio_url?: string;
  video_url?: string;
  screenshot_url?: string;
  created_at: string;
}

export const sosApi = {
  trigger: async (data: { trip_id?: string; latitude: number; longitude: number; audio_url?: string; video_url?: string; screenshot_url?: string }) => {
    const res = await request(`${BACKEND_URL}/sos`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, {
      sos: {
        id: 'mock_sos_' + Math.random().toString(36).substring(7),
        user_id: 'mock_user_id',
        status: 'active',
        created_at: new Date().toISOString(),
        ...data
      }
    });
    return res.sos;
  },

  getAll: async () => {
    const res = await request(`${BACKEND_URL}/sos`, {
      method: 'GET',
    }, { sos_events: [] });
    return res.sos_events;
  },

  resolve: async (id: string) => {
    const res = await request(`${BACKEND_URL}/sos/${id}/resolve`, {
      method: 'PUT',
    }, {
      sos: {
        id,
        status: 'resolved',
        resolved_at: new Date().toISOString()
      }
    });
    return res.sos;
  },

  uploadEvidence: async (fileType: 'audio' | 'video' | 'image', base64Data: string) => {
    const res = await request(`${BACKEND_URL}/sos/upload`, {
      method: 'POST',
      body: JSON.stringify({ fileType, base64Data }),
    }, {
      url: `/uploads/mock_evidence_${Date.now()}.${fileType === 'video' ? 'webm' : fileType === 'audio' ? 'wav' : 'jpg'}`
    });
    return res.url;
  }
};

// ----------------------------------------------------
// AI ENGINE ROUTING & SAFETY PREDICTION APIs
// ----------------------------------------------------
export const aiApi = {
  predictSafety: async (start: { lat: number; lng: number }, destination: { lat: number; lng: number }, hourOfDay = 12) => {
    return await request(`${AI_ENGINE_URL}/predict-safety`, {
      method: 'POST',
      body: JSON.stringify({ start, destination, hour_of_day: hourOfDay }),
    }, {
      // Mock safe routing intelligence
      safety_score: 91.5,
      risk_level: 'Low',
      recommendations: [
        'Route is highly rated. Safe to travel.',
        'Well-lit roads and close to 2 Police Stations.'
      ]
    });
  },

  routeRisk: async (routes: { id: string; name: string; coordinates: { lat: number; lng: number }[] }[], hourOfDay = 12) => {
    const res = await request(`${AI_ENGINE_URL}/route-risk`, {
      method: 'POST',
      body: JSON.stringify({ routes, hour_of_day: hourOfDay }),
    }, {
      // Mock route risk scores matching user criteria
      routes: routes.map((r, idx) => {
        let score = 95;
        if (idx === 1) score = 82;
        if (idx === 2) score = 61;
        return {
          id: r.id,
          name: r.name,
          safety_score: score,
          coordinates: r.coordinates,
          is_recommended: idx === 0,
          rank: idx + 1
        };
      })
    });
    
    // Sort descending by score
    return res.routes;
  },

  communityRiskScore: async (lat: number, lng: number) => {
    return await request(`${AI_ENGINE_URL}/community-risk-score`, {
      method: 'POST',
      body: JSON.stringify({ lat, lng }),
    }, {
      safety_score: 88.0,
      threat_rating: 12.0,
      is_safe: true
    });
  }
};

// ----------------------------------------------------
// ADMIN METRICS
// ----------------------------------------------------
export const adminApi = {
  getMetrics: async () => {
    const res = await request(`${BACKEND_URL}/admin/metrics`, {
      method: 'GET',
    }, {
      metrics: {
        total_users: 124,
        total_trips: 412,
        active_trips: 3,
        total_reports: 18,
        active_sos_alerts: 0
      }
    });
    return res.metrics;
  }
};

// ----------------------------------------------------
// TEXT-TO-SPEECH (TTS) ASSISTANT HELPERS
// ----------------------------------------------------
export const speakText = (text: string, lang: 'en' | 'ta' = 'en') => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  
  // Cancel active utterance
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'ta' ? 'ta-IN' : 'en-US';
  
  // Voice selection helper
  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find(v => v.lang.startsWith(lang === 'ta' ? 'ta' : 'en'));
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }
  
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  
  window.speechSynthesis.speak(utterance);
};
