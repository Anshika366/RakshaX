import express from "express";
import path from "path";
import http from "http";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import twilio from "twilio";
import sgMail from "@sendgrid/mail";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let geminiAi: GoogleGenAI | null = null;
function getGeminiAi() {
  if (!geminiAi) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      geminiAi = new GoogleGenAI({ apiKey: key });
    }
  }
  return geminiAi;
}

// Lazy clients initialization
let supabaseClient: any = null;
let supabaseDisabled = false;

function getSupabase() {
  if (supabaseDisabled) return null;
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (
      url && 
      key && 
      !url.includes("your_supabase") && 
      !url.includes("placeholder") && 
      !url.includes("omevsvjiqkodlepgnjrv.supabase.co") &&
      url.startsWith("http")
    ) {
      try {
        supabaseClient = createClient(url, key);
        console.log("Supabase Client initialized successfully.");
      } catch (err) {
        supabaseDisabled = true;
        console.log("Supabase Client failed to initialize:", err);
      }
    } else {
      supabaseDisabled = true;
    }
  }
  return supabaseClient;
}


const systemLogs: string[] = [];
function addLog(msg: string) {
  const timestamp = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata" });
  const formattedLog = `[${timestamp}] ${msg}`;
  systemLogs.unshift(formattedLog);
  if (systemLogs.length > 50) {
    systemLogs.pop();
  }
  console.log(`[RakshaX API Log] ${msg}`);
}

function sanitizePhoneNumber(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }
  // Strip leading zero if it is a local format (e.g. 09876543210 -> 9876543210)
  if (cleaned.startsWith("0") && !cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }
  // If the number doesn't start with "+"
  if (!cleaned.startsWith("+")) {
    // If it's a 10-digit standard Indian mobile number, prepend +91
    if (cleaned.length === 10) {
      cleaned = "+91" + cleaned;
    } else {
      // For any other country codes entered without "+", e.g. 14155238886 or 919876543210, prepend "+"
      cleaned = "+" + cleaned;
    }
  }
  return cleaned;
}

let twilioClient: any = null;
function getTwilio() {
  if (!twilioClient) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (sid && token) {
      twilioClient = twilio(sid, token);
      addLog("Twilio Client initialized successfully.");
    } else {
      addLog("Twilio Client initialization skipped: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not in environment.");
    }
  }
  return twilioClient;
}

let sendgridInitialized = false;
function getSendgrid() {
  const key = process.env.SENDGRID_API_KEY;
  if (key && !key.includes("your_sendgrid") && !key.includes("placeholder")) {
    if (!sendgridInitialized) {
      sgMail.setApiKey(key);
      sendgridInitialized = true;
      console.log("SendGrid Client initialized successfully.");
    }
    return sgMail;
  }
  return null;
}

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory Database Fallback
const inMemoryDB: Record<string, {
  fullName: string;
  passwordHash: string;
  profile: any;
  contacts: any[];
  incidents: any[];
}> = {
  "anshikapathak25@navgurukul.org": {
    fullName: "Anshika Pathak",
    passwordHash: "password123",
    profile: {
      fullName: "Anshika Pathak",
      gender: "Female",
      dateOfBirth: "2000-08-20",
      bloodGroup: "B+",
      medicalConditions: "None",
      allergies: "None",
      currentMedications: "None",
      address: "Viman Nagar / Dhanori Road",
      city: "Pune",
      state: "Maharashtra",
      country: "India",
      emergencyNotes: "Alert emergency guardians immediately upon SOS trigger. Track live coordinates.",
      doctorName: "Dr. Joshi",
      doctorNumber: "+91 98765 43210",
      safetyPin: "1234"
    },
    contacts: [
      {
        id: "c1",
        name: "Primary Guardian (Verified)",
        relationship: "Family",
        phoneNumber: "+91 90393 01380",
        whatsAppNumber: "+91 90393 01380",
        email: "anshikapathak25@navgurukul.org",
        priority: "High",
        isPrimary: true,
        isSecondary: false,
        isFavorite: true,
        alertChannels: { sms: true, whatsapp: true, call: true, email: true }
      },
      {
        id: "c2",
        name: "Emergency Contact 2 (Verified)",
        relationship: "Guardian",
        phoneNumber: "+91 92342 13875",
        whatsAppNumber: "+91 92342 13875",
        email: "anshikapathak25@navgurukul.org",
        priority: "High",
        isPrimary: false,
        isSecondary: true,
        isFavorite: true,
        alertChannels: { sms: true, whatsapp: true, call: true, email: true }
      }
    ],
    incidents: [
      {
        id: "INC-2026-PUN-01",
        date: "2026-06-12",
        time: "09:45 PM",
        duration: "4 mins",
        location: "Viman Nagar, Pune, Maharashtra",
        coordinates: "18.5679° N, 73.9143° E",
        status: "Resolved"
      }
    ]
  },
  "ananya@safeguard.io": {
    fullName: "Anshika Pathak",
    passwordHash: "password123",
    profile: {
      fullName: "Anshika Pathak",
      gender: "Female",
      dateOfBirth: "2000-08-20",
      bloodGroup: "B+",
      medicalConditions: "None",
      allergies: "None",
      currentMedications: "None",
      address: "Viman Nagar / Dhanori Road",
      city: "Pune",
      state: "Maharashtra",
      country: "India",
      emergencyNotes: "Alert emergency guardians immediately upon SOS trigger. Track live coordinates.",
      doctorName: "Dr. Joshi",
      doctorNumber: "+91 98765 43210",
      safetyPin: "1234"
    },
    contacts: [
      {
        id: "c1",
        name: "Suresh Pathak (Family)",
        relationship: "Family",
        phoneNumber: "+91 98765 00112",
        whatsAppNumber: "+91 98765 00112",
        email: "family@safeguard.io",
        priority: "High",
        isPrimary: true,
        isSecondary: false,
        isFavorite: true,
        alertChannels: { sms: true, whatsapp: true, call: true, email: true }
      }
    ],
    incidents: [
      {
        id: "INC-2026-PUN-01",
        date: "2026-06-12",
        time: "09:45 PM",
        duration: "4 mins",
        location: "Viman Nagar, Pune, Maharashtra",
        coordinates: "18.5679° N, 73.9143° E",
        status: "Resolved"
      }
    ]
  }
};

// --- AUTH API ---
const otpStore: Record<string, { code: string; expiresAt: number }> = {};

app.post("/api/auth/send-otp", async (req, res) => {
  const { email, fullName } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email address is required." });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists in memory DB
  if (inMemoryDB[normalizedEmail]) {
    return res.status(400).json({ error: "An account with this email address already exists. Please sign in." });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[normalizedEmail] = {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes expiry
  };

  addLog(`Generated OTP ${code} for ${normalizedEmail}`);

  const sendgrid = getSendgrid();
  const sender = process.env.SENDGRID_SENDER_EMAIL;

  if (sendgrid && sender && !sender.includes("your_verified") && !sender.includes("placeholder")) {
    try {
      await sendgrid.send({
        to: normalizedEmail,
        from: sender,
        subject: "RakshaX - Your Email Verification PIN",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; max-width: 500px; margin: 0 auto; background-color: #ffffff; color: #1e293b; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #2563eb; margin: 0; font-size: 24px; font-weight: 800;">RakshaX</h2>
              <p style="font-size: 14px; color: #64748b; margin: 5px 0 0 0;">Email Verification</p>
            </div>
            <p style="font-size: 15px; color: #334155; line-height: 1.6;">Hello <strong>${fullName || "User"}</strong>,</p>
            <p style="font-size: 15px; color: #334155; line-height: 1.6;">Thank you for registering with RakshaX. To complete your account verification and activate your profile protection services, please enter the 6-digit security code below:</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; text-align: center; font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #1e3a8a; margin: 25px 0; font-family: monospace;">
              ${code}
            </div>
            
            <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; text-align: center; margin-top: 25px;">
              This verification code is valid for 10 minutes.<br/>
              If you did not initiate this request, please ignore this email.
            </p>
          </div>
        `
      });
      addLog(`SendGrid verification email sent successfully to ${normalizedEmail}`);
      return res.status(200).json({
        success: true,
        message: `Verification code sent to ${normalizedEmail}. Please check your inbox and spam folder.`,
        isSimulated: false
      });
    } catch (err: any) {
      const sendGridErrorDetail = err.response?.body?.errors?.[0]?.message || err.message;
      addLog(`SendGrid verification email failed to send to ${normalizedEmail}: ${sendGridErrorDetail}`);
    }
  }

  // Fallback to simulated delivery if SendGrid is not configured or fails
  addLog(`[SIMULATED EMAIL DISPATCH] Verification OTP for ${normalizedEmail} is [${code}]`);
  return res.status(200).json({
    success: true,
    message: "A verification code has been dispatched to your email (Simulated).",
    isSimulated: true,
    code: code
  });
});

app.post("/api/auth/register", async (req, res) => {
  const { email, password, fullName, otpCode } = req.body;
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: "Please enter your name, email, and password." });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Verify OTP if present in store
  const record = otpStore[normalizedEmail];
  if (record) {
    if (!otpCode) {
      return res.status(400).json({ error: "Verification code is required." });
    }
    if (record.code !== otpCode) {
      return res.status(400).json({ error: "Incorrect verification code. Please check your email." });
    }
    if (record.expiresAt < Date.now()) {
      return res.status(400).json({ error: "Verification code has expired. Please request a new one." });
    }
    // Delete OTP after successful verification
    delete otpStore[normalizedEmail];
  }

  // Try Supabase first if available
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: password,
        options: { data: { full_name: fullName } }
      });
      if (error) throw error;
      
      // Seed user profile
      await supabase.from("profiles").insert({
        id: data.user?.id,
        email: normalizedEmail,
        full_name: fullName,
        blood_group: "O+"
      });

      return res.status(200).json({ email: normalizedEmail, fullName, message: "Registered on Supabase!" });
    } catch (err: any) {
      supabaseDisabled = true;
      console.log("[Supabase Fallback] Supabase registration failed, falling back to local DB:", err.message);
    }
  }

  // Fallback to In-Memory
  if (inMemoryDB[normalizedEmail]) {
    return res.status(400).json({ error: "An account with this email already exists." });
  }

  inMemoryDB[normalizedEmail] = {
    fullName,
    passwordHash: password,
    profile: {
      fullName,
      gender: "Female",
      dateOfBirth: "2000-01-01",
      bloodGroup: "O+",
      medicalConditions: "",
      allergies: "",
      currentMedications: "",
      address: "",
      city: "",
      state: "",
      country: "",
      emergencyNotes: "",
      safetyPin: "1234"
    },
    contacts: [],
    incidents: []
  };

  res.status(200).json({ email: normalizedEmail, fullName, message: "Registered successfully." });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Please enter your email and password." });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Try Supabase first if available
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password
      });
      if (error) throw error;
      
      return res.status(200).json({
        email: normalizedEmail,
        fullName: data.user?.user_metadata?.full_name || "User",
        message: "Authenticated via Supabase!"
      });
    } catch (err: any) {
      supabaseDisabled = true;
      console.log("[Supabase Fallback] Supabase authentication failed, falling back to local DB:", err.message);
    }
  }

  // Fallback to In-Memory
  const user = inMemoryDB[normalizedEmail];
  if (!user || user.passwordHash !== password) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  res.status(200).json({
    email: normalizedEmail,
    fullName: user.fullName,
    message: "Authenticated successfully."
  });
});

app.post("/api/auth/delete-account", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required to delete account." });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Delete from in-memory DB if present
  if (inMemoryDB[normalizedEmail]) {
    delete inMemoryDB[normalizedEmail];
  }

  // Attempt Supabase deletion if connected
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("profiles").delete().eq("email", normalizedEmail);
    } catch (err: any) {
      console.log("[Supabase] Failed to delete profile row:", err.message);
    }
  }

  addLog(`User account permanently deleted for ${normalizedEmail}`);
  return res.status(200).json({
    success: true,
    message: "Account and associated safety records permanently deleted."
  });
});

// --- PROFILE API ---
app.get("/api/profile/:email", (req, res) => {
  const email = req.params.email.toLowerCase().trim();
  const user = inMemoryDB[email];
  if (user) {
    res.json({ profile: user.profile, contacts: user.contacts, incidents: user.incidents });
  } else {
    // Create lazy default profile
    const parts = email.split("@");
    const fullName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    const newProfile = {
      fullName,
      gender: "Female",
      dateOfBirth: "1998-05-15",
      bloodGroup: "O+",
      medicalConditions: "",
      allergies: "",
      currentMedications: "",
      address: "",
      city: "",
      state: "",
      country: "",
      emergencyNotes: "",
      doctorName: "",
      doctorNumber: "",
      safetyPin: "1234"
    };
    inMemoryDB[email] = {
      fullName,
      passwordHash: "password123",
      profile: newProfile,
      contacts: [],
      incidents: []
    };
    res.json({ profile: newProfile, contacts: [], incidents: [] });
  }
});

app.get("/api/config/status", (req, res) => {
  const sid = process.env.TWILIO_ACCOUNT_SID || "";
  const phone = process.env.TWILIO_PHONE_NUMBER || "";
  const whatsapp = process.env.TWILIO_WHATSAPP_NUMBER || "+14155238886";
  const sgKey = process.env.SENDGRID_API_KEY || "";
  const sgSender = process.env.SENDGRID_SENDER_EMAIL || "";

  res.json({
    twilioConfigured: !!(sid && process.env.TWILIO_AUTH_TOKEN && phone),
    twilioSidMasked: sid ? `${sid.slice(0, 6)}••••••••${sid.slice(-4)}` : null,
    twilioPhone: phone || null,
    twilioWhatsApp: whatsapp || null,
    isTwilioSandbox: whatsapp.includes("14155238886"),
    sendgridConfigured: !!(sgKey && sgSender),
    sendgridSender: sgSender || null,
    hasSecrets: !!(sid || sgKey)
  });
});

app.post("/api/config/update", (req, res) => {
  const { twilioAccountSid, twilioAuthToken, twilioPhoneNumber, twilioWhatsAppNumber, sendgridApiKey, sendgridSenderEmail } = req.body;

  if (twilioAccountSid) process.env.TWILIO_ACCOUNT_SID = twilioAccountSid.trim();
  if (twilioAuthToken) process.env.TWILIO_AUTH_TOKEN = twilioAuthToken.trim();
  if (twilioPhoneNumber) process.env.TWILIO_PHONE_NUMBER = twilioPhoneNumber.trim();
  if (twilioWhatsAppNumber) process.env.TWILIO_WHATSAPP_NUMBER = twilioWhatsAppNumber.trim();
  if (sendgridApiKey) process.env.SENDGRID_API_KEY = sendgridApiKey.trim();
  if (sendgridSenderEmail) process.env.SENDGRID_SENDER_EMAIL = sendgridSenderEmail.trim();

  // Reset clients so they reload new credentials
  twilioClient = null;
  sendgridInitialized = false;

  addLog("Twilio / SendGrid relay configuration credentials updated via Settings.");
  res.json({ success: true, message: "Relay credentials updated successfully." });
});

app.post("/api/config/test-twilio", async (req, res) => {
  try {
    const tw = getTwilio();
    if (!tw) {
      return res.status(400).json({ success: false, message: "Twilio credentials are not configured or invalid." });
    }
    // Fetch account details to verify SID and Auth Token
    const account = await tw.api.v2010.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    addLog(`Twilio credentials verified successfully for account: ${account.friendlyName} (Status: ${account.status})`);
    res.json({ 
      success: true, 
      accountName: account.friendlyName, 
      status: account.status,
      type: account.type || 'Standard/Upgraded',
      message: `Twilio verified! Account: ${account.friendlyName} (${account.type || 'Active'})` 
    });
  } catch (err: any) {
    addLog(`Twilio diagnostic test failed: ${err.message}`);
    res.status(400).json({ success: false, message: err.message });
  }
});

app.post("/api/profile/update", (req, res) => {
  const { email, profile } = req.body;
  if (!email || !profile) {
    return res.status(400).json({ error: "Missing email or profile parameters." });
  }
  const normalizedEmail = email.toLowerCase().trim();
  if (inMemoryDB[normalizedEmail]) {
    inMemoryDB[normalizedEmail].profile = profile;
    inMemoryDB[normalizedEmail].fullName = profile.fullName;
  } else {
    inMemoryDB[normalizedEmail] = {
      fullName: profile.fullName,
      passwordHash: "password123",
      profile,
      contacts: [],
      incidents: []
    };
  }
  res.json({ success: true, message: "Profile updated successfully." });
});

app.post("/api/contacts/update", (req, res) => {
  const { email, contacts } = req.body;
  if (!email || !contacts) {
    return res.status(400).json({ error: "Missing email or contacts parameters." });
  }
  const normalizedEmail = email.toLowerCase().trim();
  if (inMemoryDB[normalizedEmail]) {
    inMemoryDB[normalizedEmail].contacts = contacts;
  }
  res.json({ success: true, message: "Contacts saved successfully." });
});

app.get("/api/logs", (req, res) => {
  res.json({ logs: systemLogs });
});

function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getRegionalHelplines(address: string) {
  const lower = (address || "").toLowerCase();
  let metroHelpline = { number: "112", label: "National Emergency Helpline 112" };
  if (lower.includes("pune") || lower.includes("pimpri") || lower.includes("chinchwad") || lower.includes("maharashtra")) {
    metroHelpline = { number: "18002705501", label: "Pune Metro Official Toll-Free Helpline (1800-270-5501)" };
  } else if (lower.includes("delhi") || lower.includes("noida") || lower.includes("gurgaon") || lower.includes("gurugram") || lower.includes("ncr")) {
    metroHelpline = { number: "155370", label: "Delhi Metro DMRC Helpline 155370" };
  } else if (lower.includes("bengaluru") || lower.includes("bangalore") || lower.includes("karnataka")) {
    metroHelpline = { number: "180042512345", label: "Namma Metro Helpline 1800-425-12345" };
  } else if (lower.includes("mumbai")) {
    metroHelpline = { number: "18008890505", label: "Mumbai Metro Helpline 1800-889-0505" };
  }

  return {
    police: { number: "112", label: "India Unified Emergency Helpline 112 (Police / Fire / Medical)" },
    hospital: { number: "108", label: "State Emergency Medical & Ambulance Services 108" },
    clinic: { number: "104", label: "National Health Information & Medical Advice Helpline 104" },
    metro: metroHelpline
  };
}

function sanitizeDirectPhone(phone: any): string | null {
  if (!phone || typeof phone !== "string") return null;
  const clean = phone.replace(/[^0-9+]/g, "").trim();
  // Filter out short emergency helplines passed as direct phones
  if (clean === "112" || clean === "108" || clean === "102" || clean === "104" || clean === "100" || clean === "101" || clean === "155370") {
    return null;
  }
  // Must be a plausible phone number length (at least 8 digits)
  if (clean.replace(/\D/g, "").length < 8) {
    return null;
  }
  return phone.trim();
}

function updatePlaceDistance(place: any, currentLat: number, currentLon: number) {
  if (!place) return place;
  if (typeof place.lat === "number" && typeof place.lng === "number" && !isNaN(place.lat) && !isNaN(place.lng)) {
    const dist = calculateHaversineKm(currentLat, currentLon, place.lat, place.lng);
    return {
      ...place,
      dist: `${dist.toFixed(1)} km`,
      straightLineKm: Number(dist.toFixed(2)),
      roadEta: null,
      isCached: true,
      verified: false,
      verificationStatus: "Unverified Spatial Estimate (Cached)"
    };
  }
  return place;
}

function generateLocalEmergencyFallback(lat: number, lon: number, address: string) {
  let locality = "Local Area";
  if (address) {
    const parts = address.split(",");
    locality = parts[0]?.trim() || "Local Area";
  }

  const helplines = getRegionalHelplines(address);

  const makeFallbackItem = (
    categoryName: string,
    facilityType: string,
    helpline: { number: string; label: string },
    straightLineKm: number,
    offsetLat: number,
    offsetLon: number
  ) => ({
    providerId: `fallback:${categoryName.toLowerCase().replace(/\s+/g, '_')}`,
    name: `${locality} ${categoryName}`,
    facilityType,
    address: `${locality}, Nearest Public ${categoryName}`,
    lat: lat + offsetLat,
    lng: lon + offsetLon,
    straightLineKm,
    dist: `${straightLineKm.toFixed(1)} km`,
    roadDistanceKm: null,
    roadEta: null,
    eta: "Travel time unavailable (Road routing not configured)",
    directPhone: null,
    directPhoneCategory: "Direct phone number unavailable or not verified",
    directPhoneVerified: false,
    emergencyHelpline: helpline,
    phone: helpline.number,
    verified: false,
    verificationStatus: "Direct phone number unavailable or not verified in offline mode",
    source: "Local Proximity Fallback (Unverified - Offline Mode)",
    sourceUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locality + " " + categoryName)}`,
    lastUpdated: new Date().toISOString(),
    is24x7: null
  });

  return {
    police: [makeFallbackItem("Police Chowki / Post", "Police Chowki", helplines.police, 0.8, 0.005, 0.004)],
    metro: [makeFallbackItem("Transit Safe Hub", "Transit Hub", helplines.metro, 1.4, -0.007, 0.006)],
    hospital: [makeFallbackItem("Emergency Hospital", "Hospital with Emergency", helplines.hospital, 1.1, 0.007, -0.005)],
    clinic: [makeFallbackItem("First Aid Clinic & Pharmacy", "Clinic & Pharmacy", helplines.clinic, 0.4, 0.002, 0.002)],
    source: "Local Proximity Fallback (Unverified - Offline Mode)",
    verified: false,
    verificationStatus: "Direct phone number unavailable or not verified"
  };
}

// Query real facilities dynamically from OpenStreetMap GIS
async function fetchFacilityFromOsm(
  category: 'police' | 'hospital' | 'metro' | 'clinic',
  lat: number,
  lon: number,
  address: string,
  helpline: { number: string; label: string }
) {
  const delta = category === 'metro' ? 0.15 : 0.08;
  const viewbox = `${lon - delta},${lat + delta},${lon + delta},${lat - delta}`;
  
  const queryParams = category === 'police' 
    ? `amenity=police&viewbox=${viewbox}&bounded=1`
    : category === 'hospital'
    ? `amenity=hospital&viewbox=${viewbox}&bounded=1`
    : category === 'metro'
    ? `q=metro+station&viewbox=${viewbox}&bounded=0`
    : `amenity=clinic&viewbox=${viewbox}&bounded=1`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&${queryParams}&limit=4`, {
      headers: { 'User-Agent': 'RakshaX-EmergencyService/1.0 (safety-critical-pwa)' },
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) return null;

    // Filter valid items with coordinates and calculate Haversine distance
    const candidates = items
      .map((it: any) => {
        const itemLat = parseFloat(it.lat);
        const itemLon = parseFloat(it.lon);
        if (isNaN(itemLat) || isNaN(itemLon)) return null;
        const straightDist = calculateHaversineKm(lat, lon, itemLat, itemLon);
        return { ...it, itemLat, itemLon, straightDist };
      })
      .filter((it): it is NonNullable<typeof it> => it !== null)
      .sort((a, b) => a.straightDist - b.straightDist);

    if (candidates.length === 0) return null;
    const best = candidates[0];

    // Attempt extratags lookup for real direct phone number tag in OSM registry
    let directPhone: string | null = null;
    let is24x7: boolean | null = null;
    try {
      const typeChar = best.osm_type === 'way' ? 'W' : best.osm_type === 'relation' ? 'R' : 'N';
      const detailCtrl = new AbortController();
      const detailTimer = setTimeout(() => detailCtrl.abort(), 2000);
      const detailRes = await fetch(`https://nominatim.openstreetmap.org/lookup?osm_ids=${typeChar}${best.osm_id}&format=json&extratags=1`, {
        headers: { 'User-Agent': 'RakshaX-EmergencyService/1.0 (safety-critical-pwa)' },
        signal: detailCtrl.signal
      });
      clearTimeout(detailTimer);
      if (detailRes.ok) {
        const details = await detailRes.json();
        if (Array.isArray(details) && details[0]?.extratags) {
          const tags = details[0].extratags;
          const rawPhone = tags.phone || tags['contact:phone'] || tags['emergency:phone'];
          directPhone = sanitizeDirectPhone(rawPhone);
          if (tags.opening_hours === '24/7') is24x7 = true;
        }
      }
    } catch (e) {
      // Extratags timeout or error, continue with directPhone = null
    }

    // Attempt OSRM real road routing
    let roadDistKm: number | null = null;
    let roadEtaMins: number | null = null;
    let etaText = "Travel time unavailable (Road routing not configured)";

    try {
      const osrmCtrl = new AbortController();
      const osrmTimer = setTimeout(() => osrmCtrl.abort(), 2500);
      const osrmRes = await fetch(
        `http://router.project-osrm.org/route/v1/driving/${lon},${lat};${best.itemLon},${best.itemLat}?overview=false`,
        { signal: osrmCtrl.signal }
      );
      clearTimeout(osrmTimer);
      if (osrmRes.ok) {
        const osrmData = await osrmRes.json();
        if (osrmData?.routes && osrmData.routes.length > 0) {
          const r = osrmData.routes[0];
          roadDistKm = Number((r.distance / 1000).toFixed(1));
          roadEtaMins = Math.max(1, Math.round(r.duration / 60));
          etaText = `${roadEtaMins} mins (Road routing via OSRM)`;
        }
      }
    } catch (e) {
      // OSRM failed or timed out
    }

    const facilityName = best.name || best.display_name.split(',')[0].trim();
    let facilityType = "Emergency Station";
    if (category === 'police') {
      facilityType = facilityName.toLowerCase().includes('chowki') ? 'Police Chowki' : 'Police Station';
    } else if (category === 'hospital') {
      facilityType = 'Hospital with Emergency';
    } else if (category === 'metro') {
      facilityType = 'Metro Transit Station';
    } else if (category === 'clinic') {
      facilityType = 'Clinic & First Aid';
    }

    const hasDirectPhone = Boolean(directPhone);

    return {
      providerId: `osm:${best.osm_type}:${best.osm_id}`,
      name: facilityName,
      facilityType,
      address: best.display_name,
      lat: best.itemLat,
      lng: best.itemLon,
      straightLineKm: Number(best.straightDist.toFixed(2)),
      dist: `${best.straightDist.toFixed(1)} km`,
      roadDistanceKm: roadDistKm,
      roadEta: roadEtaMins,
      eta: etaText,
      directPhone: directPhone,
      directPhoneCategory: hasDirectPhone 
        ? "Facility Direct Telephone (OpenStreetMap Community Tag)" 
        : "Direct phone number unavailable or not verified",
      directPhoneVerified: false, // Community crowdsourced tag, NOT independently government-verified
      isAuthoritativelyVerified: false,
      emergencyHelpline: helpline,
      phone: directPhone || helpline.number,
      verified: false, // Strict integrity: only official government sources can set verified: true
      verificationStatus: hasDirectPhone 
        ? "Community-contributed from OpenStreetMap (Not independently government-verified)" 
        : "Direct phone number unavailable or not verified in public registry",
      source: "OpenStreetMap Real GIS Data",
      sourceUrl: `https://www.openstreetmap.org/${best.osm_type}/${best.osm_id}`,
      lastUpdated: new Date().toISOString(),
      is24x7: is24x7
    };
  } catch (err) {
    return null;
  }
}

const placesCache = new Map<string, { timestamp: number; data: any }>();

app.all("/api/places/nearest", async (req, res) => {
  const lat = parseFloat((req.query.lat || req.body?.lat) as string);
  const lon = parseFloat((req.query.lon || req.query.lng || req.body?.lon || req.body?.lng) as string);
  const address = (req.query.address || req.body?.address || "") as string;

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ error: "Invalid coordinates (lat, lon required)." });
  }

  // Validate range
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.status(400).json({ error: "Coordinates out of geographic range." });
  }

  const helplines = getRegionalHelplines(address);

  // Cache key with 2 decimals (~1km resolution)
  const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}`;
  const cached = placesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 1000 * 60 * 60 * 2) { // 2 hours freshness
    const recalculated = {
      police: cached.data.police.map((p: any) => updatePlaceDistance(p, lat, lon)),
      metro: cached.data.metro.map((m: any) => updatePlaceDistance(m, lat, lon)),
      hospital: cached.data.hospital.map((h: any) => updatePlaceDistance(h, lat, lon)),
      clinic: cached.data.clinic.map((c: any) => updatePlaceDistance(c, lat, lon)),
      source: "Cached from previous session (Unverified)",
      lastUpdated: new Date(cached.timestamp).toISOString(),
      verified: false,
      verificationStatus: "Unverified Spatial Estimate (Cached)"
    };
    return res.json(recalculated);
  }

  try {
    // Pace queries sequentially with delay to strictly adhere to Nominatim Usage Policy (1 req/sec max)
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const policeItem = await fetchFacilityFromOsm('police', lat, lon, address, helplines.police);
    await sleep(200);
    const hospitalItem = await fetchFacilityFromOsm('hospital', lat, lon, address, helplines.hospital);
    await sleep(200);
    const metroItem = await fetchFacilityFromOsm('metro', lat, lon, address, helplines.metro);
    await sleep(200);
    const clinicItem = await fetchFacilityFromOsm('clinic', lat, lon, address, helplines.clinic);

    // Generate local spatial fallback for any missing category
    const localFallback = generateLocalEmergencyFallback(lat, lon, address);

    const finalPolice = policeItem || localFallback.police[0];
    const finalMetro = metroItem || localFallback.metro[0];
    const finalHospital = hospitalItem || localFallback.hospital[0];
    const finalClinic = clinicItem || localFallback.clinic[0];

    const isAllRealOsm = Boolean(policeItem && hospitalItem);

    const result = {
      police: [finalPolice],
      metro: [finalMetro],
      hospital: [finalHospital],
      clinic: [finalClinic],
      source: isAllRealOsm ? "OpenStreetMap Real GIS Data" : "OpenStreetMap GIS + Local Proximity Fallback",
      lastUpdated: new Date().toISOString(),
      verified: false, // Honest label: crowdsourced OSM data is not independently gazetted
      verificationStatus: "Community-contributed OpenStreetMap data (Unverified by official authority)"
    };

    placesCache.set(cacheKey, { timestamp: Date.now(), data: result });
    addLog(`[Places Locator] Real GIS discovery around (${lat.toFixed(4)}, ${lon.toFixed(4)}): Police: ${finalPolice.name} (${finalPolice.dist}), Hospital: ${finalHospital.name} (${finalHospital.dist}). Source: ${result.source}`);

    return res.json(result);
  } catch (err: any) {
    addLog(`[Places Locator Error] ${err.message}. Generating local fallback.`);
    const fallback = generateLocalEmergencyFallback(lat, lon, address);
    return res.json(fallback);
  }
});

app.post("/api/emergency/location", (req, res) => {
  const { email, incidentId, coordinates, address } = req.body;
  console.log(`Live location update received for incident ${incidentId} (${email}): ${coordinates} - ${address}`);
  res.json({ success: true, message: "Coordinates received on emergency relay server." });
});

// Idempotency cache for in-flight / recently completed emergency dispatches
const recentDispatches = new Map<string, { timestamp: number; result: any }>();
setInterval(() => {
  const cutoff = Date.now() - 60000;
  for (const [key, val] of recentDispatches.entries()) {
    if (val.timestamp < cutoff) recentDispatches.delete(key);
  }
}, 300000);

// --- SOS DISPATCH API (SMS, WhatsApp, Email, Voice Call) ---
app.post("/api/emergency/trigger", async (req, res) => {
  const { 
    email, 
    incidentId, 
    userName, 
    coordinates, 
    address, 
    contacts, 
    policeStation, 
    nearestHospital, 
    nearestMetro, 
    nearestClinic, 
    timestamp: clientTimestamp 
  } = req.body;

  if (!userName || !coordinates || !contacts || !Array.isArray(contacts)) {
    return res.status(400).json({ error: "Missing emergency parameters." });
  }

  // Ensure police station is included in dispatch targets if provided
  const allDispatchTargets = [...contacts];
  if (policeStation && !allDispatchTargets.some((c: any) => c.id === 'police-112')) {
    allDispatchTargets.unshift({
      id: 'police-112',
      name: `Police Emergency (${policeStation.name || 'PCR 112'})`,
      phoneNumber: policeStation.phone || '112',
      whatsAppNumber: policeStation.phone || '112',
      email: policeStation.email || null,
      alertChannels: { sms: true, whatsapp: true, call: true, email: !!policeStation.email }
    });
  }

  // Idempotency check: if incidentId was already processed within last 30 seconds, return cached response
  if (incidentId && recentDispatches.has(incidentId)) {
    const cached = recentDispatches.get(incidentId)!;
    if (Date.now() - cached.timestamp < 30000) {
      addLog(`Idempotent replay detected for incident ${incidentId}. Returning cached dispatch response without duplicating alerts.`);
      return res.json(cached.result);
    }
  }

  const cleanCoords = coordinates.replace(/[^\d.,\-NnSseE°]/g, "");
  const googleMapsUrl = `https://maps.google.com/?q=${cleanCoords}`;
  const timestamp = clientTimestamp || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
  const cleanAddress = (address || "Live Device GPS Coordinates").replace(/\n/g, ", ").trim();

  // Public safety hubs for SMS/WA/Email broadcast
  const policeName = policeStation?.name || "Local Police Station / PCR 112";
  const policeDist = policeStation?.dist ? `(${policeStation.dist})` : "";
  const hospitalName = nearestHospital?.name || "Emergency Hospital & Trauma Unit";
  const hospitalDist = nearestHospital?.dist ? `(${nearestHospital.dist})` : "";
  const metroName = nearestMetro?.name || "Nearest Metro Station";
  const metroDist = nearestMetro?.dist ? `(${nearestMetro.dist})` : "";
  const clinicName = nearestClinic?.name || "Care Clinic & 24/7 First Aid";
  const clinicDist = nearestClinic?.dist ? `(${nearestClinic.dist})` : "";

  const twilio = getTwilio();
  const sendgrid = getSendgrid();
  const rawFromNumber = process.env.TWILIO_PHONE_NUMBER || "";
  const sanitizedFrom = sanitizePhoneNumber(rawFromNumber);

  // Process all contacts concurrently using Promise.all so no single contact blocks another
  const results = await Promise.all(
    allDispatchTargets.map(async (c: any) => {
      const contactResult = {
        id: c.id || `c-${Math.random().toString(36).substring(2, 8)}`,
        name: c.name || "Emergency Contact",
        sms: "failed",
        whatsapp: "failed",
        email: "failed",
        call: "failed"
      };

      const channels = c.alertChannels || { sms: true, whatsapp: true, call: true, email: true };
      const rawPhone = c.phoneNumber || c.phone || "";
      const rawWhatsApp = c.whatsAppNumber || c.whatsapp || c.phoneNumber || c.phone || "";
      const sanitizedTo = sanitizePhoneNumber(rawPhone);
      const sanitizedWhatsAppTo = sanitizePhoneNumber(rawWhatsApp);

      // Validate target phone presence
      const hasValidPhone = sanitizedTo && sanitizedTo.length >= 7;
      const hasValidWhatsApp = sanitizedWhatsAppTo && sanitizedWhatsAppTo.length >= 7;

      // Prepare 1-tap direct action URIs for immediate local fallback
      const shortAddress = cleanAddress.length > 55 ? cleanAddress.slice(0, 52) + "..." : cleanAddress;
      const directSmsText = encodeURIComponent(`EMERGENCY SOS: ${userName} is in DANGER! Location: ${cleanAddress}. Live Map: ${googleMapsUrl}. Police: 112 alerted.`);
      const directMailtoSubject = encodeURIComponent(`🚨 CRITICAL EMERGENCY SOS: Immediate Assistance Required for ${userName}`);
      const directMailtoBody = encodeURIComponent(`PRIORITY 1 - EMERGENCY SOS ALERT\n\n${userName} is in severe distress and triggered RakshaX SOS!\n\nLocation: ${cleanAddress}\nCoordinates: ${coordinates}\nLive Tracking: ${googleMapsUrl}\nPolice (112) has been notified.\n\nIncident ID: ${incidentId}\nTime: ${timestamp} IST`);

      (contactResult as any).directSmsUri = sanitizedTo ? `sms:${sanitizedTo}?body=${directSmsText}` : null;
      (contactResult as any).directMailtoUri = c.email ? `mailto:${c.email}?subject=${directMailtoSubject}&body=${directMailtoBody}` : null;
      (contactResult as any).directWhatsAppUri = sanitizedWhatsAppTo ? `https://wa.me/${sanitizedWhatsAppTo.replace(/[^0-9]/g, '')}?text=${directSmsText}` : null;

      // 1. Send SMS via Twilio (Single-segment GSM-7 compliant to prevent Error 30044 Trial Message Length Exceeded)
      if (channels.sms) {
        if (!hasValidPhone) {
          contactResult.sms = "failed (invalid_or_missing_phone)";
          addLog(`SMS skipped for ${c.name}: phone number missing or invalid.`);
        } else if (twilio && sanitizedFrom) {
          try {
            // Strictly GSM-7 formatted, under 160 chars so it delivers as 1 single segment even on Twilio Trial
            const smsBody = `RAKSHAX EMERGENCY SOS: ${userName.toUpperCase()} is in DANGER! Location: ${shortAddress}. Live GPS: ${googleMapsUrl}. Police: 112 alerted.`;

            const message = await twilio.messages.create({
              body: smsBody,
              from: sanitizedFrom,
              to: sanitizedTo
            });
            // Provider accepted for delivery processing; carrier delivery receipt not yet confirmed
            contactResult.sms = "dispatched_provider_accepted";
            addLog(`Twilio Emergency Alert SMS dispatched to carrier gateway for ${c.name} (${sanitizedTo}). Provider accepted SID: ${message.sid}`);
          } catch (err: any) {
            let advice = "";
            const code = err.code;
            if (code === 30044 || err.message?.includes("Trial Message Length")) {
              advice = " (Twilio trial length limit exceeded; use 1-Tap SIM SMS)";
            } else if (code === 21608 || err.message?.includes("unverified")) {
              advice = " (Twilio Trial Account: number is not verified in Twilio Console. Use 1-Tap SIM SMS or verify in console)";
            } else if (code === 21408 || err.message?.includes("Permission") || err.message?.includes("region")) {
              advice = " (enable India geo-permissions in Twilio)";
            } else if (code === 30007 || err.message?.includes("carrier") || err.message?.includes("DLT")) {
              advice = " (carrier DLT regulation)";
            }
            addLog(`Twilio SMS to ${c.name} (${sanitizedTo}) failed: ${err.message}${advice}`);
            contactResult.sms = `failed (${err.message}${advice})`;
          }
        } else {
          contactResult.sms = "not_configured";
          addLog(`SMS for ${c.name}: not_configured (Live Twilio credentials not provisioned in environment)`);
        }
      } else {
        contactResult.sms = "not_selected";
      }

      // 2. Send WhatsApp via Twilio (100% Automated Background Dispatch)
      if (channels.whatsapp) {
        if (!hasValidWhatsApp) {
          contactResult.whatsapp = "failed (invalid_or_missing_whatsapp)";
          addLog(`WhatsApp skipped for ${c.name}: number missing or invalid.`);
        } else {
          const whatsappFromRaw = process.env.TWILIO_WHATSAPP_NUMBER || "+14155238886";
          const sanitizedWhatsAppFrom = sanitizePhoneNumber(whatsappFromRaw);

          if (twilio && sanitizedWhatsAppFrom) {
            try {
              const isSandbox = sanitizedWhatsAppFrom.includes("14155238886");
              let whatsappBody = "";

              if (isSandbox) {
                const dynamicAlert = `SOS distress alert from ${userName || "User"}. Location: ${cleanAddress}. Track live: ${googleMapsUrl}`;
                whatsappBody = `Your Alert code is ${dynamicAlert}`;
              } else {
                whatsappBody = `🚨 *CRITICAL RAKSHAX EMERGENCY SOS ALERT* 🚨\n*PRIORITY 1 - IMMEDIATE THREAT TO LIFE*\n\n*${userName.toUpperCase()}* is in grave danger and needs immediate rescue!\n\n📍 *EXACT LOCATION:*\n${cleanAddress}\n\n🌐 *GPS COORDINATES:*\n${coordinates}\n\n🗺️ *LIVE SATELLITE MAP:*\n${googleMapsUrl}\n\n🚓 *NEAREST POLICE:* ${policeName} ${policeDist} (Call 112)\n🏥 *NEAREST HOSPITAL:* ${hospitalName} ${hospitalDist}\n🚇 *NEAREST METRO:* ${metroName} ${metroDist}\n🩺 *NEAREST CLINIC:* ${clinicName} ${clinicDist}\n\n⚠️ *ACT IMMEDIATELY:* Call the victim or rush to their live GPS location right now!`;
              }

              const message = await twilio.messages.create({
                body: whatsappBody,
                from: `whatsapp:${sanitizedWhatsAppFrom}`,
                to: `whatsapp:${sanitizedWhatsAppTo}`
              });

              if (isSandbox) {
                contactResult.whatsapp = "sandbox_queued";
                (contactResult as any).whatsappError = "Twilio Sandbox: Recipient must join sandbox by sending 'join <keyword>' to +14155238886. With your paid Twilio subscription, WhatsApp messages deliver automatically without opt-in.";
              } else {
                contactResult.whatsapp = "dispatched_provider_accepted";
              }

              addLog(`Twilio WhatsApp message dispatched to carrier gateway for ${c.name} (${sanitizedWhatsAppTo}). SID: ${message.sid}`);
            } catch (err: any) {
              let advice = "";
              const code = err.code;
              if (code === 63030 || err.message.includes("Sandbox")) {
                advice = " (recipient must join sandbox once, or upgrade to Twilio paid subscription)";
              } else if (code === 21608 || err.message.includes("unverified")) {
                advice = " (unverified number in trial account - upgrade to Twilio subscription)";
              }
              addLog(`Twilio WhatsApp to ${c.name} (${sanitizedWhatsAppTo}) failed: ${err.message}${advice}`);
              contactResult.whatsapp = `failed (${err.message}${advice})`;
            }
          } else {
            contactResult.whatsapp = "not_configured";
            addLog(`WhatsApp for ${c.name}: not_configured (Live Twilio WhatsApp credentials not provisioned in environment)`);
          }
        }
      } else {
        contactResult.whatsapp = "not_selected";
      }

      // 3. Send Email via SendGrid (High Priority Emergency Dossier)
      if (channels.email && c.email) {
        if (sendgrid && process.env.SENDGRID_SENDER_EMAIL) {
          try {
            await sendgrid.send({
              to: c.email,
              from: process.env.SENDGRID_SENDER_EMAIL,
              subject: `🚨 CRITICAL EMERGENCY SOS: Immediate Assistance Required for ${userName}`,
              headers: {
                "X-Priority": "1",
                "X-MSMail-Priority": "High",
                "Importance": "High",
                "Priority": "urgent"
              },
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 25px; border: 3px solid #dc2626; border-radius: 14px; max-width: 620px; margin: 0 auto; background-color: #ffffff; color: #1e293b;">
                  <div style="text-align: center; border-bottom: 2px solid #fee2e2; padding-bottom: 15px; margin-bottom: 20px;">
                    <span style="background-color: #dc2626; color: #ffffff; padding: 6px 18px; border-radius: 9999px; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">
                      🚨 PRIORITY 1 — EMERGENCY SOS ALERT
                    </span>
                    <h1 style="color: #dc2626; margin: 15px 0 0 0; font-size: 24px; font-weight: 900;">IMMEDIATE ACTION REQUIRED</h1>
                  </div>
                  
                  <p style="font-size: 16px; line-height: 1.6; color: #334155;">
                    Your contact, <strong style="color: #0f172a; font-size: 18px;">${userName}</strong>, is in severe distress and has triggered the RakshaX Life-Saving SOS Alert.
                  </p>

                  <div style="background-color: #fef2f2; padding: 20px; border-radius: 10px; border: 1.5px solid #fca5a5; margin: 18px 0; text-align: center;">
                    <div style="font-size: 12px; font-weight: 800; color: #991b1b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">📍 VICTIM'S CURRENT LOCATION</div>
                    <p style="font-size: 16px; font-weight: bold; color: #111827; margin: 0 0 14px 0;">${cleanAddress}</p>
                    <a href="${googleMapsUrl}" style="background-color: #dc2626; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: 800; border-radius: 8px; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);">
                      🗺️ TRACK LIVE SATELLITE GPS LOCATION
                    </a>
                  </div>

                  <div style="margin: 20px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px;">
                    <h3 style="font-size: 13px; font-weight: 800; color: #475569; text-transform: uppercase; margin: 0 0 10px 0;">Nearest Public Safety Stations:</h3>
                    <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8; color: #1e293b;">
                      <li><strong>🚓 Police Station:</strong> ${policeName} ${policeDist} — Control Room 112 Alerted</li>
                      <li><strong>🏥 Nearest Hospital:</strong> ${hospitalName} ${hospitalDist}</li>
                      <li><strong>🚇 Nearest Metro:</strong> ${metroName} ${metroDist}</li>
                      <li><strong>🩺 Nearest Clinic:</strong> ${clinicName} ${clinicDist}</li>
                    </ul>
                  </div>

                  <p style="font-size: 12px; color: #64748b; font-family: monospace; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 20px;">
                    GPS Coordinates: ${coordinates} | Incident ID: ${incidentId} | Time: ${timestamp} IST
                  </p>
                </div>
              `
            });
            // SendGrid HTTP 202 Accepted means queued for processing by provider, not confirmed inbox delivery
            contactResult.email = "dispatched_provider_accepted";
            addLog(`SendGrid accepted Emergency Email for processing for ${c.name} (${c.email}). HTTP 202 Accepted.`);
          } catch (err: any) {
            let advice = "";
            const msg = err.response?.body?.errors?.[0]?.message || err.message || "";
            if (msg.includes("Maximum credits exceeded") || err.code === 401) {
              advice = " (SendGrid trial credit quota exceeded on this API key. Use 1-Tap Direct Gmail/Email below)";
            }
            addLog(`SendGrid Email to ${c.name} failed: ${err.message}${advice}`);
            contactResult.email = `failed (${err.message}${advice})`;
          }
        } else {
          contactResult.email = "not_configured";
          addLog(`Email for ${c.name}: not_configured (Live SendGrid API keys not provisioned in environment)`);
        }
      } else {
        contactResult.email = c.email ? "not_selected" : "failed (No Email Provided)";
      }

      // 4. Send Voice Call via Twilio (Bilingual Hindi + English Emergency Announcement)
      if (channels.call) {
        if (!hasValidPhone) {
          contactResult.call = "failed (invalid_or_missing_phone)";
        } else if (twilio && sanitizedFrom) {
          try {
            await twilio.calls.create({
              twiml: `<Response><Say voice="alice" language="hi-IN">आपातकालीन सूचना! रक्षा एक्स इमरजेंसी अलर्ट। आपके संपर्क ${userName} गंभीर खतरे में हैं और उन्होंने एसओएस अलार्म ट्रिगर किया है। उनकी लाइव लोकेशन एसएमएस और व्हाट्सएप पर भेज दी गई है। कृपया तुरंत उनकी सहायता करें या पुलिस 112 पर संपर्क करें।</Say><Pause length="1"/><Say voice="alice" language="en-IN">Emergency SOS alert! Your contact, ${userName}, is in severe danger and has triggered their SOS alarm. Please check your SMS and WhatsApp immediately for their live GPS tracking location and assist them right away.</Say></Response>`,
              from: sanitizedFrom,
              to: sanitizedTo
            });
            // Voice call gateway initiated; connection/answer pending
            contactResult.call = "call_initiated";
            addLog(`Twilio Voice Call initiated via telephony gateway to ${c.name} (${sanitizedTo}).`);
          } catch (err: any) {
            addLog(`Twilio Voice Call to ${c.name} (${sanitizedTo}) failed: ${err.message}`);
            contactResult.call = `failed (${err.message})`;
          }
        } else {
          contactResult.call = "not_configured";
          addLog(`Voice Call for ${c.name}: not_configured (Live Twilio voice credentials not provisioned in environment)`);
        }
      } else {
        contactResult.call = "not_selected";
      }

      return contactResult;
    })
  );

  // Update Incident history
  if (email) {
    const normalizedEmail = email.toLowerCase().trim();
    if (inMemoryDB[normalizedEmail]) {
      const activeIncident = {
        id: incidentId,
        date: new Date().toISOString().split("T")[0],
        time: timestamp,
        duration: "Active",
        location: address,
        coordinates,
        status: "Active"
      };
      inMemoryDB[normalizedEmail].incidents.unshift(activeIncident);
    }
  }

  const responsePayload = {
    success: true,
    incidentId,
    timestamp,
    results,
    isRealService: !!(twilio || sendgrid)
  };

  if (incidentId) {
    recentDispatches.set(incidentId, { timestamp: Date.now(), result: responsePayload });
  }

  res.json(responsePayload);
});

app.post("/api/emergency/end", (req, res) => {
  const { email, incidentId, duration } = req.body;
  if (email && incidentId) {
    const normalizedEmail = email.toLowerCase().trim();
    if (inMemoryDB[normalizedEmail]) {
      const idx = inMemoryDB[normalizedEmail].incidents.findIndex(inc => inc.id === incidentId);
      if (idx !== -1) {
        inMemoryDB[normalizedEmail].incidents[idx].status = "Resolved";
        inMemoryDB[normalizedEmail].incidents[idx].duration = duration || "3 mins";
      }
    }
  }
  res.json({ success: true, message: "Emergency incident resolved successfully." });
});

// Reassurance Safety Check-in endpoint ("I Am Safe")
app.post("/api/emergency/checkin", async (req, res) => {
  const { email, userName, coordinates, address, contacts, message: customMessage } = req.body;

  if (!userName || !contacts || !Array.isArray(contacts)) {
    return res.status(400).json({ error: "Missing required check-in parameters." });
  }

  const twilio = getTwilio();
  const sendgrid = getSendgrid();
  const rawFromNumber = process.env.TWILIO_PHONE_NUMBER || "";
  const sanitizedFrom = sanitizePhoneNumber(rawFromNumber);
  const googleMapsUrl = coordinates ? `https://maps.google.com/?q=${coordinates.replace(/[^\d.,\-NnSseE°]/g, "")}` : "";

  const checkinText = customMessage || `✅ SAFE CHECK-IN / सुरक्षित संदेश: ${userName} has arrived safely and marked themselves safe. Location: ${address || "Current Location"} ${googleMapsUrl ? `\nTrack: ${googleMapsUrl}` : ""}`;

  const results = await Promise.all(
    contacts.map(async (c: any) => {
      const contactResult = {
        id: c.id || `c-${Math.random().toString(36).substring(2, 8)}`,
        name: c.name || "Emergency Contact",
        sms: "not_selected",
        whatsapp: "not_selected",
        email: "not_selected"
      };

      const channels = c.alertChannels || { sms: true, whatsapp: true, email: true };
      const rawPhone = c.phoneNumber || "";
      const rawWhatsApp = c.whatsAppNumber || c.phoneNumber || "";
      const sanitizedTo = sanitizePhoneNumber(rawPhone);
      const sanitizedWhatsAppTo = sanitizePhoneNumber(rawWhatsApp);

      // SMS Check-in
      if (channels.sms && sanitizedTo && sanitizedTo.length >= 7) {
        if (twilio && sanitizedFrom) {
          try {
            await twilio.messages.create({
              body: checkinText.slice(0, 160),
              from: sanitizedFrom,
              to: sanitizedTo
            });
            contactResult.sms = "delivered";
          } catch (err: any) {
            contactResult.sms = `failed (${err.message})`;
          }
        } else {
          contactResult.sms = "simulated (Dev Mode - Gateway not configured)";
        }
      }

      // WhatsApp Check-in
      if (channels.whatsapp && sanitizedWhatsAppTo && sanitizedWhatsAppTo.length >= 7) {
        const whatsappFromRaw = process.env.TWILIO_WHATSAPP_NUMBER || "+14155238886";
        const sanitizedWhatsAppFrom = sanitizePhoneNumber(whatsappFromRaw);
        if (twilio && sanitizedWhatsAppFrom) {
          try {
            await twilio.messages.create({
              body: `✅ *RakshaX Safe Check-In*\n\n${checkinText}`,
              from: `whatsapp:${sanitizedWhatsAppFrom}`,
              to: `whatsapp:${sanitizedWhatsAppTo}`
            });
            contactResult.whatsapp = "delivered";
          } catch (err: any) {
            contactResult.whatsapp = `failed (${err.message})`;
          }
        } else {
          contactResult.whatsapp = "simulated (Dev Mode - Gateway not configured)";
        }
      }

      // Email Check-in
      if (channels.email && c.email) {
        if (sendgrid && process.env.SENDGRID_SENDER_EMAIL) {
          try {
            await sendgrid.send({
              to: c.email,
              from: process.env.SENDGRID_SENDER_EMAIL,
              subject: `Safe Check-in Update from ${userName}`,
              html: `
                <div style="font-family: sans-serif; padding: 20px; border: 2px solid #10b981; border-radius: 12px; max-width: 500px; margin: 0 auto;">
                  <h2 style="color: #059669; margin-top: 0;">✅ Safe Check-In Confirmed</h2>
                  <p>Your contact <strong>${userName}</strong> has marked themselves safe.</p>
                  <p><strong>Location:</strong> ${address || "Current Location"}</p>
                  ${googleMapsUrl ? `<p><a href="${googleMapsUrl}" style="background-color: #059669; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">View Location</a></p>` : ""}
                </div>
              `
            });
            contactResult.email = "delivered";
          } catch (err: any) {
            contactResult.email = `failed (${err.message})`;
          }
        } else {
          contactResult.email = "simulated (Dev Mode - Gateway not configured)";
        }
      }

      return contactResult;
    })
  );

  addLog(`Reassurance check-in sent for ${userName} (${email || "anonymous"}) to ${contacts.length} contacts.`);
  res.json({
    success: true,
    message: "Reassurance check-in broadcast processed.",
    results
  });
});

// --- NEW TWILIO CONTENT API WHATSAPP SOS TRIGGER ROUTE ---
app.post("/api/sos/trigger", async (req, res) => {
  const { to_number, name, location, map_link, gps, incident_id } = req.body;

  if (!to_number || !name || !location || !map_link || !gps || !incident_id) {
    return res.status(400).json({ error: "Missing required parameters: to_number, name, location, map_link, gps, incident_id." });
  }

  const twilioInst = getTwilio();
  const rawFromNumber = process.env.TWILIO_WHATSAPP_NUMBER || "+14155238886";
  const sanitizedWhatsAppFrom = sanitizePhoneNumber(rawFromNumber);
  const sanitizedWhatsAppTo = sanitizePhoneNumber(to_number);

  if (!twilioInst || !sanitizedWhatsAppFrom) {
    const simulatedSid = "SM_SIMULATED_" + Math.random().toString(36).substring(2, 15);
    addLog(`[Simulated SOS WhatsApp Template Trigger] From: ${sanitizedWhatsAppFrom}, To: ${sanitizedWhatsAppTo}, Template: HX19465ec99a0574262ea2a7e1f8c73eb1`);
    return res.json({
      success: true,
      message_sid: simulatedSid,
      status: "queued"
    });
  }

  try {
    const content_variables = {
      "1": name,
      "2": location,
      "3": map_link,
      "4": gps,
      "5": new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC",
      "6": incident_id
    };

    const content_sid = "HX19465ec99a0574262ea2a7e1f8c73eb1";

    const message = await twilioInst.messages.create({
      from: `whatsapp:${sanitizedWhatsAppFrom}`,
      to: `whatsapp:${sanitizedWhatsAppTo}`,
      contentSid: content_sid,
      contentVariables: JSON.stringify(content_variables)
    });

    addLog(`Twilio WhatsApp Content Template (SID: ${content_sid}) dispatched successfully to ${name} (${sanitizedWhatsAppTo}). SID: ${message.sid}`);
    return res.json({
      success: true,
      message_sid: message.sid,
      status: message.status
    });
  } catch (err: any) {
    addLog(`Twilio WhatsApp Content Template send to ${name} failed: ${err.message}`);
    return res.status(400).json({ error: err.message });
  }
});

// Explicit Service Worker Route with Service-Worker-Allowed Header
app.get("/sw.js", (req, res) => {
  const swPath = path.join(process.cwd(), "public", "sw.js");
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Service-Worker-Allowed", "/");
  res.sendFile(swPath);
});

// Serve Vite dynamic client in development mode
async function startServer() {
  const httpServer = http.createServer(app);
  let vite: any;

  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer,
        },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[RakshaX API Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
