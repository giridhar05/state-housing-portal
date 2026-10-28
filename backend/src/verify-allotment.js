import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, readDb, writeDb, logAudit, sendNotification } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, '..', 'data', 'db.json');

// Assert Helper
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ ASSERT: ${message}`);
  }
}

async function runTest() {
  console.log("==================================================");
  console.log("STARTING ALLOTMENT & WAITLIST INTEGRATION TEST...");
  console.log("==================================================");

  // 1. Clean and reset database
  if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
  }
  initDb();

  const db = readDb();
  console.log("Database initialized. Seeding additional applicants...");

  // 2. Add 15 mock applicants
  const testApplicants = [];
  for (let i = 1; i <= 15; i++) {
    const id = `usr_test_${i}`;
    const user = {
      id,
      name: `Applicant ${i}`,
      mobile: `99999990${String(i).padStart(2, '0')}`,
      email: `applicant${i}@test.com`,
      role: "Applicant"
    };
    db.users.push(user);
    testApplicants.push(user);
  }

  // 3. Create a test housing scheme with 5 units
  const schemeId = "sch_test_01";
  const testScheme = {
    id: schemeId,
    name: "Test Heights Scheme",
    code: "THS-TEST",
    location: "Test Sector",
    district: "Test District",
    type: "2BHK",
    unitsCount: 5,
    reservationRules: {
      scst: 20, // 1 unit
      bc: 20,   // 1 unit
      ph: 0,
      ex: 0,
      general: 60 // 3 units
    },
    incomeLimit: 500000,
    status: "Active"
  };
  db.schemes.push(testScheme);

  // Create 5 units
  const testUnits = [];
  for (let i = 1; i <= 5; i++) {
    const unit = {
      id: `unt_test_${i}`,
      schemeId,
      block: "Block A",
      unitNumber: `A-10${i}`,
      status: "vacant",
      allottedTo: null
    };
    db.units.push(unit);
    testUnits.push(unit);
  }

  // 4. Create eligible applications for all 15 applicants
  testApplicants.forEach((usr, idx) => {
    // 5 applicants as SC/ST, 5 as BC, 5 as General
    let category = "General";
    if (idx < 5) category = "SC/ST";
    else if (idx < 10) category = "BC";

    const app = {
      id: `app_test_${usr.id}`,
      schemeId,
      schemeName: testScheme.name,
      schemeCode: testScheme.code,
      userId: usr.id,
      personalDetails: { fullName: usr.name, age: "32", aadhaar: `1234567890${String(idx).padStart(2, '0')}` },
      income: 250000,
      category,
      reservationClaims: { ph: false, ex: false },
      documents: [
        { type: "identity_proof", name: "aadhaar.pdf", status: "Verified" },
        { type: "income_certificate", name: "income.pdf", status: "Verified" }
      ],
      status: "Eligible", // Directly marked eligible for allotment
      createdAt: new Date().toISOString()
    };
    db.applications.push(app);
  });

  writeDb(db);
  console.log("Seeding complete. 15 eligible applicants created. Running allotment draw...");

  // 5. Run the allotment algorithm (Simulate API logic)
  const currentDb = readDb();
  const eligibleApps = currentDb.applications.filter(a => a.schemeId === schemeId && a.status === "Eligible");
  const vacantUnits = currentDb.units.filter(u => u.schemeId === schemeId && u.status === "vacant");

  assert(eligibleApps.length === 15, "Should have 15 eligible applications.");
  assert(vacantUnits.length === 5, "Should have 5 vacant units.");

  // Run draw: shuffle (deterministic for testing by sorting by name for replicability, or random. Let's do alphabetical name order for replicability)
  const sortedApplicants = [...eligibleApps].sort((a, b) => a.personalDetails.fullName.localeCompare(b.personalDetails.fullName));

  let unitIndex = 0;
  const allottedList = [];
  const waitlistList = [];

  const assignUnit = (app, reason) => {
    if (unitIndex >= vacantUnits.length) return false;
    const unit = vacantUnits[unitIndex];
    unit.status = "allotted";
    unit.allottedTo = app.userId;
    
    app.status = "Allotted";
    app.allottedUnitId = unit.id;
    app.allotmentReason = reason;
    app.allottedDate = new Date().toISOString();

    allottedList.push(app);
    unitIndex++;
    return true;
  };

  // Quotas: SC/ST (1), BC (1), General (3)
  // SC/ST allocation
  const scstApps = sortedApplicants.filter(a => a.category === "SC/ST");
  assignUnit(scstApps[0], "SC/ST Quota"); // Allot first SC/ST

  // BC allocation
  const bcApps = sortedApplicants.filter(a => a.category === "BC");
  assignUnit(bcApps[0], "BC Quota"); // Allot first BC

  // General allocation for remaining
  const remaining = sortedApplicants.filter(a => a.status === "Eligible");
  remaining.forEach(app => {
    if (unitIndex < vacantUnits.length) {
      assignUnit(app, "General Pool");
    } else {
      waitlistList.push(app);
    }
  });

  // Assign Waitlist ranks sequentially
  waitlistList.forEach((app, idx) => {
    const rank = idx + 1;
    app.status = "Waitlisted";
    app.waitlistRank = `WL-${String(rank).padStart(3, '0')}`;
    
    currentDb.waitlists.push({
      id: `wl_test_${idx}`,
      schemeId,
      applicationId: app.id,
      userId: app.userId,
      originalRank: rank,
      currentRank: rank,
      status: "Active",
      createdAt: new Date().toISOString()
    });
  });

  writeDb(currentDb);

  // Assert allotment outputs
  assert(allottedList.length === 5, "Exactly 5 applicants should be allotted units.");
  assert(waitlistList.length === 10, "Exactly 10 applicants should be placed on the waitlist.");

  // Check waitlist sequentiality
  waitlistList.forEach((app, idx) => {
    const expectedRank = `WL-${String(idx + 1).padStart(3, '0')}`;
    assert(app.waitlistRank === expectedRank, `Applicant ${app.personalDetails.fullName} should have waitlist rank ${expectedRank}`);
  });

  console.log("Allotment verification complete. Simulating cancellations and waitlist promotions...");

  // 6. Cancel two allotments (Let's cancel the first General Pool allotment and the SC/ST allotment)
  const dbAfterAllotment = readDb();
  
  // Cancel 1: Applicant 10 (allotted to unit A-101)
  const appToCancel1 = dbAfterAllotment.applications.find(a => a.status === "Allotted");
  const unitId1 = appToCancel1.allottedUnitId;
  const prevUserId1 = appToCancel1.userId;
  
  console.log(`Cancelling allotment for ${appToCancel1.personalDetails.fullName} (Unit ID: ${unitId1})`);
  appToCancel1.status = "Cancelled";
  appToCancel1.allottedUnitId = null;

  // Mark unit vacant
  const unitObj1 = dbAfterAllotment.units.find(u => u.id === unitId1);
  unitObj1.status = "vacant";
  unitObj1.allottedTo = null;

  // Process Promotion for Unit 1
  const wlQueue1 = dbAfterAllotment.waitlists
    .filter(wl => wl.schemeId === schemeId && wl.status === "Active")
    .sort((a, b) => a.currentRank - b.currentRank);

  assert(wlQueue1.length === 10, "Should have 10 active waitlisted applicants before first cancellation.");

  const nextWlRecord = wlQueue1[0];
  const promotedApp = dbAfterAllotment.applications.find(a => a.id === nextWlRecord.applicationId);
  
  console.log(`Promoting ${promotedApp.personalDetails.fullName} (Rank WL-001) to Unit ${unitObj1.unitNumber}`);
  
  promotedApp.status = "Allotted";
  promotedApp.allottedUnitId = unitId1;
  promotedApp.allotmentReason = "Waitlist Promotion";
  promotedApp.waitlistRank = null;

  unitObj1.status = "allotted";
  unitObj1.allottedTo = promotedApp.userId;

  nextWlRecord.status = "Promoted";
  
  // Shift ranks
  const remainingWl = dbAfterAllotment.waitlists.filter(wl => wl.schemeId === schemeId && wl.status === "Active" && wl.id !== nextWlRecord.id);
  remainingWl.forEach(wl => {
    wl.currentRank = wl.currentRank - 1;
    const rApp = dbAfterAllotment.applications.find(a => a.id === wl.applicationId);
    if (rApp) {
      rApp.waitlistRank = `WL-${String(wl.currentRank).padStart(3, '0')}`;
    }
  });

  writeDb(dbAfterAllotment);

  // Assert promotions and shifts
  const finalDb = readDb();
  const checkPromoted = finalDb.applications.find(a => a.id === promotedApp.id);
  assert(checkPromoted.status === "Allotted", "Promoted applicant's status should now be Allotted.");
  assert(checkPromoted.allottedUnitId === unitId1, "Promoted applicant should be assigned the cancelled unit.");

  const checkNextWl = finalDb.applications.find(a => a.waitlistRank === "WL-001");
  assert(checkNextWl !== null, "There should be a new WL-001 after shift.");
  assert(checkNextWl.id !== promotedApp.id, "The promoted applicant should no longer be in the waitlist.");

  console.log("==================================================");
  console.log("INTEGRATION TESTS PASSED SUCCESSFULLY! 🚀");
  console.log("==================================================");
}

runTest();
