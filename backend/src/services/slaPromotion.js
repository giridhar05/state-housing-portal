// backend/src/services/slaPromotion.js
// Auto-promotion engine with SLA Timers & Offer Deadlines
import { createLedgerEntry } from './auditLedger.js';

export const DEFAULT_SLA_HOURS = 72;

/**
 * Calculates remaining milliseconds and human-readable time until offer expiration
 */
export function getOfferTimeRemaining(offerExpiresAt) {
  if (!offerExpiresAt) return { isExpired: false, remainingMs: 0, text: "No active deadline" };

  const diffMs = new Date(offerExpiresAt).getTime() - Date.now();
  if (diffMs <= 0) {
    return { isExpired: true, remainingMs: 0, text: "Offer Expired" };
  }

  const totalSecs = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  return {
    isExpired: false,
    remainingMs: diffMs,
    hours,
    minutes,
    seconds,
    text: `${hours}h ${minutes}m ${seconds}s remaining`
  };
}

/**
 * Evaluates all active offers across the database, expires any whose SLA has elapsed,
 * and automatically promotes the next waitlisted applicant.
 * @param {Object} db - Database snapshot
 * @returns {Array} List of promotion actions taken
 */
export function processExpiredOffers(db) {
  const now = new Date();
  const promotions = [];

  // Find applications currently in 'Allotted' stage that have an active offer with an expiration date
  const activeOffers = db.applications.filter(a => 
    a.status === "Allotted" && 
    a.offerStatus === "Offered" && 
    a.offerExpiresAt && 
    new Date(a.offerExpiresAt) <= now
  );

  for (const expiredApp of activeOffers) {
    const unitId = expiredApp.allottedUnitId;
    const schemeId = expiredApp.schemeId;
    const previousUserId = expiredApp.userId;
    const unit = db.units.find(u => u.id === unitId);
    const scheme = db.schemes.find(s => s.id === schemeId);

    // 1. Mark expired offer
    expiredApp.offerStatus = "Expired";
    expiredApp.status = "Offer Expired";
    expiredApp.allottedUnitId = null;
    expiredApp.offerExpiredAt = now.toISOString();

    // Free unit
    if (unit) {
      unit.status = "vacant";
      unit.allottedTo = null;
    }

    // Add to audit ledger
    const ledgerEntry1 = createLedgerEntry(
      db.audit_ledger || [],
      "SYSTEM_SLA_DAEMON",
      "OFFER_EXPIRED",
      {
        applicationId: expiredApp.id,
        userId: previousUserId,
        unitId,
        schemeId,
        expiredAt: now.toISOString()
      }
    );
    if (!db.audit_ledger) db.audit_ledger = [];
    db.audit_ledger.push(ledgerEntry1);

    // Notify previous applicant
    db.notifications.unshift({
      id: `not_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      userId: previousUserId,
      title: "Allotment Offer Expired",
      message: `Your 72-hour offer window for Unit ${unit?.unitNumber || ''} in ${scheme?.name || ''} has expired. The unit has been reassigned.`,
      type: "Portal",
      channel: "Multi-Channel",
      isRead: false,
      createdAt: now.toISOString()
    });

    // 2. Auto-promote next active waitlist candidate for this scheme
    const waitlistQueue = (db.waitlists || [])
      .filter(wl => wl.schemeId === schemeId && wl.status === "Active")
      .sort((a, b) => a.currentRank - b.currentRank);

    if (waitlistQueue.length > 0 && unit) {
      const nextCandidateRecord = waitlistQueue[0];
      const nextApp = db.applications.find(a => a.id === nextCandidateRecord.applicationId);

      if (nextApp) {
        // Issue offer with new SLA timer (72 hours default)
        const offerExpiresAt = new Date(Date.now() + DEFAULT_SLA_HOURS * 3600 * 1000).toISOString();

        nextApp.status = "Allotted";
        nextApp.allottedUnitId = unit.id;
        nextApp.allotmentReason = `Auto-Promotion (SLA Expired on WL-${nextCandidateRecord.currentRank})`;
        nextApp.allottedDate = now.toISOString();
        nextApp.waitlistRank = null;
        nextApp.offerStatus = "Offered";
        nextApp.offerIssuedAt = now.toISOString();
        nextApp.offerExpiresAt = offerExpiresAt;

        unit.status = "allotted";
        unit.allottedTo = nextApp.userId;

        nextCandidateRecord.status = "Promoted";
        nextCandidateRecord.promotionUnitId = unit.id;
        nextCandidateRecord.promotedAt = now.toISOString();

        // Shift remaining waitlist ranks
        const remainingWl = db.waitlists.filter(wl => 
          wl.schemeId === schemeId && 
          wl.status === "Active" && 
          wl.id !== nextCandidateRecord.id
        );
        remainingWl.forEach(wl => {
          wl.currentRank = wl.currentRank - 1;
          const rApp = db.applications.find(a => a.id === wl.applicationId);
          if (rApp) {
            rApp.waitlistRank = `WL-${String(wl.currentRank).padStart(3, '0')}`;
          }
        });

        // Audit promotion
        const ledgerEntry2 = createLedgerEntry(
          db.audit_ledger,
          "SYSTEM_SLA_DAEMON",
          "AUTO_PROMOTION_SUCCESS",
          {
            promotedApplicationId: nextApp.id,
            userId: nextApp.userId,
            unitId: unit.id,
            unitNumber: unit.unitNumber,
            schemeId,
            offerExpiresAt
          }
        );
        db.audit_ledger.push(ledgerEntry2);

        // Notify promoted applicant
        db.notifications.unshift({
          id: `not_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          userId: nextApp.userId,
          title: "⚡ Waitlist Auto-Promotion Offer!",
          message: `Congratulations! A vacancy opened in ${scheme?.name || ''} and you have been promoted to Unit ${unit.unitNumber}! You have 72 hours to accept this offer.`,
          type: "Portal",
          channel: "Multi-Channel",
          isRead: false,
          createdAt: now.toISOString()
        });

        promotions.push({
          expiredApplicationId: expiredApp.id,
          promotedApplicationId: nextApp.id,
          promotedUserName: nextApp.personalDetails?.fullName || "Candidate",
          unitNumber: unit.unitNumber,
          schemeName: scheme?.name
        });
      }
    }
  }

  return promotions;
}
