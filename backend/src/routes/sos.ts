import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { query } from '../lib/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// ─────────────────────────────────────────────────────────────
// Twilio SMS Broadcaster
// ─────────────────────────────────────────────────────────────
const getTwilioClient = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token || sid.startsWith('AC' + 'xxx') || token === 'your_auth_token_here') {
    return null; // Twilio not configured — will log to console instead
  }

  try {
    const twilio = require('twilio');
    return twilio(sid, token);
  } catch (err) {
    console.warn('Twilio module load error:', err);
    return null;
  }
};

const broadcastSOS = async (
  userName: string,
  userPhone: string,
  contacts: any[],
  latitude: number,
  longitude: number,
  audioUrl?: string,
  videoUrl?: string,
  screenshotUrl?: string
) => {
  const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
  const backendBase = process.env.BACKEND_PUBLIC_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://safepath-backend-zeta.vercel.app');

  // For Twilio SMS, use .mp4 to ensure playback on mobile browsers instead of .webm
  const evidencePath = (videoUrl || audioUrl || screenshotUrl || '').replace('.webm', '.mp4');
  const evidenceLink = evidencePath ? `${backendBase}${evidencePath}` : '';

  // Clean, ASCII only, single-segment format (no emojis or non-GSM-7 characters to prevent dropping to 70-character limit)
  let smsBody = `SAFEPATH SOS: ${userName} (${userPhone}). Loc: ${mapsLink}`;
  if (evidenceLink) {
    smsBody += ` Evid: ${evidenceLink}`;
  }

  const twilioClient = getTwilioClient();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (twilioClient && fromNumber) {
    // Send real SMS to every trusted contact
    const results = await Promise.allSettled(
      contacts.map(async (contact) => {
        try {
          // Normalize and format phone number to E.164
          let rawPhone = contact.phone.trim();
          let toPhone = rawPhone.replace(/[\s\-()]/g, '');
          if (!toPhone.startsWith('+')) {
            const digits = toPhone.replace(/\D/g, '');
            if (digits.length === 10) {
              toPhone = `+91${digits}`; // Assume India (+91) for 10-digit numbers
            } else if (digits.length === 12 && digits.startsWith('91')) {
              toPhone = `+${digits}`;
            } else if (digits.length === 11 && digits.startsWith('1')) {
              toPhone = `+${digits}`;
            } else {
              toPhone = `+${digits}`;
            }
          }

          const msg = await twilioClient.messages.create({
            body: smsBody,
            from: fromNumber,
            to: toPhone
          });
          console.log(`✅ SMS sent to ${contact.name} (${toPhone}): SID ${msg.sid}`);
          return { success: true, contact: contact.name, sid: msg.sid };
        } catch (err: any) {
          console.error(`❌ SMS failed for ${contact.name} (${contact.phone}):`, err.message);
          return { success: false, contact: contact.name, error: err.message };
        }
      })
    );
    return results;
  } else {
    // Twilio not configured — print full SMS payload to console for testing
    console.log('\n' + '═'.repeat(60));
    console.log('📡 SAFEPATH AI — SOS BROADCAST (Twilio not configured)');
    console.log('═'.repeat(60));
    console.log(`📞 Would send to ${contacts.length} contact(s):`);
    contacts.forEach(c => console.log(`   → ${c.name}: ${c.phone}`));
    console.log('\n📨 SMS BODY:\n');
    console.log(smsBody);
    console.log('═'.repeat(60) + '\n');

    return contacts.map(c => ({
      success: false,
      contact: c.name,
      note: 'Twilio not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to .env'
    }));
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/sos — Trigger Emergency SOS
// ─────────────────────────────────────────────────────────────
router.post('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { trip_id, latitude, longitude, audio_url, video_url, screenshot_url } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'GPS coordinates are required for SOS activation' });
  }

  try {
    // 1. Get user details (name, phone)
    const userResult = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 2. Fetch ALL of the user's trusted contacts from the real database
    const contactsResult = await query('SELECT * FROM contacts WHERE user_id = $1', [req.user.id]);
    const contacts = contactsResult.rows;

    // 3. Save SOS event
    const result = await query(
      "INSERT INTO sos_events (user_id, trip_id, latitude, longitude, status, audio_url, video_url, screenshot_url) VALUES ($1, $2, $3, $4, 'active', $5, $6, $7) RETURNING *",
      [req.user.id, trip_id || null, latitude, longitude, audio_url || '', video_url || '', screenshot_url || '']
    );

    const sosEvent = result.rows[0];

    // 4. Flag trip as SOS status
    if (trip_id) {
      await query("UPDATE trips SET safety_status = 'sos' WHERE id = $1", [trip_id]);
    }

    // 5. Fire real Twilio SMS broadcasts to all contacts
    let broadcastResults: any[] = [];
    if (contacts.length > 0) {
      broadcastResults = await broadcastSOS(
        user.name,
        user.phone || 'Unknown',
        contacts,
        latitude,
        longitude,
        audio_url,
        video_url,
        screenshot_url
      );
    } else {
      console.warn(`⚠️  SOS triggered but user "${user.name}" has no trusted contacts configured!`);
    }

    res.status(201).json({
      sos: sosEvent,
      broadcast: {
        contacts_notified: contacts.length,
        results: broadcastResults,
        google_maps_link: `https://maps.google.com/?q=${latitude},${longitude}`
      }
    });
  } catch (error) {
    console.error('Trigger SOS error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/sos — Get SOS History
// ─────────────────────────────────────────────────────────────
router.get('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    let result;
    if (req.user.role === 'admin') {
      result = await query(
        'SELECT s.*, u.name as user_name, u.phone as user_phone FROM sos_events s JOIN users u ON s.user_id = u.id ORDER BY s.created_at DESC'
      );
    } else {
      result = await query(
        'SELECT * FROM sos_events WHERE user_id = $1 ORDER BY created_at DESC',
        [req.user.id]
      );
    }
    res.json({ sos_events: result.rows });
  } catch (error) {
    console.error('Fetch SOS events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/sos/:id/resolve
// ─────────────────────────────────────────────────────────────
router.put('/:id/resolve', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const sosId = req.params.id;

  try {
    const result = await query(
      "UPDATE sos_events SET status = 'resolved', resolved_at = $1 WHERE id = $2 RETURNING *",
      [new Date().toISOString(), sosId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'SOS event not found' });
    }

    const sosEvent = result.rows[0];
    if (sosEvent.trip_id) {
      await query("UPDATE trips SET safety_status = 'safe' WHERE id = $1", [sosEvent.trip_id]);
    }

    res.json({ sos: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/sos/upload — Upload Evidence File (base64)
// ─────────────────────────────────────────────────────────────
router.post('/upload', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const { fileType, base64Data } = req.body;

  if (!fileType || !base64Data) {
    return res.status(400).json({ error: 'fileType and base64Data are required' });
  }

  try {
    const uploadDir = path.join(__dirname, '../../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = fileType === 'video' ? 'webm' : fileType === 'audio' ? 'wav' : 'jpg';
    const filename = `ev_${Date.now()}.${ext}`;
    const filePath = path.join(uploadDir, filename);

    const cleanData = base64Data.replace(/^data:[^,]+,/, '');
    const buffer = Buffer.from(cleanData, 'base64');
    fs.writeFileSync(filePath, buffer);

    const url = `/uploads/${filename}`;
    console.log(`📁 Evidence saved: ${filePath}`);
    res.json({ url });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;
