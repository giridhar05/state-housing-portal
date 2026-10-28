import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defaultSchemeRules, computeScore } from './services/scoring.js';
import { createLedgerEntry, verifyLedgerChain, GENESIS_PREV_HASH } from './services/auditLedger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initial empty DB structure
const initialSchema = {
  users: [],
  schemes: [],
  units: [],
  applications: [],
  payments: [],
  verifications: [],
  allotments: [],
  waitlists: [],
  vacancies: [],
  notifications: [],
  audit_logs: [],
  audit_ledger: [],
  chat_tickets: []
};

// Seed data
const seedData = {
  users: [
    { id: "usr_admin", name: "System Admin", mobile: "9876543210", email: "admin@housingboard.gov", role: "System Administrator", password: "password123" },
    { id: "usr_super", name: "Super Admin", mobile: "9876543211", email: "super@housingboard.gov", role: "Super Admin", password: "password123" },
    { id: "usr_verify", name: "Officer Varma", mobile: "9876543212", email: "verify.varma@housingboard.gov", role: "Verification Officer", password: "password123" },
    { id: "usr_finance", name: "Officer Sharma", mobile: "9876543213", email: "finance.sharma@housingboard.gov", role: "Finance Officer", password: "password123" },
    { id: "usr_allot", name: "Officer Gupta", mobile: "9876543214", email: "allot.gupta@housingboard.gov", role: "Allotment Officer", password: "password123" },
    { id: "usr_app1", name: "Rajesh Kumar", mobile: "9812345670", email: "rajesh@gmail.com", role: "Applicant", password: "password123" },
    { id: "usr_app2", name: "Priya Patel", mobile: "9812345671", email: "priya@gmail.com", role: "Applicant", password: "password123" },
    { id: "usr_app3", name: "Amit Sharma", mobile: "9812345672", email: "amit@gmail.com", role: "Applicant", password: "password123" }
  ],
  schemes: [
    {
      id: "sch_pmay_01",
      name: "Pradhan Mantri Awas Yojana - Phase II",
      code: "PMAY-II-2026",
      location: "Green Valley, Sector 4",
      district: "Central",
      type: "2BHK",
      unitsCount: 5,
      reservationRules: {
        scst: 20, // 20% quota -> 1 unit
        bc: 30,   // 30% quota -> 1 or 2 units
        ph: 10,   // 10% quota
        ex: 10,   // 10% quota
        general: 30 // Remaining units
      },
      rules: defaultSchemeRules,
      ruleVersion: 1,
      incomeLimit: 600000,
      startDate: "2026-06-01",
      endDate: "2026-08-31",
      allotmentDate: "2026-09-15",
      waitlistRules: {
        maxWaitlistPercent: 200
      },
      status: "Active"
    },
    {
      id: "sch_mvhs_02",
      name: "Metro Vista Housing Society",
      code: "MVHS-2026",
      location: "Salt Lake, Block C",
      district: "East",
      type: "3BHK",
      unitsCount: 10,
      reservationRules: {
        scst: 15,
        bc: 25,
        ph: 5,
        ex: 5,
        general: 50
      },
      rules: defaultSchemeRules,
      ruleVersion: 1,
      incomeLimit: 1200000,
      startDate: "2026-07-01",
      endDate: "2026-09-30",
      allotmentDate: "2026-10-15",
      waitlistRules: {
        maxWaitlistPercent: 100
      },
      status: "Active"
    }
  ],
  units: [
    { id: "unt_pmay_1", schemeId: "sch_pmay_01", block: "Block A", unitNumber: "A-101", status: "vacant", allottedTo: null },
    { id: "unt_pmay_2", schemeId: "sch_pmay_01", block: "Block A", unitNumber: "A-102", status: "vacant", allottedTo: null },
    { id: "unt_pmay_3", schemeId: "sch_pmay_01", block: "Block A", unitNumber: "A-103", status: "vacant", allottedTo: null },
    { id: "unt_pmay_4", schemeId: "sch_pmay_01", block: "Block B", unitNumber: "B-101", status: "vacant", allottedTo: null },
    { id: "unt_pmay_5", schemeId: "sch_pmay_01", block: "Block B", unitNumber: "B-102", status: "vacant", allottedTo: null },
    { id: "unt_mvhs_1", schemeId: "sch_mvhs_02", block: "Tower 1", unitNumber: "101", status: "vacant", allottedTo: null },
    { id: "unt_mvhs_2", schemeId: "sch_mvhs_02", block: "Tower 1", unitNumber: "102", status: "vacant", allottedTo: null },
    { id: "unt_mvhs_3", schemeId: "sch_mvhs_02", block: "Tower 1", unitNumber: "201", status: "vacant", allottedTo: null },
    { id: "unt_mvhs_4", schemeId: "sch_mvhs_02", block: "Tower 1", unitNumber: "202", status: "vacant", allottedTo: null },
    { id: "unt_mvhs_5", schemeId: "sch_mvhs_02", block: "Tower 2", unitNumber: "301", status: "vacant", allottedTo: null },
    { id: "unt_mvhs_6", schemeId: "sch_mvhs_02", block: "Tower 2", unitNumber: "302", status: "vacant", allottedTo: null },
    { id: "unt_mvhs_7", schemeId: "sch_mvhs_02", block: "Tower 2", unitNumber: "401", status: "vacant", allottedTo: null },
    { id: "unt_mvhs_8", schemeId: "sch_mvhs_02", block: "Tower 2", unitNumber: "402", status: "vacant", allottedTo: null },
    { id: "unt_mvhs_9", schemeId: "sch_mvhs_02", block: "Tower 3", unitNumber: "501", status: "vacant", allottedTo: null },
    { id: "unt_mvhs_10", schemeId: "sch_mvhs_02", block: "Tower 3", unitNumber: "502", status: "vacant", allottedTo: null }
  ]
};

// Initialize DB file
export function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    const data = { ...initialSchema };
    data.users = [...seedData.users];
    data.schemes = [...seedData.schemes];
    data.units = [...seedData.units];
    data.audit_ledger = [
      createLedgerEntry([], "SYSTEM", "GENESIS_INITIALIZATION", {
        organization: "Tamil Nadu Housing Board",
        module: "Cryptographic Transparent Allotment Ledger",
        specVersion: "2.0-Innovations"
      })
    ];
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    console.log("Database initialized and seeded with Cryptographic Genesis Block.");
  } else {
    // Migration: Ensure innovations schema compliance
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(content);
      let updated = false;

      // 1. Ensure pre-seeded users have default passwords
      data.users.forEach(u => {
        if (!u.password) {
          u.password = "password123";
          updated = true;
        }
      });

      // 2. Ensure schemes have scoring rules and ruleVersion
      if (!data.schemes) data.schemes = [];
      data.schemes.forEach(s => {
        if (!s.rules || s.rules.length === 0) {
          s.rules = defaultSchemeRules;
          s.ruleVersion = 1;
          updated = true;
        }
      });

      // 3. Ensure audit_ledger exists with Genesis block
      if (!data.audit_ledger || data.audit_ledger.length === 0) {
        data.audit_ledger = [
          createLedgerEntry([], "SYSTEM", "GENESIS_INITIALIZATION", {
            organization: "Tamil Nadu Housing Board",
            module: "Cryptographic Transparent Allotment Ledger",
            specVersion: "2.0-Innovations"
          })
        ];
        updated = true;
      }

      // 4. Ensure applications have calculated scores
      if (!data.applications) data.applications = [];
      data.applications.forEach(app => {
        if (app.score === undefined) {
          const scheme = data.schemes.find(s => s.id === app.schemeId);
          const rules = scheme?.rules || defaultSchemeRules;
          const scoreResult = computeScore(app, rules);
          app.score = scoreResult.totalScore;
          app.scoreBreakdown = scoreResult.breakdown;
          app.ruleVersion = scheme?.ruleVersion || 1;
          updated = true;
        }
      });

      if (!data.chat_tickets) {
        data.chat_tickets = [];
        updated = true;
      }

      if (updated) {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
        console.log("Database schema successfully migrated to Innovations Specification 2.0.");
      }
    } catch (e) {
      console.error("Database migration error:", e);
    }
  }
}

// Read database contents
export function readDb() {
  initDb();
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading database file, using fallback:", err);
    return { ...initialSchema };
  }
}

// Write database contents
export function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error("Error writing database file:", err);
    return false;
  }
}

// Helper: Append immutable block to SHA-256 Hash Chain Audit Ledger
export function recordLedgerAction(actorId, action, payload) {
  const db = readDb();
  if (!db.audit_ledger) db.audit_ledger = [];

  const entry = createLedgerEntry(db.audit_ledger, actorId, action, payload);
  db.audit_ledger.push(entry);

  // Also maintain backward-compatible audit_logs
  db.audit_logs.unshift({
    id: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    seq: entry.seq,
    userId: actorId,
    userName: db.users.find(u => u.id === actorId)?.name || (actorId === "SYSTEM" ? "System Daemon" : "User"),
    action,
    details: typeof payload === "string" ? payload : JSON.stringify(payload),
    hash: entry.hash,
    prevHash: entry.prevHash,
    timestamp: entry.ts
  });

  writeDb(db);
  return entry;
}

// Helper: Log an activity to the audit trail (with ledger sync)
export function logAudit(userId, action, details, ipAddress = "127.0.0.1") {
  return recordLedgerAction(userId, action, { details, ipAddress });
}

// Helper: Send notification
export function sendNotification(userId, title, message, type = "Portal", channel = "Multi-Channel") {
  const db = readDb();
  const notification = {
    id: `not_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    userId,
    title,
    message,
    type,
    channel,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  db.notifications.unshift(notification);
  writeDb(db);
  console.log(`[Notification to ${userId}] [${channel}] - ${title}: ${message}`);
  return notification;
}
