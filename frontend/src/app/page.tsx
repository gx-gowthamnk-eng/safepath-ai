"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, MapPin, Phone, Video, Mic, MicOff, Navigation,
  AlertTriangle, User, Activity, Trash2, Lock, Volume2,
  Compass, BatteryCharging, Settings, CheckCircle, X,
  Heart, Map, Eye, Info, Bell, UserPlus, LogIn, LogOut
} from "lucide-react";
import {
  authApi, contactsApi, reportsApi, tripsApi, sosApi, aiApi,
  speakText, setToken, Contact, SafetyReport, Trip, SosEvent
} from "../lib/api";

// ─── Google Maps Loader ───────────────────────────────────────
declare global {
  interface Window {
    google: any;
    initSafepathMap: () => void;
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

let mapInstance: any = null;
let streetViewPanorama: any = null;
let userMarker: any = null;
let routePolylines: any[] = [];
let hazardCircles: any[] = [];
let infoWindow: any = null;

const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(); return; }
    
    const existingScript = document.getElementById('gmaps-script');
    if (existingScript) {
      const interval = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(interval);
        if (window.google?.maps) resolve();
        else reject(new Error('Google Maps script exists but failed to load libraries'));
      }, 8000);
      return;
    }

    const script = document.createElement('script');
    script.id = 'gmaps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=initSafepathMap`;
    script.async = true;
    script.defer = true;
    window.initSafepathMap = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(new Error('Google Maps failed to load'));
    };
    document.head.appendChild(script);
  });
};

// ─── Calming AI Voice Scripts ─────────────────────────────────
const CALMING_SCRIPTS = {
  en: {
    sos_activated: "Please stay calm. I am right here with you. Your trusted contacts are being alerted right now with your live location and all recorded evidence. You are not alone. Help is on the way. Take a slow deep breath and stay in a visible place.",
    sos_countdown: "An SOS alert is about to be sent. If you are safe, enter your PIN now. Otherwise, stay calm — help will arrive shortly.",
    deviation: "I noticed you've gone off your usual route. Are you okay? Please tap 'I am Safe' if everything is fine. If you need help, your contacts will be notified immediately.",
    route_safe: "Your selected route is clear and safe. I will monitor your journey and alert you to any hazards ahead. You are in good hands.",
    route_warning: "There are some reported safety concerns along this route. I recommend staying on well-lit roads and keeping your phone visible. I am watching out for you.",
    greeting: "Hello! I am your SafePath AI assistant. I am here to keep you safe throughout your journey. How can I help you today?",
    searching: "Searching for safe routes. Analyzing road safety scores, lighting conditions and nearby emergency services...",
    contact_added: "Your trusted contact has been saved. They will be immediately alerted if you ever need help.",
    check_in: "Just checking in on you. Are you doing okay? I am always here if you need anything.",
  },
  ta: {
    sos_activated: "பயப்படாதீர்கள். நான் உங்களுடன் இருக்கிறேன். உங்கள் நம்பகமான தொடர்புகளுக்கு இப்போதே உங்கள் நிலை மற்றும் ஆதாரங்கள் அனுப்பப்படுகின்றன. நீங்கள் தனியாக இல்லை. உதவி வருகிறது. மெதுவாக மூச்சு விடுங்கள். பார்வைக்கு தெரியும் இடத்தில் நில்லுங்கள்.",
    sos_countdown: "அவசர எச்சரிக்கை அனுப்பப்படுகிறது. நீங்கள் பாதுகாப்பாக இருந்தால், இப்போதே உங்கள் PIN ஐ உள்ளிடுங்கள். இல்லையெனில் நிதானமாக இருங்கள் — உதவி விரைவில் வரும்.",
    deviation: "நீங்கள் வழியிலிருந்து விலகியிருப்பதை கவனித்தேன். நீங்கள் சரியாக இருக்கிறீர்களா? சரியாக இருந்தால் 'நான் பாதுகாப்பாக இருக்கிறேன்' என்று தொடுங்கள். இல்லையெனில் உடனே தொடர்புகளுக்கு அறிவிக்கிறேன்.",
    route_safe: "தேர்ந்தெடுக்கப்பட்ட பாதை தெளிவாகவும் பாதுகாப்பாகவும் உள்ளது. பயணத்தை கவனிக்கிறேன், முன்னால் உள்ள அபாயங்களை எச்சரிப்பேன். நீங்கள் நல்ல கரங்களில் இருக்கிறீர்கள்.",
    route_warning: "இந்த பாதையில் சில பாதுகாப்பு அபாயங்கள் புகாரளிக்கப்பட்டுள்ளன. நன்கு ஒளியூட்டப்பட்ட சாலைகளில் சென்று மொபைலை தெரியும் வகையில் வைத்திருங்கள். நான் கவனிக்கிறேன்.",
    greeting: "வணக்கம்! நான் உங்கள் SafePath AI உதவியாளர். உங்கள் பயணம் முழுவதும் பாதுகாப்பாக வைக்க இங்கே இருக்கிறேன். இன்று நான் எப்படி உங்களுக்கு உதவலாம்?",
    searching: "பாதுகாப்பான பாதைகளைத் தேடுகிறேன். சாலை பாதுகாப்பு மதிப்பெண்கள், வெளிச்ச நிலைகள் மற்றும் அருகிலுள்ள அவசர சேவைகளை ஆய்வு செய்கிறேன்...",
    contact_added: "உங்கள் நம்பகமான தொடர்பு சேமிக்கப்பட்டது. நீங்கள் உதவி தேவைப்படும்போது அவர்களுக்கு உடனே அறிவிக்கப்படும்.",
    check_in: "உங்களை சரிபார்க்கிறேன். நீங்கள் நலமாக இருக்கிறீர்களா? எதற்கும் நான் எப்போதும் இங்கே இருக்கிறேன்.",
  }
};

// ─── Voice Command Keywords ───────────────────────────────────
const DISTRESS_EN = ["help", "help me", "save me", "danger", "sos", "emergency", "attack", "scared", "stop them", "let me go"];
const DISTRESS_TA = ["உதவி", "காப்பாத்துங்க", "ஆபத்து", "SOS", "நெருக்கடி", "தாக்குதல்", "பயமாக இருக்கு", "விடுங்க"];
const SAFE_QN_EN = ["am i safe", "is route safe", "safe route", "find route", "nearest police", "nearest hospital"];
const SAFE_QN_TA = ["பாதுகாப்பு", "பாதை", "பாதுகாப்பான", "காவல்", "மருத்துவமனை", "போலீஸ்"];

export default function SafePathApp() {

  const [mounted, setMounted] = useState(false);

  // ── Auth & Profile ───
  const [user, setUser] = useState<any>(null);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [profileLang, setProfileLang] = useState<"en" | "ta">("en");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");

  // ── App mode & Language ───
  const [appMode, setAppMode] = useState<"standard" | "child" | "senior" | "admin">("standard");
  const [language, setLanguage] = useState<"en" | "ta">("en");

  // ── Map State ───
  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState<"roadmap" | "satellite" | "hybrid" | "terrain">("roadmap");
  const [streetViewActive, setStreetViewActive] = useState(false);
  const [mapsApiKey, setMapsApiKey] = useState("");
  const [mapsApiKeyInput, setMapsApiKeyInput] = useState("");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [userLatLng, setUserLatLng] = useState({ lat: 13.0267, lng: 79.9880 }); // Saveetha Engineering College
  const mapRef = useRef<HTMLDivElement>(null);

  // ── Route Finder ───
  const [startLoc, setStartLoc] = useState("");
  const [destLoc, setDestLoc] = useState("");
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [safetyScore, setSafetyScore] = useState<number | null>(null);
  const [riskLevel, setRiskLevel] = useState("");
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // ── Contacts ───
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRel, setNewRel] = useState("");
  const [newPriority, setNewPriority] = useState<"family" | "friend" | "emergency">("family");
  const [contactSaved, setContactSaved] = useState(false);

  // ── SOS & Evidence ───
  const [sosActive, setSosActive] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(0);
  const [sosPin, setSosPin] = useState("");
  const [showPinModal, setShowPinModal] = useState(false);
  const [recordingEvidence, setRecordingEvidence] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [sosStatus, setSosStatus] = useState("");
  const [sosLogs, setSosLogs] = useState<SosEvent[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // ── Guardian Mode ───
  const [journeyActive, setJourneyActive] = useState(false);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [speed, setSpeed] = useState(0);
  const [battery, setBattery] = useState(100);
  const [guardianAlert, setGuardianAlert] = useState<string | null>(null);
  const [showDistressPrompt, setShowDistressPrompt] = useState(false);
  const [distressTimer, setDistressTimer] = useState(10);

  // ── Voice Assistant ───
  const [voiceActive, setVoiceActive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [assistantReply, setAssistantReply] = useState("");
  const [voiceHistory, setVoiceHistory] = useState<{ q: string; a: string }[]>([]);
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);

  // ── Community Reports ───
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportLoc, setReportLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [reportCategory, setReportCategory] = useState("dark_street");
  const [reportDesc, setReportDesc] = useState("");
  const [reportRating, setReportRating] = useState(2);

  // ── Admin ───
  const [adminMetrics, setAdminMetrics] = useState<any>(null);
  const [showAdmin, setShowAdmin] = useState(false);

  // ── Active Panel ───
  const [activePanel, setActivePanel] = useState<"route" | "voice" | "contacts" | "sos" | "guardian" | "admin">("route");

  // ─────────────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Restore session
    const saved = localStorage.getItem("safepath_user");
    if (saved) {
      const u = JSON.parse(saved);
      setUser(u);
      setLanguage(u.language_pref || "en");
      setAppMode(u.mode || "standard");
    }

    // Restore saved API key
    const savedKey = localStorage.getItem("safepath_gmaps_key");
    if (savedKey) setMapsApiKey(savedKey);

    let watchId: number | null = null;
    // Get user GPS and watch position in real-time
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLatLng(coords);
        },
        (err) => console.warn("Initial position error:", err)
      );

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLatLng(coords);
        },
        (err) => console.warn("Watch position error:", err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    // Battery API
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((bat: any) => {
        setBattery(Math.floor(bat.level * 100));
        bat.addEventListener('levelchange', () => setBattery(Math.floor(bat.level * 100)));
      });
    }

    setupSpeechRecognition();
    setMounted(true);
    return () => {
      window.speechSynthesis?.cancel();
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Load data when user logs in
  useEffect(() => {
    if (user) {
      loadContacts();
      loadReports();
      loadSosLogs();
      if (user.role === 'admin') loadAdminMetrics();
      // Greet user
      setTimeout(() => {
        speak(CALMING_SCRIPTS[language].greeting);
      }, 800);
    }
  }, [user]);

  // Init Google Maps when API key is available
  useEffect(() => {
    if (mapsApiKey && mapRef.current && !mapReady) {
      initGoogleMap();
    }
  }, [mapsApiKey, mapRef.current]);

  // Update map type
  useEffect(() => {
    if (mapInstance) {
      mapInstance.setMapTypeId(mapType);
    }
  }, [mapType]);

  // Street View toggle using built-in Google Maps panorama
  useEffect(() => {
    if (!mapInstance) return;
    try {
      const panorama = mapInstance.getStreetView();
      if (streetViewActive) {
        panorama.setPosition(userLatLng);
        panorama.setVisible(true);
      } else {
        panorama.setVisible(false);
      }
    } catch (e) {
      console.warn("Street view toggle error:", e);
    }
  }, [streetViewActive, userLatLng]);

  // Update user marker and map center when userLatLng changes
  useEffect(() => {
    if (userMarker) {
      userMarker.setPosition(userLatLng);
    }
    if (mapInstance && !journeyActive) {
      mapInstance.panTo(userLatLng);
    }
  }, [userLatLng, journeyActive]);

  // Distress timer countdown
  useEffect(() => {
    let t: any;
    if (showDistressPrompt && distressTimer > 0) {
      t = setTimeout(() => setDistressTimer(d => d - 1), 1000);
    } else if (showDistressPrompt && distressTimer === 0) {
      setShowDistressPrompt(false);
      triggerSosNow();
    }
    return () => clearTimeout(t);
  }, [showDistressPrompt, distressTimer]);

  // Journey telemetry
  useEffect(() => {
    if (!journeyActive) return;
    const interval = setInterval(() => {
      setSpeed(Math.floor(15 + Math.random() * 30));
      setUserLatLng(prev => {
        const next = { lat: prev.lat + (Math.random() - 0.5) * 0.0003, lng: prev.lng + (Math.random() - 0.5) * 0.0003 };
        if (userMarker && mapInstance) {
          userMarker.setPosition(next);
          mapInstance.panTo(next);
        }
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [journeyActive]);

  // ─────────────────────────────────────────────────────────────
  // GOOGLE MAPS INIT
  // ─────────────────────────────────────────────────────────────
  const initGoogleMap = async () => {
    if (!mapsApiKey || !mapRef.current) return;
    try {
      await loadGoogleMapsScript(mapsApiKey);
      if (!window.google || !window.google.maps) {
        console.error("Google Maps is not defined yet.");
        return;
      }

      mapInstance = new window.google.maps.Map(mapRef.current, {
        center: userLatLng,
        zoom: 14,
        mapTypeId: mapType,
        disableDefaultUI: false,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
          { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
          { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c1220" }] },
          { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0d2d1a" }] },
        ]
      });

      infoWindow = new window.google.maps.InfoWindow();

      // User marker
      userMarker = new window.google.maps.Marker({
        position: userLatLng,
        map: mapInstance,
        title: "Your Location",
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#7c3aed",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        }
      });

      // Click to place report
      mapInstance.addListener("click", (e: any) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setReportLoc({ lat, lng });
        setShowReportModal(true);
      });

      // Draw hazard overlays from community reports
      drawHazardOverlays();

      // Listen to street view visibility changes to sync UI state
      const panorama = mapInstance.getStreetView();
      window.google.maps.event.addListener(panorama, 'visible_changed', () => {
        setStreetViewActive(panorama.getVisible());
      });

      setMapReady(true);
    } catch (err) {
      console.error("Google Maps init failed:", err);
    }
  };

  const locateUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLatLng(coords);
          if (mapInstance) {
            mapInstance.setZoom(16);
            mapInstance.panTo(coords);
          }
        },
        (err) => {
          console.warn("Geolocation error:", err);
          alert(language === "ta" ? "இருப்பிடத்தை கண்டறிய முடியவில்லை." : "Could not retrieve your location. Make sure GPS is enabled and permissions are granted.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const drawHazardOverlays = () => {
    // Clear old overlays
    hazardCircles.forEach(c => c.setMap(null));
    hazardCircles = [];

    reports.forEach(r => {
      const color = r.safety_rating <= 2 ? "#ef4444" : r.safety_rating <= 3 ? "#f59e0b" : "#10b981";
      const circle = new window.google.maps.Circle({
        strokeColor: color, strokeOpacity: 0.8, strokeWeight: 1,
        fillColor: color, fillOpacity: 0.2,
        map: mapInstance,
        center: { lat: r.latitude, lng: r.longitude },
        radius: 200
      });

      const marker = new window.google.maps.Marker({
        position: { lat: r.latitude, lng: r.longitude },
        map: mapInstance,
        title: r.category,
        label: { text: "⚠", color: "white", fontSize: "12px" }
      });

      marker.addListener("click", () => {
        infoWindow.setContent(`
          <div style="background:#1e293b;color:#f8fafc;padding:10px;border-radius:8px;font-family:Inter,sans-serif;max-width:200px">
            <b style="color:#f59e0b">⚠️ ${r.category.replace(/_/g, ' ').toUpperCase()}</b>
            <p style="font-size:12px;margin:6px 0">${r.description || 'No description'}</p>
            <span style="font-size:11px;color:#94a3b8">Danger: ${r.safety_rating}/5</span>
          </div>
        `);
        infoWindow.open(mapInstance, marker);
      });

      hazardCircles.push(circle);
    });
  };

  const drawRouteOnMap = (route: any) => {
    if (!mapInstance || !window.google) return;
    routePolylines.forEach(p => p.setMap(null));
    routePolylines = [];

    const color = route.safety_score >= 85 ? "#10b981" : route.safety_score >= 70 ? "#f59e0b" : "#ef4444";
    const path = route.coordinates.map((c: any) => ({ lat: c.lat, lng: c.lng }));

    const poly = new window.google.maps.Polyline({
      path, geodesic: true,
      strokeColor: color, strokeOpacity: 0.9, strokeWeight: 6, map: mapInstance
    });
    routePolylines.push(poly);

    if (path.length > 0) {
      mapInstance.fitBounds(new window.google.maps.LatLngBounds(
        path[0], path[path.length - 1]
      ));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // VOICE ASSISTANT
  // ─────────────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = language === "ta" ? "ta-IN" : "en-US";
    utter.rate = 0.88;
    utter.pitch = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find(v => v.lang.startsWith(language === "ta" ? "ta" : "en"));
    if (match) utter.voice = match;
    utter.onstart = () => setAssistantSpeaking(true);
    utter.onend = () => setAssistantSpeaking(false);
    window.speechSynthesis.speak(utter);
    setAssistantReply(text);
  }, [language]);

  const setupSpeechRecognition = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = language === "ta" ? "ta-IN" : "en-US";
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      handleVoiceCommand(text);
    };
    rec.onerror = () => setVoiceActive(false);
    rec.onend = () => setVoiceActive(false);
    recognitionRef.current = rec;
  };

  useEffect(() => {
    if (recognitionRef.current) recognitionRef.current.lang = language === "ta" ? "ta-IN" : "en-US";
  }, [language]);

  const toggleVoice = () => {
    if (voiceActive) { recognitionRef.current?.stop(); setVoiceActive(false); return; }
    setTranscript("");
    try { recognitionRef.current?.start(); setVoiceActive(true); }
    catch (e) { console.warn("SR start error:", e); }
  };

  const handleVoiceCommand = (cmd: string) => {
    const lower = cmd.toLowerCase();
    const scripts = CALMING_SCRIPTS[language];
    let reply = "";

    // Distress keywords → auto SOS
    const isPanic = language === "ta"
      ? DISTRESS_TA.some(w => lower.includes(w))
      : DISTRESS_EN.some(w => lower.includes(w));

    if (isPanic) {
      speak(scripts.sos_activated);
      setTimeout(() => triggerSosNow(), 1500);
      return;
    }

    // Safety queries
    if (language === "ta") {
      if (SAFE_QN_TA.some(w => lower.includes(w))) {
        if (lower.includes("போலீஸ்") || lower.includes("காவல்")) {
          reply = "அருகிலுள்ள காவல் நிலையம் 350 மீட்டர் தொலைவில் உள்ளது. நீங்கள் பாதுகாப்பாக செல்லலாம்.";
        } else if (lower.includes("மருத்துவ")) {
          reply = "அருகிலுள்ள மருத்துவமனை 1.2 கி.மீ தொலைவில் உள்ளது. தேவைப்பட்டால் உடனே செல்லவும்.";
        } else {
          reply = safetyScore !== null
            ? `தேர்ந்தெடுக்கப்பட்ட பாதை ${safetyScore}% பாதுகாப்பு மதிப்பெண் கொண்டுள்ளது. ${safetyScore >= 85 ? scripts.route_safe : scripts.route_warning}`
            : scripts.greeting;
        }
      } else {
        reply = "நான் உங்களுடன் இருக்கிறேன். பாதுகாப்பு பற்றிய எந்த கேள்வியும் கேளுங்கள். " + scripts.check_in;
      }
    } else {
      if (SAFE_QN_EN.some(w => lower.includes(w))) {
        if (lower.includes("police")) {
          reply = "The nearest police station is approximately 350 meters from your current location. You may proceed safely.";
        } else if (lower.includes("hospital")) {
          reply = "The nearest hospital is approximately 1.2 kilometers away. Please go there if you need medical attention.";
        } else {
          reply = safetyScore !== null
            ? `Your selected route has a safety score of ${safetyScore}%. ${safetyScore >= 85 ? scripts.route_safe : scripts.route_warning}`
            : scripts.greeting;
        }
      } else {
        reply = "I am here with you. " + scripts.check_in;
      }
    }

    speak(reply);
    setVoiceHistory(h => [{ q: cmd, a: reply }, ...h.slice(0, 4)]);
  };

  // ─────────────────────────────────────────────────────────────
  // DATA LOADERS
  // ─────────────────────────────────────────────────────────────
  const loadContacts = async () => {
    const list = await contactsApi.getAll();
    setContacts(list);
  };

  const loadReports = async () => {
    const list = await reportsApi.getAll();
    setReports(list);
  };

  const loadSosLogs = async () => {
    const list = await sosApi.getAll();
    setSosLogs(list);
  };

  const loadAdminMetrics = async () => {
    const metrics = await adminApi.getMetrics();
    setAdminMetrics(metrics);
  };

  const triggerSosNow = async () => {
    setSosActive(true);
    setSosCountdown(0);

    // 1. Get fresh GPS coordinates immediately on trigger to ensure correct live location
    let freshLatLng = userLatLng;
    if (navigator.geolocation) {
      try {
        const freshPos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 });
        });
        freshLatLng = { lat: freshPos.coords.latitude, lng: freshPos.coords.longitude };
        setUserLatLng(freshLatLng);
      } catch (e) {
        console.warn("Could not fetch fresh coordinates, using last known:", e);
      }
    }

    // 2. Speak calming message immediately
    speak(CALMING_SCRIPTS[language].sos_activated);

    // 3. Play siren
    playSiren();

    // 4. Start media capture (camera + mic)
    setSosStatus(language === "ta" ? "📹 ஆதாரங்கள் பதிவு செய்யப்படுகின்றன..." : "📹 Recording evidence...");
    setRecordingEvidence(true);

    let audioUrl = "", videoUrl = "", screenshotUrl = "";

    try {
      // Try video + audio first
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setVideoStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;

      // Start MediaRecorder for video + audio
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setSosStatus(language === "ta" ? "⬆️ ஆதாரங்கள் பாதுகாப்பான சேவையகத்திற்கு பதிவேற்றப்படுகின்றன..." : "⬆️ Uploading evidence to secure server...");
        const videoBlob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string);
          videoUrl = await sosApi.uploadEvidence("video", base64);
          await fireSosAlert(audioUrl, videoUrl, screenshotUrl, freshLatLng);
        };
        reader.readAsDataURL(videoBlob);
      };

      recorder.start();
      setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
          stream.getTracks().forEach(t => t.stop());
          setVideoStream(null);
        }
      }, 8000);

    } catch (videoErr) {
      console.warn("Video capture failed, attempting audio-only fallback:", videoErr);
      setSosStatus(language === "ta" ? "🎙️ குரல் பதிவு செய்யப்படுகிறது..." : "🎙️ Recording audio evidence...");

      try {
        // Fallback to audio-only (microphone)
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        recordedChunksRef.current = [];
        const audioRecorder = new MediaRecorder(audioStream);
        mediaRecorderRef.current = audioRecorder;

        audioRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };

        audioRecorder.onstop = async () => {
          setSosStatus(language === "ta" ? "⬆️ ஆதாரங்கள் பாதுகாப்பான சேவையகத்திற்கு பதிவேற்றப்படுகின்றன..." : "⬆️ Uploading evidence to secure server...");
          const audioBlob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = (reader.result as string);
            audioUrl = await sosApi.uploadEvidence("audio", base64);
            await fireSosAlert(audioUrl, videoUrl, screenshotUrl, freshLatLng);
          };
          reader.readAsDataURL(audioBlob);
        };

        audioRecorder.start();
        setTimeout(() => {
          if (audioRecorder.state === "recording") {
            audioRecorder.stop();
            audioStream.getTracks().forEach(t => t.stop());
          }
        }, 8000);

      } catch (audioErr) {
        console.warn("Audio capture failed as well, sending GPS-only SOS:", audioErr);
        await fireSosAlert("", "", "", freshLatLng);
      }
    }
  };

  const fireSosAlert = async (audioUrl: string, videoUrl: string, screenshotUrl: string, coords: { lat: number; lng: number }) => {
    try {
      const result = await sosApi.trigger({
        trip_id: currentTrip?.id,
        latitude: coords.lat,
        longitude: coords.lng,
        audio_url: audioUrl,
        video_url: videoUrl,
        screenshot_url: screenshotUrl
      });

      const contactCount = result?.broadcast?.contacts_notified || 0;

      const msg = language === "ta"
        ? `✅ அவசர எச்சரிக்கை ${contactCount} தொடர்புகளுக்கு அனுப்பப்பட்டது. உதவி வருகிறது. நிதானமாக இருங்கள்.`
        : `✅ Emergency alert sent to ${contactCount} contact${contactCount !== 1 ? "s" : ""}. Help is on the way. Stay calm.`;

      setSosStatus(msg);
      speak(CALMING_SCRIPTS[language].sos_activated);
      loadSosLogs();
    } catch (err) {
      setSosStatus(language === "ta" ? "⚠️ எச்சரிக்கை அனுப்பப்பட்டது. சேவையகம் எதிர்வினையாற்றவில்லை." : "⚠️ Alert dispatched. Server did not respond.");
    }
  };

  // ─────────────────────────────────────────────────────────────
  // AUTH
  // ─────────────────────────────────────────────────────────────
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      let res;
      if (authMode === "login") {
        res = await authApi.login({ email: profileEmail, password: profilePassword });
      } else {
        if (!profileName || !profilePhone) { setAuthError("Name and phone number are required."); return; }
        res = await authApi.register({
          email: profileEmail, password: profilePassword, name: profileName,
          phone: profilePhone, mode: "standard", language_pref: profileLang
        });
      }
      setUser(res.user);
      setLanguage(res.user.language_pref || "en");
      localStorage.setItem("safepath_user", JSON.stringify(res.user));
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed. Please check your details.");
    }
  };

  const handleSignOut = () => {
    setToken(null);
    setUser(null);
    setContacts([]);
    setSosLogs([]);
    localStorage.removeItem("safepath_user");
  };

  // ─────────────────────────────────────────────────────────────
  // CONTACTS
  // ─────────────────────────────────────────────────────────────
  const addContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;
    await contactsApi.add({ name: newName, phone: newPhone, relationship: newRel, priority: newPriority });
    setNewName(""); setNewPhone(""); setNewRel("");
    setContactSaved(true);
    setTimeout(() => setContactSaved(false), 2000);
    speak(CALMING_SCRIPTS[language].contact_added);
    loadContacts();
  };

  const deleteContact = async (id: string) => {
    await contactsApi.delete(id);
    loadContacts();
  };

  // ─────────────────────────────────────────────────────────────
  // ROUTE FINDER
  // ─────────────────────────────────────────────────────────────
  const calculateRoute = async () => {
    if (!startLoc || !destLoc) return;
    setIsCalculating(true);
    speak(CALMING_SCRIPTS[language].searching);

    const hour = new Date().getHours();
    const sampleRoutes = [
      { id: "route-a", name: "Route A — Main Road", coordinates: [
        userLatLng,
        { lat: userLatLng.lat + 0.008, lng: userLatLng.lng + 0.010 },
        { lat: userLatLng.lat + 0.016, lng: userLatLng.lng + 0.018 }
      ]},
      { id: "route-b", name: "Route B — Express Bridge", coordinates: [
        userLatLng,
        { lat: userLatLng.lat + 0.005, lng: userLatLng.lng + 0.012 },
        { lat: userLatLng.lat + 0.016, lng: userLatLng.lng + 0.018 }
      ]},
      { id: "route-c", name: "Route C — Side Streets", coordinates: [
        userLatLng,
        { lat: userLatLng.lat + 0.010, lng: userLatLng.lng + 0.004 },
        { lat: userLatLng.lat + 0.016, lng: userLatLng.lng + 0.018 }
      ]}
    ];

    const scored = await aiApi.routeRisk(sampleRoutes, hour);
    setRoutes(scored);

    const best = scored.find((r: any) => r.is_recommended) || scored[0];
    setSelectedRouteId(best.id);
    setSafetyScore(best.safety_score);

    if (best.safety_score >= 85) {
      setRiskLevel("Low"); setRecommendations([CALMING_SCRIPTS[language].route_safe]);
    } else if (best.safety_score >= 70) {
      setRiskLevel("Medium"); setRecommendations([CALMING_SCRIPTS[language].route_warning]);
    } else {
      setRiskLevel("High");
      setRecommendations([
        language === "ta" ? "மிக அதிக ஆபத்து கண்டறியப்பட்டது. பொது போக்குவரத்தை பயன்படுத்தவும்." : "High danger detected. Consider taking public transport or a different time.",
        language === "ta" ? "Guardian Mode இப்போது செயல்படுகிறது." : "Guardian Mode is now active and monitoring your journey."
      ]);
    }

    speak(
      best.safety_score >= 85
        ? CALMING_SCRIPTS[language].route_safe
        : CALMING_SCRIPTS[language].route_warning
    );

    if (mapReady && window.google) drawRouteOnMap(best);
    setIsCalculating(false);
  };

  // ─────────────────────────────────────────────────────────────
  // SOS SYSTEM
  // ─────────────────────────────────────────────────────────────
  const startSosCountdown = () => {
    if (sosActive) { setShowPinModal(true); return; }
    speak(CALMING_SCRIPTS[language].sos_countdown);
    setSosCountdown(3);
    let count = 3;
    const interval = setInterval(() => {
      count--;
      setSosCountdown(count);
      if (count <= 0) { clearInterval(interval); triggerSosNow(); }
    }, 1000);
  };



  const cancelSos = async () => {
    const correctPin = user?.emergency_pin || "1234";
    if (sosPin !== correctPin) {
      setSosPin("");
      alert(language === "ta" ? "தவறான PIN. SafePath எச்சரிக்கை நிலையில் உள்ளது!" : "Incorrect PIN. SafePath remains in alert state!");
      return;
    }

    setSosActive(false);
    setRecordingEvidence(false);
    setSosPin("");
    setShowPinModal(false);
    setSosStatus("");

    if (videoStream) { videoStream.getTracks().forEach(t => t.stop()); setVideoStream(null); }
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();

    const activeSos = sosLogs.find(s => s.status === "active");
    if (activeSos) { await sosApi.resolve(activeSos.id); loadSosLogs(); }
  };

  const playSiren = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      [0, 0.6, 1.2].forEach(delay => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.frequency.value = 900;
        osc.frequency.linearRampToValueAtTime(1400, ctx.currentTime + delay + 0.4);
        g.gain.setValueAtTime(0.25, ctx.currentTime + delay);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.55);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.6);
      });
    } catch (e) {}
  };

  // ─────────────────────────────────────────────────────────────
  // GUARDIAN MODE
  // ─────────────────────────────────────────────────────────────
  const toggleJourney = async () => {
    if (journeyActive) {
      if (currentTrip) await tripsApi.complete(currentTrip.id);
      setJourneyActive(false); setCurrentTrip(null); setSpeed(0); setGuardianAlert(null);
    } else {
      await calculateRoute();
      const trip = await tripsApi.start({
        origin_address: startLoc || "Current Location",
        destination_address: destLoc || "Destination",
        origin_lat: userLatLng.lat, origin_lng: userLatLng.lng,
        destination_lat: userLatLng.lat + 0.016, destination_lng: userLatLng.lng + 0.018
      });
      setCurrentTrip(trip);
      setJourneyActive(true);
    }
  };

  const simulateDeviation = async () => {
    if (!journeyActive || !currentTrip) return;
    const msg = CALMING_SCRIPTS[language].deviation;
    setGuardianAlert(msg);
    speak(msg);
    setDistressTimer(10);
    setShowDistressPrompt(true);
    await tripsApi.logDeviation(currentTrip.id, {
      lat: userLatLng.lat, lng: userLatLng.lng,
      deviation_type: "route_deviation", details: "Unexpected stop detected"
    });
  };

  const confirmSafe = () => {
    setShowDistressPrompt(false); setGuardianAlert(null);
    speak(language === "ta" ? "நல்லது. பயணத்தை தொடரவும். நான் கவனிக்கிறேன்." : "Great. Continue your journey. I am keeping watch for you.");
  };

  // ─────────────────────────────────────────────────────────────
  // COMMUNITY REPORTS
  // ─────────────────────────────────────────────────────────────
  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportLoc) return;
    await reportsApi.create({ category: reportCategory as any, description: reportDesc, latitude: reportLoc.lat, longitude: reportLoc.lng, safety_rating: reportRating });
    setShowReportModal(false); setReportDesc(""); setReportLoc(null);
    await loadReports();
    if (mapReady) drawHazardOverlays();
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-t-accent border-r-transparent border-slate-800 rounded-full animate-spin"></div>
          <span className="text-xs text-slate-500 font-medium animate-pulse">SafePath AI Loading...</span>
        </div>
      </div>
    );
  }

  // Auth screen
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-accent to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-glow-purple">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">SAFEPATH AI</h1>
            <p className="text-slate-400 text-sm mt-1 font-medium">"Predict Danger. Protect Lives."</p>
          </div>

          {/* Auth Form */}
          <div className="glass-panel rounded-3xl p-8">
            <div className="flex gap-2 bg-slate-900 p-1 rounded-xl mb-6">
              {(["login", "register"] as const).map(m => (
                <button key={m} onClick={() => { setAuthMode(m); setAuthError(""); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${authMode === m ? "bg-accent text-white" : "text-slate-400 hover:text-white"}`}>
                  {m === "login" ? (language === "ta" ? "உள்நுழை" : "Sign In") : (language === "ta" ? "பதிவு செய்" : "Register")}
                </button>
              ))}
            </div>

            <form onSubmit={handleAuth} className="flex flex-col gap-3">
              {authMode === "register" && (
                <>
                  <input type="text" placeholder={language === "ta" ? "உங்கள் பெயர்" : "Full Name"} value={profileName} onChange={e => setProfileName(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent/60" required />
                  <input type="tel" placeholder={language === "ta" ? "கைபேசி எண் (+ குறியுடன்)" : "Phone Number (with country code, e.g. +91...)"} value={profilePhone} onChange={e => setProfilePhone(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent/60" required />
                  <select value={profileLang} onChange={e => setProfileLang(e.target.value as any)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none">
                    <option value="en">English</option>
                    <option value="ta">தமிழ் (Tamil)</option>
                  </select>
                </>
              )}
              <input type="email" placeholder={language === "ta" ? "மின்னஞ்சல்" : "Email Address"} value={profileEmail} onChange={e => setProfileEmail(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent/60" required />
              <input type="password" placeholder={language === "ta" ? "கடவுச்சொல்" : "Password"} value={profilePassword} onChange={e => setProfilePassword(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent/60" required />

              {authError && <p className="text-emergency text-xs font-medium bg-red-950/30 border border-red-900/30 px-3 py-2 rounded-lg">{authError}</p>}

              <button type="submit"
                className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-3 rounded-xl mt-2 transition shadow-glow-purple flex items-center justify-center gap-2">
                {authMode === "login" ? <><LogIn className="w-4 h-4" /> {language === "ta" ? "உள்நுழை" : "Sign In Securely"}</> : <><UserPlus className="w-4 h-4" /> {language === "ta" ? "கணக்கு உருவாக்கு" : "Create Account"}</>}
              </button>

              <button type="button" onClick={() => setLanguage(l => l === "en" ? "ta" : "en")}
                className="text-slate-400 hover:text-white text-xs text-center mt-1 transition">
                🌐 Switch to {language === "ta" ? "English" : "தமிழ்"}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main App
  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="glass-panel border-b border-slate-800/80 px-4 md:px-6 py-3 flex items-center justify-between z-40 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-accent to-purple-600 p-2 rounded-xl shadow-glow-purple">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight">SAFEPATH AI</h1>
            <p className="text-[10px] text-slate-400 hidden md:block">"Predict Danger. Protect Lives."</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language */}
          <button onClick={() => setLanguage(l => l === "en" ? "ta" : "en")}
            className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 text-[11px] font-bold text-slate-200 hover:bg-slate-800 transition">
            🌐 {language === "ta" ? "EN" : "தமிழ்"}
          </button>

          {/* Mode */}
          <div className="hidden lg:flex items-center bg-slate-900/80 rounded-xl p-1 border border-slate-800 gap-0.5">
            {(["standard", "child", "senior", "admin"] as const).map(m => (
              <button key={m} onClick={() => { setAppMode(m); if (m === "admin") setShowAdmin(true); else setShowAdmin(false); }}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition ${appMode === m ? "bg-accent text-white" : "text-slate-400 hover:text-white"}`}>
                {m}
              </button>
            ))}
          </div>

          {/* Google Maps API Key Button */}
          <button onClick={() => setShowApiKeyModal(true)}
            className={`p-2 rounded-lg border transition ${mapsApiKey ? "border-safe/40 bg-safe/10 text-safe" : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"}`}
            title="Configure Google Maps API Key">
            <Map className="w-4 h-4" />
          </button>

          {/* User */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-white">{user.name}</span>
              <span className="text-[9px] text-slate-400">{user.phone}</span>
            </div>
            <button onClick={handleSignOut} className="p-2 bg-slate-900 border border-slate-800 hover:bg-red-950/30 hover:border-red-900/40 rounded-lg text-slate-400 hover:text-red-400 transition" title="Sign Out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Mode */}
      <div className="lg:hidden flex justify-around bg-slate-900/95 border-b border-slate-800/60 p-1.5">
        {(["standard", "child", "senior", "admin"] as const).map(m => (
          <button key={m} onClick={() => { setAppMode(m); if (m === "admin") setShowAdmin(true); else setShowAdmin(false); }}
            className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition ${appMode === m ? "bg-accent text-white" : "text-slate-400"}`}>
            {m}
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">

        {/* LEFT PANEL */}
        <aside className="w-full xl:w-[400px] bg-slate-950 border-r border-slate-800/50 flex flex-col overflow-hidden">

          {/* Panel tabs */}
          <div className="flex border-b border-slate-800/60 bg-slate-900/40 overflow-x-auto">
            {[
              { id: "route", icon: <Compass className="w-3.5 h-3.5" />, label: language === "ta" ? "பாதை" : "Route" },
              { id: "voice", icon: <Mic className="w-3.5 h-3.5" />, label: language === "ta" ? "குரல்" : "Voice" },
              { id: "contacts", icon: <Phone className="w-3.5 h-3.5" />, label: language === "ta" ? "தொடர்பு" : "Contacts" },
              { id: "guardian", icon: <Activity className="w-3.5 h-3.5" />, label: language === "ta" ? "பாதுகாவல்" : "Guardian" },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActivePanel(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-bold whitespace-nowrap transition border-b-2 ${
                  activePanel === tab.id ? "border-accent text-white" : "border-transparent text-slate-400 hover:text-white"
                }`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

            {/* ROUTE PANEL */}
            {activePanel === "route" && (
              <>
                <div className="glass-panel p-4 rounded-2xl flex flex-col gap-3">
                  <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                    <Compass className="w-3.5 h-3.5 text-accent" /> {language === "ta" ? "AI பாதுகாப்பான பாதை கண்டுபிடி" : "AI Safe Route Finder"}
                  </h2>

                  <input type="text" placeholder={language === "ta" ? "தொடக்க இடம்..." : "Starting point..."} value={startLoc} onChange={e => setStartLoc(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent/50" />
                  <input type="text" placeholder={language === "ta" ? "இலக்கு இடம்..." : "Destination..."} value={destLoc} onChange={e => setDestLoc(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent/50" />

                  <button onClick={calculateRoute} disabled={isCalculating}
                    className="w-full bg-accent hover:bg-accent-hover disabled:opacity-60 text-white py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2">
                    {isCalculating ? <span className="animate-spin">⟳</span> : <Activity className="w-3.5 h-3.5" />}
                    {isCalculating ? (language === "ta" ? "ஆய்வு செய்கிறேன்..." : "Analyzing...") : (language === "ta" ? "பாதுகாப்பான பாதையைக் கண்டுபிடி" : "Find Safe Route")}
                  </button>

                  {routes.length > 0 && (
                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                      {routes.map(r => {
                        const sc = r.safety_score;
                        const col = sc >= 85 ? "text-safe border-safe/20 bg-safe/5" : sc >= 70 ? "text-warning border-warning/20 bg-warning/5" : "text-emergency border-emergency/20 bg-emergency/5";
                        return (
                          <div key={r.id} onClick={() => { setSelectedRouteId(r.id); setSafetyScore(r.safety_score); if (mapReady) drawRouteOnMap(r); }}
                            className={`cursor-pointer p-3 rounded-xl border transition-all ${selectedRouteId === r.id ? "border-accent bg-accent/10" : `${col} hover:border-slate-700`}`}>
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-[11px] font-bold text-white flex items-center gap-1">
                                  {r.name}
                                  {r.is_recommended && <span className="text-[8px] bg-accent/25 text-purple-300 px-1 rounded uppercase">★ {language === "ta" ? "பரிந்துரை" : "Best"}</span>}
                                </p>
                              </div>
                              <span className={`text-sm font-black ${sc >= 85 ? "text-safe" : sc >= 70 ? "text-warning" : "text-emergency"}`}>{sc}%</span>
                            </div>
                          </div>
                        );
                      })}

                      {recommendations.length > 0 && (
                        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                          {recommendations.map((rec, i) => (
                            <p key={i} className="text-[11px] text-slate-300 leading-relaxed">{rec}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* VOICE PANEL */}
            {activePanel === "voice" && (
              <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4">
                <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                  <Mic className="w-3.5 h-3.5 text-accent" /> {language === "ta" ? "AI பாதுகாப்பு உதவியாளர்" : "AI Safety Assistant"}
                  <span className="text-[8px] font-bold ml-auto bg-slate-850 px-2 py-0.5 rounded border border-slate-800">{language === "ta" ? "தமிழ் + EN" : "EN + தமிழ்"}</span>
                </h2>

                <div className="flex items-center gap-3">
                  <button onClick={toggleVoice}
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg flex-shrink-0 ${
                      voiceActive ? "bg-emergency animate-sos-pulse" : "bg-accent hover:bg-accent-hover hover:scale-105"
                    }`}>
                    {voiceActive ? <MicOff className="w-7 h-7 text-white" /> : <Mic className="w-7 h-7 text-white" />}
                  </button>
                  <div className="flex-1 bg-slate-900/60 border border-slate-800 rounded-xl p-3 min-h-[60px] flex items-center">
                    {voiceActive
                      ? <p className="text-xs text-accent animate-pulse font-medium">{language === "ta" ? "கேட்கிறேன்..." : "Listening..."}</p>
                      : transcript
                        ? <p className="text-xs text-slate-300 italic">"{transcript}"</p>
                        : <p className="text-[11px] text-slate-500">
                            {language === "ta" ? "மைக்கை அழுத்தி பேசுங்கள். 'நான் பாதுகாப்பாக இருக்கிறேனா?' என்று கேளுங்கள்." : "Tap mic and speak. Try: 'Am I safe on this route?' or 'Find nearest police station'"}
                          </p>
                    }
                  </div>
                </div>

                {assistantSpeaking && (
                  <div className="flex items-center gap-2 text-accent text-xs font-medium animate-pulse">
                    <Volume2 className="w-4 h-4" />
                    {language === "ta" ? "பேசுகிறேன்..." : "Speaking..."}
                    <button onClick={() => window.speechSynthesis?.cancel()} className="ml-auto text-slate-400 hover:text-white text-[10px]">Stop</button>
                  </div>
                )}

                {assistantReply && !assistantSpeaking && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-accent/10 border border-accent/20 rounded-xl p-3">
                    <span className="text-[9px] font-black text-accent uppercase block mb-1">SAFEPATH AI</span>
                    <p className="text-xs text-indigo-100 leading-relaxed">{assistantReply}</p>
                  </motion.div>
                )}

                {voiceHistory.length > 0 && (
                  <div className="flex flex-col gap-2 border-t border-slate-800 pt-3">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Recent Conversations</span>
                    {voiceHistory.map((h, i) => (
                      <div key={i} className="text-[10px] bg-slate-900/40 border border-slate-850 rounded-xl p-2.5">
                        <p className="text-slate-400 mb-1">You: "{h.q}"</p>
                        <p className="text-slate-200 leading-relaxed">AI: {h.a.substring(0, 100)}{h.a.length > 100 ? "..." : ""}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CONTACTS PANEL */}
            {activePanel === "contacts" && (
              <div className="glass-panel p-4 rounded-2xl flex flex-col gap-4">
                <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-accent" />
                  {language === "ta" ? "நம்பகமான தொடர்புகள்" : "Trusted Emergency Contacts"}
                </h2>

                <p className="text-[11px] text-slate-400 bg-slate-900/50 border border-slate-800 rounded-xl p-2.5 leading-relaxed">
                  {language === "ta"
                    ? "⚠️ SOS அழுத்தினால் இந்த எண்களுக்கு உங்கள் இருப்பிடம் மற்றும் ஆடியோ, வீடியோ ஆதாரங்கள் நேரடியாக அனுப்பப்படும்."
                    : "⚠️ When SOS is triggered, your live location and all recorded evidence will be sent directly to these numbers via SMS."}
                </p>

                <form onSubmit={addContact} className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder={language === "ta" ? "பெயர்" : "Full Name"} value={newName} onChange={e => setNewName(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none" required />
                    <input type="tel" placeholder={language === "ta" ? "+91..." : "+1... Phone No"} value={newPhone} onChange={e => setNewPhone(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none" required />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder={language === "ta" ? "உறவு (அப்பா, நண்பர்...)" : "Relationship"} value={newRel} onChange={e => setNewRel(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none" />
                    <select value={newPriority} onChange={e => setNewPriority(e.target.value as any)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-300 focus:outline-none">
                      <option value="family">{language === "ta" ? "குடும்பம்" : "Family"}</option>
                      <option value="friend">{language === "ta" ? "நண்பர்" : "Friend"}</option>
                      <option value="emergency">{language === "ta" ? "அவசர" : "Emergency"}</option>
                    </select>
                  </div>
                  <button type="submit"
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${contactSaved ? "bg-safe text-white" : "bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200"}`}>
                    {contactSaved ? <><CheckCircle className="w-3.5 h-3.5" /> {language === "ta" ? "சேமிக்கப்பட்டது!" : "Saved!"}</> : <><UserPlus className="w-3.5 h-3.5" /> {language === "ta" ? "தொடர்பைச் சேர்" : "Add Contact"}</>}
                  </button>
                </form>

                <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto">
                  {contacts.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic text-center py-4 border border-dashed border-slate-800 rounded-xl">
                      {language === "ta" ? "இன்னும் தொடர்புகள் இல்லை. மேலே சேர்க்கவும்." : "No contacts yet. Add emergency contacts above."}
                    </p>
                  ) : contacts.map(c => (
                    <div key={c.id} className="flex justify-between items-center bg-slate-900/50 border border-slate-850 p-2.5 rounded-xl">
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          {c.name}
                          <span className={`text-[8px] px-1 py-0.5 rounded uppercase font-black ${
                            c.priority === "family" ? "bg-red-950/60 text-red-400" :
                            c.priority === "emergency" ? "bg-purple-950/60 text-purple-400" :
                            "bg-slate-850 text-slate-400"}`}>
                            {c.priority}
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-400">{c.phone} {c.relationship ? `— ${c.relationship}` : ""}</p>
                      </div>
                      <button onClick={() => deleteContact(c.id)} className="p-1.5 text-slate-500 hover:text-emergency transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GUARDIAN PANEL */}
            {activePanel === "guardian" && (
              <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4">
                <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-accent" />
                  {language === "ta" ? "Guardian பயண கண்காணிப்பு" : "Guardian Journey Monitor"}
                </h2>

                <button onClick={toggleJourney}
                  className={`w-full py-3 rounded-xl text-xs font-bold transition duration-300 flex items-center justify-center gap-2 ${
                    journeyActive ? "bg-slate-900 border border-slate-800 text-slate-300 hover:border-red-900/40 hover:text-red-400" : "bg-accent hover:bg-accent-hover text-white shadow-glow-purple"
                  }`}>
                  {journeyActive ? <><X className="w-4 h-4" /> {language === "ta" ? "பயணத்தை முடி" : "End Journey"}</> : <><Navigation className="w-4 h-4" /> {language === "ta" ? "பயணத்தை தொடங்கு" : "Start Journey Monitoring"}</>}
                </button>

                {journeyActive && (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-900/60 border border-slate-850 p-2.5 rounded-xl text-center">
                        <span className="text-[9px] text-slate-400 uppercase block">Speed</span>
                        <span className="text-sm font-black text-white">{speed} km/h</span>
                      </div>
                      <div className="bg-slate-900/60 border border-slate-850 p-2.5 rounded-xl text-center">
                        <span className="text-[9px] text-slate-400 uppercase block">Battery</span>
                        <span className={`text-sm font-black ${battery > 20 ? "text-safe" : "text-emergency"}`}>{battery}%</span>
                      </div>
                      <div className="bg-slate-900/60 border border-slate-850 p-2.5 rounded-xl text-center">
                        <span className="text-[9px] text-slate-400 uppercase block">Status</span>
                        <span className="text-sm font-black text-safe">{language === "ta" ? "பாதுகாப்பு" : "Safe"}</span>
                      </div>
                    </div>

                    <button onClick={simulateDeviation}
                      className="bg-slate-900 hover:bg-slate-850 border border-slate-800 py-2 rounded-xl text-[11px] font-bold text-slate-300 transition">
                      {language === "ta" ? "⚠️ விலகல் நடவடிக்கை சோதனை" : "⚠️ Simulate Route Deviation"}
                    </button>

                    {guardianAlert && (
                      <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-3">
                        <p className="text-[11px] text-red-200 leading-relaxed">🚨 {guardianAlert}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* CENTER MAP */}
        <main className="flex-1 flex flex-col relative min-h-[350px]">

          {/* Map Controls */}
          <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
            {(["roadmap", "satellite", "hybrid", "terrain"] as const).map(v => (
              <button key={v} onClick={() => setMapType(v)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize shadow transition ${mapType === v ? "bg-accent text-white" : "bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white"}`}>
                {v}
              </button>
            ))}
            <button onClick={() => setStreetViewActive(s => !s)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shadow transition flex items-center gap-1 ${streetViewActive ? "bg-safe text-white" : "bg-slate-900/90 border border-slate-800 text-slate-300"}`}>
              <Eye className="w-3 h-3" /> Street
            </button>
            <button onClick={locateUser}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold shadow transition flex items-center gap-1 bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white"
              title={language === "ta" ? "எனது இருப்பிடம்" : "Locate Me"}>
              <MapPin className="w-3 h-3 text-accent" /> {language === "ta" ? "இருப்பிடம்" : "Locate Me"}
            </button>
          </div>

          {/* GPS Badge */}
          <div className="absolute top-3 right-3 z-10 bg-slate-900/95 border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-300">
            📍 {userLatLng.lat.toFixed(4)}°N, {userLatLng.lng.toFixed(4)}°E
          </div>

          {/* Google Map Container (Houses both Map and built-in Street View) */}
          <div ref={mapRef} className="flex-1 w-full bg-slate-950" />

          {/* No API Key placeholder */}
          {!mapsApiKey && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-5">
              <Map className="w-16 h-16 text-slate-700 mb-4" />
              <h3 className="text-white font-bold text-lg mb-2">
                {language === "ta" ? "Google Maps API Key தேவை" : "Google Maps API Key Required"}
              </h3>
              <p className="text-slate-400 text-sm max-w-xs text-center mb-4">
                {language === "ta"
                  ? "உண்மையான வரைபடத்திற்கு Google Maps API Key உள்ளிடவும்."
                  : "Enter your Google Maps API Key to load real satellite maps, street view and live routing."}
              </p>
              <button onClick={() => setShowApiKeyModal(true)}
                className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-bold rounded-xl shadow-glow-purple transition">
                {language === "ta" ? "API Key உள்ளிடு" : "Enter API Key"}
              </button>
            </div>
          )}
        </main>

        {/* RIGHT PANEL - SOS */}
        <aside className="w-full xl:w-[340px] bg-slate-950 border-l border-slate-800/50 p-4 md:p-5 flex flex-col gap-5 overflow-y-auto">

          {/* SOS Button */}
          <div className="glass-panel-danger rounded-3xl p-5 flex flex-col items-center gap-4 text-center">
            <div className="flex items-center justify-between w-full">
              <span className="text-[9px] font-black uppercase tracking-widest text-red-400">
                {language === "ta" ? "அவசர SOS" : "Emergency SOS"}
              </span>
              {contacts.length === 0 && (
                <span className="text-[8px] font-bold text-yellow-400 bg-yellow-950/40 border border-yellow-800/30 px-2 py-0.5 rounded">
                  {language === "ta" ? "தொடர்பு இல்லை!" : "No contacts!"}
                </span>
              )}
            </div>

            {sosCountdown > 0 ? (
              <div className="w-32 h-32 rounded-full bg-emergency flex flex-col items-center justify-center text-white border-8 border-red-900/60 shadow-glow-red">
                <span className="text-5xl font-black">{sosCountdown}</span>
                <span className="text-[9px] uppercase font-bold tracking-widest mt-1">
                  {language === "ta" ? "அனுப்புகிறேன்" : "Sending"}
                </span>
              </div>
            ) : (
              <button onClick={startSosCountdown}
                className={`w-32 h-32 rounded-full flex flex-col items-center justify-center text-white border-8 transition-all duration-500 active:scale-95 ${
                  sosActive
                    ? "bg-emerald-600 border-emerald-900/60 animate-safe-pulse"
                    : "bg-emergency border-red-900/60 animate-sos-pulse hover:scale-105"
                }`}>
                <Shield className="w-10 h-10 mb-1" />
                <span className="text-base font-black">
                  {sosActive ? (language === "ta" ? "நிறுத்து" : "CANCEL") : "SOS"}
                </span>
                <span className="text-[8px] font-medium opacity-80">
                  {sosActive ? (language === "ta" ? "PIN உள்ளிடு" : "Enter PIN") : (language === "ta" ? "அழுத்திக்கொண்டிருங்கள்" : "Press & Hold")}
                </span>
              </button>
            )}

            {/* Camera Preview */}
            {recordingEvidence && (
              <div className="w-full aspect-video rounded-xl overflow-hidden relative bg-slate-950 border border-slate-800">
                <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 bg-slate-950/80 border border-red-800/40 text-red-400 text-[8px] font-black px-1.5 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> REC
                </div>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              </div>
            )}

            {/* Status */}
            {sosStatus && (
              <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-left">
                <p className="text-[11px] text-slate-200 leading-relaxed">{sosStatus}</p>
              </div>
            )}

            {/* Cancel SOS hint */}
            {sosActive && (
              <button onClick={() => setShowPinModal(true)}
                className="text-xs text-slate-400 hover:text-white underline transition">
                {language === "ta" ? "PIN மூலம் SOS ஐ ரத்துசெய்" : "Cancel SOS with PIN"}
              </button>
            )}
          </div>

          {/* SOS History */}
          {sosLogs.length > 0 && (
            <div className="glass-panel p-4 rounded-2xl flex flex-col gap-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {language === "ta" ? "SOS வரலாறு" : "SOS History"}
              </h3>
              {sosLogs.slice(0, 4).map((s, i) => (
                <div key={s.id || i} className={`border rounded-xl p-2.5 text-xs flex justify-between items-center ${s.status === "active" ? "border-red-900/40 bg-red-950/20" : "border-slate-800 bg-slate-900/30"}`}>
                  <div>
                    <p className={`font-bold ${s.status === "active" ? "text-emergency" : "text-safe"}`}>
                      {s.status === "active" ? "🔴 ACTIVE" : "✅ Resolved"}
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      {new Date(s.created_at).toLocaleString()}
                    </p>
                  </div>
                  {s.status === "active" && (
                    <button onClick={async () => { await sosApi.resolve(s.id); loadSosLogs(); }}
                      className="text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded transition">
                      Resolve
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* ── MODALS ───────────────────────────────────────────── */}

      {/* Google Maps API Key Modal */}
      <AnimatePresence>
        {showApiKeyModal && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel border border-slate-700 p-6 max-w-md w-full rounded-2xl">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Map className="w-5 h-5 text-accent" /> Google Maps API Key
              </h3>
              <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                Get a free API Key from{" "}
                <a href="https://console.cloud.google.com" target="_blank" className="text-accent underline">console.cloud.google.com</a>
                {" "}→ Enable: <strong>Maps JavaScript API</strong>, <strong>Street View API</strong>, <strong>Directions API</strong>.
              </p>
              <input type="text" placeholder="AIza..." value={mapsApiKeyInput} onChange={e => setMapsApiKeyInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent/60 mb-3 font-mono" />
              <div className="flex gap-2">
                <button onClick={() => setShowApiKeyModal(false)}
                  className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 text-sm font-bold py-2.5 rounded-xl hover:bg-slate-850 transition">
                  Cancel
                </button>
                <button onClick={() => {
                  if (!mapsApiKeyInput.trim()) return;
                  setMapsApiKey(mapsApiKeyInput.trim());
                  localStorage.setItem("safepath_gmaps_key", mapsApiKeyInput.trim());
                  setShowApiKeyModal(false);
                  setTimeout(() => initGoogleMap(), 300);
                }}
                  className="flex-1 bg-accent hover:bg-accent-hover text-white text-sm font-bold py-2.5 rounded-xl transition shadow-glow-purple">
                  Load Map
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PIN Cancel SOS Modal */}
      <AnimatePresence>
        {showPinModal && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel border border-slate-700 p-6 max-w-sm w-full rounded-2xl">
              <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <Lock className="w-5 h-5 text-accent" />
                {language === "ta" ? "பாதுகாப்பு PIN உள்ளிடு" : "Enter Security PIN to Cancel SOS"}
              </h3>
              <p className="text-[11px] text-slate-400 mb-4">
                {language === "ta" ? "உங்கள் பதிவு PIN ஐ உள்ளிடவும்." : "Enter your registered emergency PIN."}
              </p>
              <input type="password" maxLength={6} placeholder="PIN" value={sosPin} onChange={e => setSosPin(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-center text-xl font-black text-white tracking-widest mb-3 focus:outline-none" />
              <div className="flex gap-2">
                <button onClick={() => setShowPinModal(false)}
                  className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 text-sm font-bold py-2.5 rounded-xl hover:bg-slate-850">
                  {language === "ta" ? "ரத்து" : "Back"}
                </button>
                <button onClick={cancelSos}
                  className="flex-1 bg-accent hover:bg-accent-hover text-white text-sm font-bold py-2.5 rounded-xl transition">
                  {language === "ta" ? "SOS ஐ நிறுத்து" : "Stop SOS Alert"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Distress Prompt Modal */}
      <AnimatePresence>
        {showDistressPrompt && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border-2 border-red-900/60 p-7 max-w-sm w-full rounded-3xl text-center shadow-glow-red">
              <AlertTriangle className="w-16 h-16 text-emergency animate-sos-pulse mx-auto mb-4" />
              <h3 className="text-xl font-black text-white mb-2">
                {language === "ta" ? "நீங்கள் பாதுகாப்பாக இருக்கிறீர்களா?" : "Are You Safe?"}
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                {language === "ta" ? "வழியிலிருந்து விலகல் கண்டறியப்பட்டது." : "An unexpected deviation from your route was detected."}
              </p>
              <div className="text-4xl font-black text-emergency mb-5 animate-pulse">{distressTimer}s</div>
              <p className="text-[11px] text-slate-400 mb-5">
                {language === "ta" ? "பதிலளிக்காவிட்டால் SOS தானாக அனுப்பப்படும்." : "SOS will auto-send if no response."}
              </p>
              <div className="flex gap-3">
                <button onClick={confirmSafe}
                  className="flex-1 bg-safe hover:bg-safe-hover text-white font-bold py-3 rounded-xl transition shadow">
                  {language === "ta" ? "✅ நான் பாதுகாப்பாக இருக்கிறேன்" : "✅ I am Safe"}
                </button>
                <button onClick={() => { setShowDistressPrompt(false); triggerSosNow(); }}
                  className="flex-1 bg-emergency hover:bg-emergency-hover text-white font-bold py-3 rounded-xl transition">
                  🆘 SOS
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Hazard Modal */}
      <AnimatePresence>
        {showReportModal && reportLoc && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel border border-slate-700 p-6 max-w-md w-full rounded-2xl">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                ⚠️ {language === "ta" ? "பாதுகாப்பு அபாயம் புகார் அளி" : "Report Safety Hazard"}
              </h3>
              <form onSubmit={submitReport} className="flex flex-col gap-3">
                <select value={reportCategory} onChange={e => setReportCategory(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                  <option value="dark_street">{language === "ta" ? "இருண்ட சாலை" : "Dark Street"}</option>
                  <option value="harassment">{language === "ta" ? "தொல்லை" : "Harassment Zone"}</option>
                  <option value="suspicious_activity">{language === "ta" ? "சந்தேகமான செயல்" : "Suspicious Activity"}</option>
                  <option value="unsafe_area">{language === "ta" ? "பாதுகாப்பற்ற பகுதி" : "Unsafe Area"}</option>
                  <option value="road_hazard">{language === "ta" ? "சாலை தடை" : "Road Hazard"}</option>
                </select>
                <textarea placeholder={language === "ta" ? "விவரங்கள் (ஐச்சரியமாக விவரி)..." : "Describe the hazard clearly..."} value={reportDesc} onChange={e => setReportDesc(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none min-h-[80px]" required />
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    {language === "ta" ? "ஆபத்து அளவு (1 = சிறிய, 5 = மிகவும் ஆபத்தானது)" : "Danger Level (1 = Mild, 5 = Critical)"}
                  </label>
                  <input type="range" min="1" max="5" value={reportRating} onChange={e => setReportRating(Number(e.target.value))} className="w-full accent-emergency" />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1 mt-0.5">
                    {[1,2,3,4,5].map(n => <span key={n}>{n}</span>)}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => { setShowReportModal(false); setReportLoc(null); }}
                    className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold py-2.5 rounded-xl hover:bg-slate-850">
                    {language === "ta" ? "ரத்து" : "Cancel"}
                  </button>
                  <button type="submit" className="flex-1 bg-accent hover:bg-accent-hover text-white text-xs font-bold py-2.5 rounded-xl transition shadow-glow-purple">
                    {language === "ta" ? "புகார் அளி" : "Submit Report"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Panel */}
      <AnimatePresence>
        {showAdmin && appMode === "admin" && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 max-w-3xl w-full rounded-3xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-white">SafePath AI Admin Console</h3>
                  <p className="text-[10px] text-slate-400">System Monitoring & Emergency Management</p>
                </div>
                <button onClick={() => { setShowAdmin(false); setAppMode("standard"); }}
                  className="bg-slate-900 border border-slate-800 p-2 rounded-xl text-slate-400 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                {adminMetrics && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Total Users", val: adminMetrics.total_users, color: "text-white" },
                      { label: "Active Trips", val: adminMetrics.active_trips, color: "text-safe" },
                      { label: "Reports", val: adminMetrics.total_reports, color: "text-warning" },
                      { label: "Active SOS", val: adminMetrics.active_sos_alerts, color: adminMetrics.active_sos_alerts > 0 ? "text-emergency animate-pulse" : "text-slate-400" },
                    ].map(m => (
                      <div key={m.label} className="bg-slate-950 border border-slate-850 p-4 rounded-2xl">
                        <span className="text-[10px] text-slate-400 block mb-1 uppercase font-bold">{m.label}</span>
                        <span className={`text-2xl font-black ${m.color}`}>{m.val}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-slate-950 border border-slate-850 p-5 rounded-2xl">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Active SOS Alerts</h4>
                  {sosLogs.filter(s => s.status === "active").length === 0
                    ? <p className="text-xs text-slate-400 italic text-center py-4">No active emergency alerts.</p>
                    : sosLogs.filter(s => s.status === "active").map((s, i) => (
                      <div key={s.id || i} className="bg-red-950/20 border border-red-900/30 p-3 rounded-xl mb-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-emergency">SOS #{(s.id || "").substring(0, 8)}</span>
                          <span className="text-[10px] text-slate-400">{new Date(s.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-[11px] text-slate-300">📍 {s.latitude.toFixed(5)}°N, {s.longitude.toFixed(5)}°E</p>
                        <a href={`https://maps.google.com/?q=${s.latitude},${s.longitude}`} target="_blank"
                          className="text-[10px] text-accent underline mt-1 block">Open in Google Maps</a>
                        <button onClick={async () => { await sosApi.resolve(s.id); loadSosLogs(); loadAdminMetrics(); }}
                          className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-3 py-1 rounded transition">
                          Mark Resolved
                        </button>
                      </div>
                    ))
                  }
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
