import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { readDb, writeDb, logAudit, recordLedgerAction, sendNotification } from './db.js';
import { defaultSchemeRules, computeScore } from './services/scoring.js';
import { createLedgerEntry, verifyLedgerChain, GENESIS_PREV_HASH } from './services/auditLedger.js';
import { generateAllotmentLetter, verifyLetterSignature } from './services/qrLetter.js';
import { processChatMessage } from './services/aiChatbot.js';
import { processExpiredOffers, getOfferTimeRemaining, DEFAULT_SLA_HOURS } from './services/slaPromotion.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Helper to get current database state
const getDb = () => readDb();

// ----------------------------------------------------
// AUTH & USER ENDPOINTS
// ----------------------------------------------------

// List users (For simulation switcher in UI)
router.get('/auth/users', (req, res) => {
  const db = getDb();
  res.json(db.users);
});

// Login validation
router.post('/auth/login', (req, res) => {
  const { mobile, password } = req.body;
  if (!mobile || !password) {
    return res.status(400).json({ error: "Mobile/Email and password are required" });
  }
  const db = getDb();
  const user = db.users.find(u => u.mobile === mobile || u.email === mobile);
  
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid credentials. Please verify your mobile/email and password." });
  }

  logAudit(user.id, "USER_LOGIN", `User logged in securely using password`);
  res.json({ token: `mock-jwt-${user.id}`, user });
});

// Self-registration (Supports registering as Applicant, Officer, or Admin)
router.post('/auth/register', (req, res) => {
  const { name, mobile, email, password, role } = req.body;
  if (!name || !mobile || !email || !password) {
    return res.status(400).json({ error: "Name, Mobile, Email, and Password are required" });
  }

  const db = getDb();
  const existingUser = db.users.find(u => u.mobile === mobile || u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: "User with this mobile or email already exists" });
  }

  const targetRole = role || "Applicant";

  const newUser = {
    id: `usr_${Date.now()}`,
    name,
    mobile,
    email,
    role: targetRole,
    password,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDb(db);
  logAudit(newUser.id, "USER_REGISTRATION", `User registered securely as ${targetRole} with mobile ${mobile}`);

  res.json({ token: `mock-jwt-${newUser.id}`, user: newUser });
});

// Get user profile
router.get('/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer mock-jwt-')) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const userId = authHeader.replace('Bearer mock-jwt-', '');
  const db = getDb();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json(user);
});

// Admin-only user creation (Add new Admins / Officers)
router.post('/auth/create-user', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const adminId = authHeader.replace('Bearer mock-jwt-', '');

  const db = getDb();
  const adminUser = db.users.find(u => u.id === adminId);
  if (!adminUser || !["System Administrator", "Super Admin"].includes(adminUser.role)) {
    return res.status(403).json({ error: "Access Denied: Only administrators can register staff." });
  }

  const { name, mobile, email, password, role } = req.body;
  if (!name || !mobile || !email || !password || !role) {
    return res.status(400).json({ error: "Name, Mobile, Email, Password, and Role are required." });
  }

  const existingUser = db.users.find(u => u.mobile === mobile || u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: "A user with this mobile number or email already exists." });
  }

  const newUser = {
    id: `usr_${Date.now()}`,
    name,
    mobile,
    email,
    role,
    password,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDb(db);
  logAudit(adminId, "STAFF_CREATION", `Administrator created staff account: ${name} with role: ${role}`);

  res.status(201).json({ success: true, user: newUser });
});

// ----------------------------------------------------
// HOUSING SCHEME ENDPOINTS & SCORING RULES
// ----------------------------------------------------

// Get all schemes
router.get('/schemes', (req, res) => {
  const db = getDb();
  res.json(db.schemes);
});

// Get scheme details including unit breakdown
router.get('/schemes/:id', (req, res) => {
  const db = getDb();
  const scheme = db.schemes.find(s => s.id === req.params.id);
  if (!scheme) return res.status(404).json({ error: "Scheme not found" });
  
  const units = db.units.filter(u => u.schemeId === scheme.id);
  res.json({ ...scheme, units });
});

// Create scheme
router.post('/schemes', (req, res) => {
  const { name, code, location, district, type, unitsCount, reservationRules, incomeLimit, startDate, endDate, allotmentDate, waitlistRules, rules } = req.body;
  const authHeader = req.headers.authorization;
  const userId = authHeader ? authHeader.replace('Bearer mock-jwt-', '') : 'usr_admin';

  if (!name || !code || !unitsCount) {
    return res.status(400).json({ error: "Name, Code, and Units Count are required" });
  }

  const db = getDb();
  const schemeId = `sch_${Date.now()}`;
  const newScheme = {
    id: schemeId,
    name,
    code,
    location: location || "TBD",
    district: district || "State",
    type: type || "2BHK",
    unitsCount: parseInt(unitsCount),
    reservationRules: reservationRules || { scst: 15, bc: 25, ph: 5, ex: 5, general: 50 },
    rules: rules || defaultSchemeRules,
    ruleVersion: 1,
    incomeLimit: parseInt(incomeLimit) || 1000000,
    startDate: startDate || new Date().toISOString().split('T')[0],
    endDate: endDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
    allotmentDate: allotmentDate || new Date(Date.now() + 45*24*60*60*1000).toISOString().split('T')[0],
    waitlistRules: waitlistRules || { maxWaitlistPercent: 100 },
    status: "Active"
  };

  db.schemes.push(newScheme);

  // Generate housing units dynamically
  for (let i = 1; i <= newScheme.unitsCount; i++) {
    db.units.push({
      id: `unt_${schemeId.split('_')[1]}_${i}`,
      schemeId: newScheme.id,
      block: i <= newScheme.unitsCount / 2 ? "Block A" : "Block B",
      unitNumber: `${i <= newScheme.unitsCount / 2 ? 'A' : 'B'}-${100 + i}`,
      status: "vacant",
      allottedTo: null
    });
  }

  writeDb(db);
  recordLedgerAction(userId, "SCHEME_CREATE", { schemeId: newScheme.id, name, code, unitsCount: newScheme.unitsCount });
  res.status(201).json(newScheme);
});

// FEATURE 1: Get scoring rules for a scheme
router.get('/schemes/:id/rules', (req, res) => {
  const db = getDb();
  const scheme = db.schemes.find(s => s.id === req.params.id);
  if (!scheme) return res.status(404).json({ error: "Scheme not found" });

  res.json({
    schemeId: scheme.id,
    schemeName: scheme.name,
    ruleVersion: scheme.ruleVersion || 1,
    rules: scheme.rules || defaultSchemeRules
  });
});

// FEATURE 1: Admin save/update scoring rules for a scheme
router.post('/schemes/:id/rules', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const adminId = authHeader.replace('Bearer mock-jwt-', '');

  const { rules } = req.body;
  if (!Array.isArray(rules)) {
    return res.status(400).json({ error: "Rules must be an array of rule definitions" });
  }

  const db = getDb();
  const scheme = db.schemes.find(s => s.id === req.params.id);
  if (!scheme) return res.status(404).json({ error: "Scheme not found" });

  const oldVersion = scheme.ruleVersion || 1;
  const newVersion = oldVersion + 1;

  scheme.rules = rules;
  scheme.ruleVersion = newVersion;

  // Re-score active un-allotted applications under this scheme
  const schemeApps = db.applications.filter(a => a.schemeId === scheme.id && a.status !== "Rejected" && a.status !== "Cancelled");
  let rescoreCount = 0;
  schemeApps.forEach(app => {
    const scored = computeScore(app, scheme.rules);
    app.score = scored.totalScore;
    app.scoreBreakdown = scored.breakdown;
    app.ruleVersion = newVersion;
    rescoreCount++;
  });

  writeDb(db);

  // Write immutable block to Hash Chain Ledger
  const ledgerBlock = recordLedgerAction(adminId, "SCHEME_RULES_UPDATED", {
    schemeId: scheme.id,
    schemeName: scheme.name,
    previousVersion: oldVersion,
    newVersion,
    ruleCount: rules.length,
    applicationsRescored: rescoreCount
  });

  res.json({
    success: true,
    schemeId: scheme.id,
    ruleVersion: newVersion,
    rescoreCount,
    ledgerHash: ledgerBlock.hash,
    message: `Scoring rules updated to Version ${newVersion}. Recalculated scores for ${rescoreCount} applicants.`
  });
});

// FEATURE 1: Simulate scoring for hypothetical applicant
router.post('/schemes/:id/rules/simulate', (req, res) => {
  const { sampleApplicant, customRules } = req.body;
  const db = getDb();
  const scheme = db.schemes.find(s => s.id === req.params.id);
  const rules = customRules || scheme?.rules || defaultSchemeRules;

  const result = computeScore(sampleApplicant || {}, rules);
  res.json(result);
});

// ----------------------------------------------------
// APPLICATION ENDPOINTS
// ----------------------------------------------------

// Get applications
router.get('/applications', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const userId = authHeader.replace('Bearer mock-jwt-', '');
  
  const db = getDb();
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (user.role === "Applicant") {
    const userApps = db.applications.filter(a => a.userId === userId);
    return res.json(userApps);
  } else {
    return res.json(db.applications);
  }
});

// Create draft application
router.post('/applications', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const userId = authHeader.replace('Bearer mock-jwt-', '');
  
  const { schemeId, personalDetails, income, category, reservationClaims } = req.body;
  if (!schemeId) return res.status(400).json({ error: "Scheme ID is required" });

  const db = getDb();
  const scheme = db.schemes.find(s => s.id === schemeId);
  if (!scheme) return res.status(404).json({ error: "Scheme not found" });

  const existingApp = db.applications.find(a => a.userId === userId && a.schemeId === schemeId && a.status !== 'Rejected' && a.status !== 'Cancelled');
  if (existingApp) {
    return res.status(400).json({ error: "You already have an active application for this scheme" });
  }

  const rawApp = {
    schemeId,
    personalDetails: personalDetails || {},
    income: parseInt(income) || 0,
    category: category || "General",
    reservationClaims: reservationClaims || { ph: false, ex: false }
  };

  // Compute transparent priority score upfront
  const scoreResult = computeScore(rawApp, scheme.rules || defaultSchemeRules);

  const newApp = {
    id: `app_${Date.now()}`,
    schemeId,
    schemeName: scheme.name,
    schemeCode: scheme.code,
    userId,
    personalDetails: personalDetails || {},
    income: parseInt(income) || 0,
    category: category || "General",
    reservationClaims: reservationClaims || { ph: false, ex: false },
    score: scoreResult.totalScore,
    scoreBreakdown: scoreResult.breakdown,
    ruleVersion: scheme.ruleVersion || 1,
    documents: [],
    status: "Draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.applications.push(newApp);
  writeDb(db);
  recordLedgerAction(userId, "APPLICATION_DRAFT_CREATE", { applicationId: newApp.id, schemeId, initialScore: newApp.score });
  res.status(201).json(newApp);
});

// Edit / Submit application
router.put('/applications/:id', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const userId = authHeader.replace('Bearer mock-jwt-', '');
  
  const { personalDetails, income, category, reservationClaims, action } = req.body;
  const db = getDb();
  
  const app = db.applications.find(a => a.id === req.params.id);
  if (!app) return res.status(404).json({ error: "Application not found" });
  
  if (app.userId !== userId && !["System Administrator", "Super Admin"].includes(db.users.find(u => u.id === userId)?.role)) {
    return res.status(403).json({ error: "Access Denied" });
  }

  if (personalDetails) app.personalDetails = personalDetails;
  if (income !== undefined) app.income = parseInt(income);
  if (category) app.category = category;
  if (reservationClaims) app.reservationClaims = reservationClaims;

  const scheme = db.schemes.find(s => s.id === app.schemeId);
  // Recompute score dynamically
  const scored = computeScore(app, scheme?.rules || defaultSchemeRules);
  app.score = scored.totalScore;
  app.scoreBreakdown = scored.breakdown;
  app.ruleVersion = scheme?.ruleVersion || 1;
  app.updatedAt = new Date().toISOString();

  if (action === "submit") {
    if (app.income > scheme.incomeLimit) {
      app.status = "Rejected";
      app.rejectionReason = `Income exceeded limit of Rs. ${scheme.incomeLimit}`;
      sendNotification(userId, "Application Rejected", `Your application for ${scheme.name} was rejected because income limits were exceeded.`, "Portal");
      recordLedgerAction(userId, "APPLICATION_AUTO_REJECTED", { applicationId: app.id, reason: app.rejectionReason });
    } else {
      app.status = "Payment Pending";
      sendNotification(userId, "Application Submitted", `Application submitted successfully for ${scheme.name}. Priority score computed: ${app.score} pts.`, "Portal");
      recordLedgerAction(userId, "APPLICATION_SUBMITTED", { applicationId: app.id, score: app.score });
    }
  }

  writeDb(db);
  res.json(app);
});

// Mock Document Upload
router.post('/applications/:id/documents', upload.single('file'), (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const userId = authHeader.replace('Bearer mock-jwt-', '');

  const { docType } = req.body;
  if (!docType) return res.status(400).json({ error: "Document type is required" });

  const db = getDb();
  const app = db.applications.find(a => a.id === req.params.id);
  if (!app) return res.status(404).json({ error: "Application not found" });

  const docName = req.file ? req.file.originalname : `${docType}_proof.pdf`;
  const docPath = req.file ? req.file.path : `uploads/mock_${docType}.pdf`;

  const existingDocIdx = app.documents.findIndex(d => d.type === docType);
  const docData = {
    type: docType,
    name: docName,
    path: docPath,
    status: "Pending",
    remarks: ""
  };

  if (existingDocIdx > -1) {
    app.documents[existingDocIdx] = docData;
  } else {
    app.documents.push(docData);
  }

  app.updatedAt = new Date().toISOString();
  writeDb(db);
  recordLedgerAction(userId, "DOCUMENT_UPLOAD", { applicationId: app.id, docType, docName });
  res.json(app);
});

// Simulated Payment
router.post('/applications/:id/pay', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const userId = authHeader.replace('Bearer mock-jwt-', '');

  const { amount, paymentType } = req.body;
  if (!amount || !paymentType) {
    return res.status(400).json({ error: "Amount and Payment Type are required" });
  }

  const db = getDb();
  const app = db.applications.find(a => a.id === req.params.id);
  if (!app) return res.status(404).json({ error: "Application not found" });

  const paymentId = `pay_${Date.now()}`;
  const transactionId = `TXN${Math.floor(100000000 + Math.random() * 900000000)}`;

  const newPayment = {
    id: paymentId,
    applicationId: app.id,
    schemeId: app.schemeId,
    userId,
    amount: parseFloat(amount),
    type: paymentType,
    status: "Success",
    transactionId,
    createdAt: new Date().toISOString()
  };

  db.payments.push(newPayment);

  if (paymentType === "Application Fee") {
    app.status = "Payment Verified";
    sendNotification(userId, "Payment Successful", `Fee payment of Rs. ${amount} verified. Your application is now in Document Verification.`, "Portal");
  } else if (paymentType === "Booking Amount") {
    app.status = "Completed";
    if (app.allottedUnitId) {
      const unit = db.units.find(u => u.id === app.allottedUnitId);
      if (unit) unit.status = "occupied";
    }
    sendNotification(userId, "Possession Initialized", `Booking amount verified. House agreement finalized! Allotment cycle completed.`, "Portal");
  }

  app.updatedAt = new Date().toISOString();
  writeDb(db);
  recordLedgerAction(userId, "PAYMENT_SUCCESS", { applicationId: app.id, amount, paymentType, transactionId });
  res.json({ app, payment: newPayment });
});

// ----------------------------------------------------
// DOCUMENT VERIFICATION (OFFICER)
// ----------------------------------------------------

router.get('/verification/queue', (req, res) => {
  const db = getDb();
  const queue = db.applications.filter(a => a.status === "Payment Verified" || a.status === "Document Verification");
  res.json(queue);
});

router.post('/verification/action', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const officerId = authHeader.replace('Bearer mock-jwt-', '');

  const { applicationId, status, remarks, documentStatus } = req.body; 

  if (!applicationId || !status) {
    return res.status(400).json({ error: "Application ID and Status are required" });
  }

  const db = getDb();
  const app = db.applications.find(a => a.id === applicationId);
  if (!app) return res.status(404).json({ error: "Application not found" });

  if (documentStatus && app.documents) {
    app.documents.forEach(doc => {
      if (documentStatus[doc.type]) {
        doc.status = documentStatus[doc.type];
        doc.remarks = remarks;
      }
    });
  }

  if (status === "Verified") {
    app.status = "Eligible";
    
    // Automatically recompute verified priority score
    const scheme = db.schemes.find(s => s.id === app.schemeId);
    const scored = computeScore(app, scheme?.rules || defaultSchemeRules);
    app.score = scored.totalScore;
    app.scoreBreakdown = scored.breakdown;
    app.ruleVersion = scheme?.ruleVersion || 1;

    sendNotification(app.userId, "Documents Verified", `Your documents are verified and you are ELIGIBLE! Priority Score: ${app.score} points.`, "Portal");
    recordLedgerAction(officerId, "DOCUMENTS_VERIFIED", { applicationId: app.id, score: app.score, ruleVersion: app.ruleVersion });
  } else if (status === "Clarification Required") {
    app.status = "Document Verification";
    sendNotification(app.userId, "Clarification Needed", `Verification officer requested clarifications on documents. Remarks: ${remarks}`, "Portal");
    recordLedgerAction(officerId, "DOCUMENTS_CLARIFICATION", { applicationId: app.id, remarks });
  } else {
    app.status = "Rejected";
    app.rejectionReason = remarks || "Document verification failed";
    sendNotification(app.userId, "Application Rejected", `Your application was rejected during document verification. Reason: ${app.rejectionReason}`, "Portal");
    recordLedgerAction(officerId, "DOCUMENTS_REJECTED", { applicationId: app.id, reason: remarks });
  }

  app.updatedAt = new Date().toISOString();

  db.verifications.push({
    id: `ver_${Date.now()}`,
    applicationId,
    officerId,
    status,
    remarks,
    createdAt: new Date().toISOString()
  });

  writeDb(db);
  res.json(app);
});

// ----------------------------------------------------
// FINANCE OFFICER ENDPOINTS
// ----------------------------------------------------

router.get('/finance/payments', (req, res) => {
  const db = getDb();
  res.json(db.payments);
});

router.post('/finance/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const officerId = authHeader.replace('Bearer mock-jwt-', '');

  const { paymentId, status } = req.body;
  if (!paymentId || !status) return res.status(400).json({ error: "Payment ID and Status are required" });

  const db = getDb();
  const payment = db.payments.find(p => p.id === paymentId);
  if (!payment) return res.status(404).json({ error: "Payment not found" });

  payment.status = status;
  const app = db.applications.find(a => a.id === payment.applicationId);

  if (status === "Verified") {
    if (app && payment.type === "Application Fee") {
      app.status = "Payment Verified";
      sendNotification(app.userId, "Payment Verified Manually", `Finance team has verified your application fee payment.`, "Portal");
    } else if (app && payment.type === "Booking Amount") {
      app.status = "Completed";
      if (app.allottedUnitId) {
        const unit = db.units.find(u => u.id === app.allottedUnitId);
        if (unit) unit.status = "occupied";
      }
      sendNotification(app.userId, "Agreement Finalized", `Booking amount verified. House agreement finalized! Allotment cycle completed.`, "Portal");
    }
  } else {
    if (app) {
      app.status = "Payment Pending";
      sendNotification(app.userId, "Payment Verification Failed", `Your payment transaction failed verification. Please re-try paying.`, "Portal");
    }
  }

  writeDb(db);
  recordLedgerAction(officerId, "PAYMENT_MANUAL_VERIFY", { paymentId, status, applicationId: app?.id });
  res.json({ payment, app });
});

// ----------------------------------------------------
// FEATURE 1 & 2 & 7: ALLOTMENT ENGINE (PRIORITY SCORE + TIE BREAKERS + SLA OFFERS)
// ----------------------------------------------------

router.post('/allotment/execute', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const officerId = authHeader.replace('Bearer mock-jwt-', '');

  const { schemeId, offerDurationHours } = req.body;
  if (!schemeId) return res.status(400).json({ error: "Scheme ID is required" });

  const db = getDb();
  const scheme = db.schemes.find(s => s.id === schemeId);
  if (!scheme) return res.status(404).json({ error: "Scheme not found" });

  const eligibleApps = db.applications.filter(a => a.schemeId === schemeId && a.status === "Eligible");
  if (eligibleApps.length === 0) {
    return res.status(400).json({ error: "No eligible applicants in pool for this scheme." });
  }

  const vacantUnits = db.units.filter(u => u.schemeId === schemeId && u.status === "vacant");
  if (vacantUnits.length === 0) {
    return res.status(400).json({ error: "No vacant housing units available for allotment in this scheme." });
  }

  // 1. Re-evaluate / ensure priority score for every eligible applicant
  eligibleApps.forEach(app => {
    if (app.score === undefined) {
      const scored = computeScore(app, scheme.rules || defaultSchemeRules);
      app.score = scored.totalScore;
      app.scoreBreakdown = scored.breakdown;
      app.ruleVersion = scheme.ruleVersion || 1;
    }
  });

  // 2. Deterministic, transparent ranking:
  // Primary Sort: Score DESC
  // Tie-breaker: Submission timestamp (createdAt) ASC
  // Secondary Tie-breaker: Application ID
  const rankedApplicants = [...eligibleApps].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return a.id.localeCompare(b.id);
  });

  // 3. Quota distribution
  const totalUnits = vacantUnits.length;
  const scstQuota = Math.round(totalUnits * (scheme.reservationRules.scst / 100)) || 0;
  const bcQuota = Math.round(totalUnits * (scheme.reservationRules.bc / 100)) || 0;
  const phQuota = Math.round(totalUnits * (scheme.reservationRules.ph / 100)) || 0;
  const exQuota = Math.round(totalUnits * (scheme.reservationRules.ex / 100)) || 0;

  const reservedCategoryCounts = { scst: scstQuota, bc: bcQuota, ph: phQuota, ex: exQuota };
  const allottedList = [];
  const waitlistList = [];
  let unitIndex = 0;
  const assignedUserIds = new Set();

  const slaHours = parseInt(offerDurationHours) || DEFAULT_SLA_HOURS;
  const now = new Date();
  const offerDeadline = new Date(now.getTime() + slaHours * 3600 * 1000).toISOString();

  // Helper to allot a unit with SLA deadline
  const assignUnit = (applicant, reason) => {
    if (unitIndex >= vacantUnits.length) return false;
    const unit = vacantUnits[unitIndex];
    unit.status = "allotted";
    unit.allottedTo = applicant.userId;
    
    applicant.status = "Allotted";
    applicant.allottedUnitId = unit.id;
    applicant.allotmentReason = reason;
    applicant.allottedDate = now.toISOString();

    // SLA Offer Timers
    applicant.offerStatus = "Offered";
    applicant.offerIssuedAt = now.toISOString();
    applicant.offerExpiresAt = offerDeadline;

    assignedUserIds.add(applicant.userId);
    allottedList.push(applicant);
    unitIndex++;
    
    sendNotification(
      applicant.userId,
      "⚡ House Allotted! Offer Issued",
      `Congratulations! You have been allotted Unit ${unit.unitNumber} (${unit.block}) in ${scheme.name} with score ${applicant.score} pts. You have ${slaHours} hours to accept this offer!`,
      "Portal",
      "Multi-Channel"
    );
    return true;
  };

  // Assign Quotas according to top scores in each category
  // PH
  const phApplicants = rankedApplicants.filter(a => a.reservationClaims?.ph && !assignedUserIds.has(a.userId));
  let phCount = 0;
  phApplicants.forEach(app => {
    if (phCount < reservedCategoryCounts.ph) {
      if (assignUnit(app, `PH Priority Quota (Score: ${app.score})`)) phCount++;
    }
  });

  // Defense / Ex
  const exApplicants = rankedApplicants.filter(a => a.reservationClaims?.ex && !assignedUserIds.has(a.userId));
  let exCount = 0;
  exApplicants.forEach(app => {
    if (exCount < reservedCategoryCounts.ex) {
      if (assignUnit(app, `Ex-Servicemen Quota (Score: ${app.score})`)) exCount++;
    }
  });

  // SC/ST
  const scstApplicants = rankedApplicants.filter(a => a.category === "SC/ST" && !assignedUserIds.has(a.userId));
  let scstCount = 0;
  scstApplicants.forEach(app => {
    if (scstCount < reservedCategoryCounts.scst) {
      if (assignUnit(app, `SC/ST Quota (Score: ${app.score})`)) scstCount++;
    }
  });

  // BC
  const bcApplicants = rankedApplicants.filter(a => a.category === "BC" && !assignedUserIds.has(a.userId));
  let bcCount = 0;
  bcApplicants.forEach(app => {
    if (bcCount < reservedCategoryCounts.bc) {
      if (assignUnit(app, `BC Quota (Score: ${app.score})`)) bcCount++;
    }
  });

  // General Pool for remaining applicants
  const remainingApplicants = rankedApplicants.filter(a => !assignedUserIds.has(a.userId));
  remainingApplicants.forEach(app => {
    if (unitIndex < vacantUnits.length) {
      assignUnit(app, `General Merit Pool (Score: ${app.score})`);
    } else {
      waitlistList.push(app);
    }
  });

  // Assign sequential waitlist ranks based on score descending
  waitlistList.forEach((app, idx) => {
    const rank = idx + 1;
    const rankStr = `WL-${String(rank).padStart(3, '0')}`;
    app.status = "Waitlisted";
    app.waitlistRank = rankStr;
    app.originalWaitlistRank = rankStr;
    
    // Clean old waitlist entry if any
    db.waitlists = db.waitlists.filter(w => w.applicationId !== app.id);

    db.waitlists.push({
      id: `wl_${Date.now()}_${idx}`,
      schemeId,
      applicationId: app.id,
      userId: app.userId,
      originalRank: rank,
      currentRank: rank,
      score: app.score,
      status: "Active",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    });

    sendNotification(
      app.userId,
      "Placed on Explainable Waitlist",
      `You are at rank ${rankStr} (Score: ${app.score} pts) for ${scheme.name}. Track your wait-time estimate on your dashboard.`,
      "Portal",
      "Multi-Channel"
    );
  });

  const allotmentTraceId = `alt_${Date.now()}`;
  db.allotments.push({
    id: allotmentTraceId,
    schemeId,
    allottedCount: allottedList.length,
    waitlistCount: waitlistList.length,
    officerId,
    offerDeadline,
    createdAt: now.toISOString()
  });

  scheme.status = "Allotment Completed";
  writeDb(db);

  // Write immutable block to Hash Chain Ledger
  const ledgerBlock = recordLedgerAction(officerId, "ALLOTMENT_EXECUTE", {
    allotmentId: allotmentTraceId,
    schemeId,
    schemeName: scheme.name,
    allottedCount: allottedList.length,
    waitlistCount: waitlistList.length,
    topScore: rankedApplicants[0]?.score || 0,
    offerDeadline
  });

  res.json({
    message: "Transparent allotment executed successfully with rule-based priority scoring.",
    allotmentId: allotmentTraceId,
    ledgerHash: ledgerBlock.hash,
    allottedCount: allottedList.length,
    waitlistCount: waitlistList.length,
    allotted: allottedList.map(a => ({ id: a.id, name: a.personalDetails?.fullName, score: a.score, unitId: a.allottedUnitId, reason: a.allotmentReason, offerExpiresAt: a.offerExpiresAt })),
    waitlist: waitlistList.map(a => ({ id: a.id, name: a.personalDetails?.fullName, score: a.score, rank: a.waitlistRank }))
  });
});

// FEATURE 2: Explainable Waitlist Status with ETA and Score Breakdown
router.get('/applications/:id/waitlist-status', (req, res) => {
  const db = getDb();
  const app = db.applications.find(a => a.id === req.params.id);
  if (!app) return res.status(404).json({ error: "Application not found" });

  const scheme = db.schemes.find(s => s.id === app.schemeId);
  const isWaitlisted = app.status === "Waitlisted";

  // Calculate position in current waitlist
  const activeSchemeWl = db.waitlists
    .filter(w => w.schemeId === app.schemeId && w.status === "Active")
    .sort((a, b) => a.currentRank - b.currentRank);

  const myWlRecord = activeSchemeWl.find(w => w.applicationId === app.id);
  const currentRank = myWlRecord ? myWlRecord.currentRank : (app.waitlistRank ? parseInt(app.waitlistRank.replace(/\D/g, '')) : null);
  const ahead = currentRank ? Math.max(0, currentRank - 1) : 0;
  const totalWaitlisted = activeSchemeWl.length;

  // Calculate historical monthly vacancies/turnover
  const schemeVacancies = (db.vacancies || []).filter(v => v.schemeId === app.schemeId);
  const vacancyRate = schemeVacancies.length > 0 ? Math.max(schemeVacancies.length * 0.8, 1.2) : 1.5;

  let etaMonthsMin = 0;
  let etaMonthsMax = 0;
  let formattedEta = "Not applicable";
  let confidence = "Preliminary";

  if (isWaitlisted && currentRank) {
    const rawEta = ahead / Math.max(vacancyRate, 0.5);
    etaMonthsMin = Math.max(1, Math.floor(rawEta * 0.8));
    etaMonthsMax = Math.max(2, Math.ceil(rawEta * 1.3));
    formattedEta = `about ${etaMonthsMin} to ${etaMonthsMax} months`;
    confidence = schemeVacancies.length >= 5 ? "High" : (schemeVacancies.length >= 2 ? "Moderate" : "Preliminary");
  }

  res.json({
    applicationId: app.id,
    schemeName: scheme?.name || app.schemeName,
    schemeCode: scheme?.code || app.schemeCode,
    status: app.status,
    isWaitlisted,
    rank: app.waitlistRank || (currentRank ? `WL-${String(currentRank).padStart(3, '0')}` : null),
    numericalRank: currentRank,
    ahead,
    totalWaitlisted,
    score: app.score || 0,
    scoreBreakdown: app.scoreBreakdown || [],
    ruleVersion: app.ruleVersion || scheme?.ruleVersion || 1,
    eta: {
      minMonths: etaMonthsMin,
      maxMonths: etaMonthsMax,
      formatted: formattedEta,
      confidence,
      estimatedMonthlyTurnover: vacancyRate.toFixed(1)
    },
    disclaimer: "Estimated wait time is indicative based on recent vacancy and surrender rates. Rank moves up strictly when allotted units are surrendered or offers expire."
  });
});

// ----------------------------------------------------
// FEATURE 7: AUTO-PROMOTION & SLA TIMERS
// ----------------------------------------------------

// Check and expire overdue offers across all schemes
router.post('/allotments/check-sla', (req, res) => {
  const db = getDb();
  const promotions = processExpiredOffers(db);
  writeDb(db);

  res.json({
    success: true,
    promotionsCount: promotions.length,
    promotions,
    message: promotions.length > 0 
      ? `Processed SLA expiration: ${promotions.length} offers expired and auto-promotions executed.`
      : "All active allotment offers are within their valid SLA timer window."
  });
});

// Applicant responds to allotment offer (Accept or Decline)
router.post('/allotments/:id/respond', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const userId = authHeader.replace('Bearer mock-jwt-', '');

  const { action } = req.body; // "accept" | "decline"
  if (!action || !["accept", "decline"].includes(action)) {
    return res.status(400).json({ error: "Action must be 'accept' or 'decline'" });
  }

  const db = getDb();
  const app = db.applications.find(a => a.id === req.params.id);
  if (!app) return res.status(404).json({ error: "Application not found" });

  if (app.userId !== userId && !["System Administrator", "Super Admin"].includes(db.users.find(u => u.id === userId)?.role)) {
    return res.status(403).json({ error: "Access denied" });
  }

  if (app.status !== "Allotted") {
    return res.status(400).json({ error: `Cannot respond to offer in '${app.status}' status.` });
  }

  const unit = db.units.find(u => u.id === app.allottedUnitId);
  const scheme = db.schemes.find(s => s.id === app.schemeId);

  if (action === "accept") {
    app.offerStatus = "Accepted";
    app.offerAcceptedAt = new Date().toISOString();
    sendNotification(userId, "Offer Accepted", `You accepted the offer for Unit ${unit?.unitNumber || ''}. Next step: Pay the booking amount to finalize agreement.`, "Portal");
    recordLedgerAction(userId, "OFFER_ACCEPTED", { applicationId: app.id, unitId: unit?.id });
    writeDb(db);
    return res.json({ success: true, message: "Offer accepted! Please complete booking payment.", app });
  }

  if (action === "decline") {
    app.offerStatus = "Declined";
    app.status = "Offer Declined";
    app.allottedUnitId = null;
    app.offerDeclinedAt = new Date().toISOString();

    if (unit) {
      unit.status = "vacant";
      unit.allottedTo = null;
    }

    sendNotification(userId, "Offer Declined", `You declined the allotment offer for Unit ${unit?.unitNumber || ''}. The unit has been reassigned to the waitlist.`, "Portal");
    recordLedgerAction(userId, "OFFER_DECLINED", { applicationId: app.id, unitId: unit?.id });

    // Instantly promote next in waitlist
    let promotedApp = null;
    const waitlistQueue = db.waitlists
      .filter(wl => wl.schemeId === app.schemeId && wl.status === "Active")
      .sort((a, b) => a.currentRank - b.currentRank);

    if (waitlistQueue.length > 0 && unit) {
      const nextCandidateRecord = waitlistQueue[0];
      const nextCandidate = db.applications.find(a => a.id === nextCandidateRecord.applicationId);

      if (nextCandidate) {
        const offerDeadline = new Date(Date.now() + DEFAULT_SLA_HOURS * 3600 * 1000).toISOString();
        nextCandidate.status = "Allotted";
        nextCandidate.allottedUnitId = unit.id;
        nextCandidate.allotmentReason = `Auto-Promotion (Offer Declined by WL predecessor)`;
        nextCandidate.allottedDate = new Date().toISOString();
        nextCandidate.waitlistRank = null;
        nextCandidate.offerStatus = "Offered";
        nextCandidate.offerIssuedAt = new Date().toISOString();
        nextCandidate.offerExpiresAt = offerDeadline;

        unit.status = "allotted";
        unit.allottedTo = nextCandidate.userId;

        nextCandidateRecord.status = "Promoted";
        nextCandidateRecord.promotionUnitId = unit.id;

        // Shift ranks
        const remainingWl = db.waitlists.filter(wl => wl.schemeId === app.schemeId && wl.status === "Active" && wl.id !== nextCandidateRecord.id);
        remainingWl.forEach(wl => {
          wl.currentRank = wl.currentRank - 1;
          const rApp = db.applications.find(a => a.id === wl.applicationId);
          if (rApp) rApp.waitlistRank = `WL-${String(wl.currentRank).padStart(3, '0')}`;
        });

        recordLedgerAction("SYSTEM_SLA_DAEMON", "AUTO_PROMOTION_SUCCESS", {
          promotedApplicationId: nextCandidate.id,
          unitId: unit.id,
          reason: "Prior applicant declined"
        });

        sendNotification(
          nextCandidate.userId,
          "⚡ Instant Auto-Promotion!",
          `Unit ${unit.unitNumber} became available and has been allotted to you! You have 72 hours to accept.`,
          "Portal",
          "Multi-Channel"
        );
        promotedApp = nextCandidate;
      }
    }

    writeDb(db);
    return res.json({
      success: true,
      message: "Offer declined. Next waitlisted applicant has been auto-promoted.",
      promotedApplicant: promotedApp?.personalDetails?.fullName || null,
      app
    });
  }
});

// Fast-forward simulation: simulate offer deadline expiry for demonstration
router.post('/allotments/:id/simulate-expire', (req, res) => {
  const db = getDb();
  const app = db.applications.find(a => a.id === req.params.id);
  if (!app) return res.status(404).json({ error: "Application not found" });

  if (app.status !== "Allotted") {
    return res.status(400).json({ error: "Application is not in 'Allotted' status." });
  }

  // Set expiration to 10 seconds ago
  app.offerExpiresAt = new Date(Date.now() - 10000).toISOString();
  writeDb(db);

  // Run the SLA processor
  const promotions = processExpiredOffers(db);
  writeDb(db);

  res.json({
    success: true,
    message: "Offer timer expired artificially and auto-promotion sequence executed!",
    promotions
  });
});

// ----------------------------------------------------
// FEATURE 4: TAMPER-EVIDENT CRYPTOGRAPHIC HASH CHAIN AUDIT LEDGER
// ----------------------------------------------------

// Get complete ledger chain
router.get('/audit/ledger', (req, res) => {
  const db = getDb();
  const ledger = db.audit_ledger || [];
  res.json(ledger);
});

// Run full chain verification
router.get('/audit/ledger/verify', (req, res) => {
  const db = getDb();
  const ledger = db.audit_ledger || [];
  const verification = verifyLedgerChain(ledger);
  res.json(verification);
});

// DEMO HELPER: Simulate tampering in a specific block to demonstrate cryptographic detection
router.post('/audit/ledger/simulate-tamper', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  const { blockSeq, maliciousPayload } = req.body;
  const db = getDb();
  if (!db.audit_ledger || db.audit_ledger.length === 0) {
    return res.status(400).json({ error: "Ledger is empty" });
  }

  const targetSeq = parseInt(blockSeq) || Math.min(2, db.audit_ledger.length);
  const block = db.audit_ledger.find(b => b.seq === targetSeq);

  if (!block) {
    return res.status(404).json({ error: `Block sequence #${targetSeq} not found` });
  }

  // Store original for restoration if needed
  block.originalPayload = { ...block.payload };
  block.payload = maliciousPayload || {
    ...block.payload,
    tamperedBy: "Unauthorized Actor",
    fraudulentAllotment: true,
    bribeAmount: 500000
  };

  // Intentionally DO NOT recalculate the block hash or subsequent hashes
  // This breaks the cryptographic seal
  writeDb(db);

  res.json({
    success: true,
    tamperedSeq: targetSeq,
    message: `Block #${targetSeq} has been tampered with in the database! Run 'Verify Ledger Integrity' to see the SHA-256 chain detection pinpoint this exact block.`
  });
});

// DEMO HELPER: Repair / recompute hash chain after demo
router.post('/audit/ledger/repair', (req, res) => {
  const db = getDb();
  if (!db.audit_ledger || db.audit_ledger.length === 0) {
    return res.status(400).json({ error: "Ledger is empty" });
  }

  // Rebuild chain cryptographically from Genesis
  let prev = GENESIS_PREV_HASH;
  db.audit_ledger.forEach((block, idx) => {
    block.seq = idx + 1;
    block.prevHash = prev;
    delete block.originalPayload;
    if (block.payload?.tamperedBy) {
      delete block.payload.tamperedBy;
      delete block.payload.fraudulentAllotment;
      delete block.payload.bribeAmount;
    }
    block.canonicalData = JSON.stringify({
      seq: block.seq,
      actorId: block.actorId,
      action: block.action,
      payload: block.payload,
      ts: block.ts,
      prevHash: block.prevHash
    });
    block.hash = crypto.createHash('sha256').update(block.canonicalData).digest('hex');
    prev = block.hash;
  });

  writeDb(db);
  res.json({
    success: true,
    message: "Cryptographic hash chain completely repaired and re-sealed.",
    verification: verifyLedgerChain(db.audit_ledger)
  });
});

// Backward-compatible audit logs endpoint
router.get('/audit/logs', (req, res) => {
  const db = getDb();
  res.json(db.audit_logs);
});

// ----------------------------------------------------
// FEATURE 12: DIGITAL ALLOTMENT LETTER & HMAC QR VERIFICATION
// ----------------------------------------------------

// Generate Official Allotment Letter with secured QR Code
router.get('/allotments/:id/letter', async (req, res) => {
  const db = getDb();
  const allotmentId = req.params.id;

  // Find either by allotment ID or application ID
  let app = db.applications.find(a => a.id === allotmentId || a.allottedUnitId === allotmentId);
  if (!app) {
    const alt = db.allotments.find(a => a.id === allotmentId);
    if (alt) {
      app = db.applications.find(a => a.schemeId === alt.schemeId && (a.status === "Allotted" || a.status === "Completed"));
    }
  }

  if (!app) {
    return res.status(404).json({ error: "Allotment or Application record not found." });
  }

  const unit = db.units.find(u => u.id === app.allottedUnitId);
  const scheme = db.schemes.find(s => s.id === app.schemeId);
  const user = db.users.find(u => u.id === app.userId);
  const allotmentRecord = db.allotments.find(a => a.schemeId === app.schemeId) || { id: `alt_${app.id}`, createdAt: app.allottedDate };

  const baseUrl = req.headers.origin || "http://localhost:5173";
  const letterData = await generateAllotmentLetter(allotmentRecord, app, unit, scheme, user, baseUrl);

  recordLedgerAction(app.userId, "ALLOTMENT_LETTER_GENERATED", {
    applicationId: app.id,
    orderNumber: letterData.orderNumber,
    signature: letterData.signature
  });

  res.json(letterData);
});

// Public QR Code Verification endpoint (Open to banks, public, and officers)
router.get('/allotments/public-verify', (req, res) => {
  const { allotmentId, sig } = req.query;
  if (!allotmentId || !sig) {
    return res.status(400).json({ isValid: false, reason: "Missing allotment identifier or cryptographic signature." });
  }

  const db = getDb();
  // Find application associated with allotment
  const app = db.applications.find(a => a.id === allotmentId || `alt_${a.id}` === allotmentId || a.allottedUnitId === allotmentId);
  
  if (!app) {
    return res.status(404).json({ isValid: false, reason: "Allotment record does not exist in the official state database." });
  }

  const unit = db.units.find(u => u.id === app.allottedUnitId);
  const scheme = db.schemes.find(s => s.id === app.schemeId);
  const user = db.users.find(u => u.id === app.userId);
  const targetAllotmentId = allotmentId;
  const unitId = unit ? unit.id : (app.allottedUnitId || "unt_na");

  // Validate HMAC signature
  const isSigValid = verifyLetterSignature(targetAllotmentId, app.id, app.userId, unitId, sig);
  if (!isSigValid) {
    return res.status(401).json({
      isValid: false,
      reason: "Cryptographic signature mismatch! This document URL may have been forged or altered.",
      testedSignature: sig
    });
  }

  // Check current allotment status
  const isStillValid = (app.status === "Allotted" || app.status === "Completed") && app.offerStatus !== "Expired" && app.offerStatus !== "Declined";

  res.json({
    isValid: isStillValid,
    status: isStillValid ? "AUTHENTIC & ACTIVE" : `REVOKED (${app.status.toUpperCase()})`,
    orderNumber: `TNHB/ALLOT/2026/${app.id.replace('app_', '').toUpperCase()}`,
    applicantName: app.personalDetails?.fullName || user?.name || "Verified Citizen",
    maskedAadhaar: app.personalDetails?.aadhaar ? `XXXX-XXXX-${app.personalDetails.aadhaar.slice(-4)}` : "XXXX-XXXX-9999",
    schemeName: scheme?.name || app.schemeName,
    unitNumber: unit?.unitNumber || "Assigned",
    block: unit?.block || "Block A",
    category: app.allotmentReason || app.category,
    allottedDate: app.allottedDate,
    signatureVerified: true,
    verifiedAt: new Date().toISOString()
  });
});

// ----------------------------------------------------
// FEATURE 3: AI CHATBOT WITH BILINGUAL RAG (ENGLISH & TAMIL)
// ----------------------------------------------------

router.post('/chat', (req, res) => {
  const { message, language } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message content is required" });
  }

  const authHeader = req.headers.authorization;
  let user = null;
  let userApps = [];

  const db = getDb();
  if (authHeader && authHeader.startsWith('Bearer mock-jwt-')) {
    const userId = authHeader.replace('Bearer mock-jwt-', '');
    user = db.users.find(u => u.id === userId);
    if (user) {
      userApps = db.applications.filter(a => a.userId === userId);
    }
  }

  const response = processChatMessage(message, user, userApps, language);

  res.json({
    reply: response.reply,
    source: response.source,
    intent: response.intent,
    language: response.language,
    ticketOffered: Boolean(response.ticketOffered),
    applicationData: response.applicationData || null,
    createdAt: new Date().toISOString()
  });
});

// Raise support query / officer ticket via chatbot
router.post('/chat/ticket', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const userId = authHeader.replace('Bearer mock-jwt-', '');

  const { query, language } = req.body;
  const db = getDb();
  const user = db.users.find(u => u.id === userId);

  const ticketId = `tkt_${Date.now()}`;
  const ticket = {
    id: ticketId,
    userId,
    userName: user?.name || "Applicant",
    userMobile: user?.mobile || "N/A",
    query: query || "General inquiry",
    language: language || "en",
    status: "Pending Officer Review",
    createdAt: new Date().toISOString()
  };

  if (!db.chat_tickets) db.chat_tickets = [];
  db.chat_tickets.unshift(ticket);
  writeDb(db);

  sendNotification(userId, "Support Ticket Raised", `Your query #${ticketId} has been forwarded to an Allotment Officer. You will be contacted shortly.`, "Portal");
  recordLedgerAction(userId, "CHAT_TICKET_RAISED", { ticketId, query });

  res.json({ success: true, ticket });
});

// ----------------------------------------------------
// WAITLIST & VACANCY MANAGEMENT (SUPER ADMIN)
// ----------------------------------------------------

router.post('/vacancy/create', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const adminId = authHeader.replace('Bearer mock-jwt-', '');

  const { applicationId, reason } = req.body; 
  if (!applicationId) return res.status(400).json({ error: "Application ID is required" });

  const db = getDb();
  const app = db.applications.find(a => a.id === applicationId);
  if (!app) return res.status(404).json({ error: "Application not found" });
  if (app.status !== "Allotted" && app.status !== "Completed") {
    return res.status(400).json({ error: "Only allotted or completed applications can be cancelled to trigger a vacancy." });
  }

  const schemeId = app.schemeId;
  const unitId = app.allottedUnitId;
  const previousUserId = app.userId;

  app.status = "Cancelled";
  app.offerStatus = "Cancelled";
  app.allottedUnitId = null;
  app.cancellationReason = reason || "Manual cancellation";
  app.cancellationDate = new Date().toISOString();

  sendNotification(previousUserId, "Allotment Cancelled", `Your allotment for unit in ${app.schemeName} has been cancelled. Reason: ${app.cancellationReason}`, "Portal");
  
  const unit = db.units.find(u => u.id === unitId);
  if (unit) {
    unit.status = "vacant";
    unit.allottedTo = null;
  }

  const vacancyId = `vac_${Date.now()}`;
  db.vacancies.push({
    id: vacancyId,
    schemeId,
    unitId,
    previousAllotmentId: applicationId,
    reason: reason || "Cancelled",
    createdAt: new Date().toISOString()
  });

  recordLedgerAction(adminId, "VACANCY_CREATED", { unitId, unitNumber: unit?.unitNumber, schemeId, reason });

  // Trigger waitlist promotion
  const waitlistQueue = db.waitlists
    .filter(wl => wl.schemeId === schemeId && wl.status === "Active")
    .sort((a, b) => a.currentRank - b.currentRank);

  let promotedApplicant = null;
  let movementDetails = "";

  if (waitlistQueue.length > 0) {
    const nextWlRecord = waitlistQueue[0];
    const promotedApp = db.applications.find(a => a.id === nextWlRecord.applicationId);
    
    if (promotedApp) {
      promotedApplicant = promotedApp;
      const offerDeadline = new Date(Date.now() + DEFAULT_SLA_HOURS * 3600 * 1000).toISOString();
      
      promotedApp.status = "Allotted";
      promotedApp.allottedUnitId = unitId;
      promotedApp.allotmentReason = `Waitlist Promotion (WL-${nextWlRecord.currentRank}, Score: ${promotedApp.score} pts)`;
      promotedApp.allottedDate = new Date().toISOString();
      promotedApp.waitlistRank = null;
      promotedApp.offerStatus = "Offered";
      promotedApp.offerIssuedAt = new Date().toISOString();
      promotedApp.offerExpiresAt = offerDeadline;

      if (unit) {
        unit.status = "allotted";
        unit.allottedTo = promotedApp.userId;
      }

      nextWlRecord.status = "Promoted";
      nextWlRecord.promotionUnitId = unitId;
      nextWlRecord.promotedAt = new Date().toISOString();

      const remainingWl = db.waitlists.filter(wl => wl.schemeId === schemeId && wl.status === "Active" && wl.id !== nextWlRecord.id);
      remainingWl.forEach(wl => {
        wl.currentRank = wl.currentRank - 1;
        const rApp = db.applications.find(a => a.id === wl.applicationId);
        if (rApp) {
          rApp.waitlistRank = `WL-${String(wl.currentRank).padStart(3, '0')}`;
        }
      });

      sendNotification(
        promotedApp.userId, 
        "Waitlist Promotion Alert!", 
        `Good news! You have been promoted to Unit ${unit?.unitNumber} in ${app.schemeName}! You have 72 hours to accept this offer.`, 
        "Portal",
        "Multi-Channel"
      );

      movementDetails = `Promoted ${promotedApp.personalDetails?.fullName} (prev WL-${nextWlRecord.currentRank}, Score: ${promotedApp.score}) to Unit ${unit?.unitNumber}`;
      recordLedgerAction(adminId, "WAITLIST_PROMOTION", { promotedApplicationId: promotedApp.id, unitId, newRank: "Allotted" });
    }
  } else {
    movementDetails = "No applicants left in the waitlist. Unit remains vacant.";
  }

  writeDb(db);
  
  res.json({
    message: "Vacancy created and waitlist promotion executed.",
    vacancy: { unitNumber: unit?.unitNumber, block: unit?.block },
    promoted: promotedApplicant ? {
      name: promotedApplicant.personalDetails?.fullName,
      id: promotedApplicant.id,
      newUnit: unit?.unitNumber,
      score: promotedApplicant.score
    } : null,
    details: movementDetails
  });
});

// ----------------------------------------------------
// REPORTS, NOTIFICATIONS & AUDIT LOGS
// ----------------------------------------------------

router.get('/reports/dashboard', (req, res) => {
  const db = getDb();
  
  const totalApps = db.applications.length;
  const submittedApps = db.applications.filter(a => a.status === "Submitted" || a.status === "Payment Verified").length;
  const verifiedApps = db.applications.filter(a => a.status === "Eligible").length;
  const allottedApps = db.applications.filter(a => a.status === "Allotted" || a.status === "Completed").length;
  const waitlistedApps = db.applications.filter(a => a.status === "Waitlisted").length;
  const cancelledApps = db.applications.filter(a => a.status === "Cancelled").length;

  const categories = { General: 0, "SC/ST": 0, BC: 0 };
  db.applications.forEach(a => {
    if (categories[a.category] !== undefined) {
      categories[a.category]++;
    }
  });

  const totalRevenue = db.payments
    .filter(p => p.status === "Success" || p.status === "Verified")
    .reduce((sum, p) => sum + p.amount, 0);

  const schemePerformance = db.schemes.map(s => {
    const sApps = db.applications.filter(a => a.schemeId === s.id);
    return {
      name: s.name,
      code: s.code,
      units: s.unitsCount,
      applications: sApps.length,
      allotted: sApps.filter(a => a.status === "Allotted" || a.status === "Completed").length,
      waitlist: sApps.filter(a => a.status === "Waitlisted").length
    };
  });

  // Calculate cryptographic ledger health
  const ledgerVerification = verifyLedgerChain(db.audit_ledger || []);

  res.json({
    totalApps,
    submittedApps,
    verifiedApps,
    allottedApps,
    waitlistedApps,
    cancelledApps,
    categories,
    totalRevenue,
    schemePerformance,
    ledgerHealth: {
      isValid: ledgerVerification.isValid,
      totalBlocks: ledgerVerification.totalBlocks,
      latestHash: ledgerVerification.latestHash
    }
  });
});

// Get user notifications
router.get('/notifications', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const userId = authHeader.replace('Bearer mock-jwt-', '');

  const db = getDb();
  const list = db.notifications.filter(n => n.userId === userId);
  res.json(list);
});

// Mark notifications read
router.post('/notifications/read', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const userId = authHeader.replace('Bearer mock-jwt-', '');

  const db = getDb();
  db.notifications.forEach(n => {
    if (n.userId === userId) n.isRead = true;
  });
  writeDb(db);
  res.json({ success: true });
});

export default router;
