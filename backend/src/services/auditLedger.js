// backend/src/services/auditLedger.js
// Cryptographic Hash Chain Audit Ledger
import crypto from 'crypto';

export const GENESIS_PREV_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Creates a new immutable block in the SHA-256 hash chain
 * @param {Array} ledger - The existing ledger array from db.json
 * @param {string} actorId - ID of actor (Admin, Officer, System, Applicant)
 * @param {string} action - Event code (e.g. "ALLOTMENT_ISSUED", "WAITLIST_PROMOTED")
 * @param {Object} payload - Event data payload snapshot
 * @returns {Object} Newly created verified block
 */
export function createLedgerEntry(ledger = [], actorId, action, payload) {
  const last = ledger.length > 0 ? ledger[ledger.length - 1] : null;
  const seq = last ? (last.seq + 1) : 1;
  const prevHash = last ? last.hash : GENESIS_PREV_HASH;
  const ts = new Date().toISOString();

  // Canonical JSON serialization ensures exact byte-level hashing
  const canonicalData = JSON.stringify({
    seq,
    actorId: actorId || "SYSTEM",
    action,
    payload: payload || {},
    ts,
    prevHash
  });

  const hash = crypto.createHash('sha256').update(canonicalData).digest('hex');

  const entry = {
    seq,
    actorId: actorId || "SYSTEM",
    action,
    payload: payload || {},
    ts,
    prevHash,
    hash,
    canonicalData
  };

  return entry;
}

/**
 * Validates the entire cryptographic chain from Genesis block to latest block
 * Walks sequential blocks, recomputes SHA-256 digests, and verifies backward pointer links.
 * @param {Array} ledger - The audit ledger array
 * @returns {Object} Verification summary with detailed diagnostics
 */
export function verifyLedgerChain(ledger = []) {
  if (!Array.isArray(ledger) || ledger.length === 0) {
    return {
      isValid: true,
      totalBlocks: 0,
      latestHash: null,
      message: "Ledger is currently empty (Genesis state)."
    };
  }

  for (let i = 0; i < ledger.length; i++) {
    const block = ledger[i];

    // 1. Check sequence ordering
    if (block.seq !== i + 1) {
      return {
        isValid: false,
        brokenSeq: block.seq,
        reason: `Broken sequence order: Expected seq #${i + 1}, found #${block.seq}`,
        brokenBlock: block
      };
    }

    // 2. Recompute SHA-256 over exact canonicalData
    const recomputedHash = crypto.createHash('sha256').update(block.canonicalData).digest('hex');
    if (recomputedHash !== block.hash) {
      return {
        isValid: false,
        brokenSeq: block.seq,
        reason: `Cryptographic payload tampered at block #${block.seq}. Stored hash does not match computed data hash.`,
        expectedHash: recomputedHash,
        actualHash: block.hash,
        brokenBlock: block
      };
    }

    // 3. Verify backward hash link (prevHash)
    if (i === 0) {
      if (block.prevHash !== GENESIS_PREV_HASH) {
        return {
          isValid: false,
          brokenSeq: 1,
          reason: `Genesis block does not point to the genesis hash marker (${GENESIS_PREV_HASH}).`,
          brokenBlock: block
        };
      }
    } else {
      const prevBlock = ledger[i - 1];
      if (block.prevHash !== prevBlock.hash) {
        return {
          isValid: false,
          brokenSeq: block.seq,
          reason: `Hash pointer mismatch at block #${block.seq}. Expected prevHash ${prevBlock.hash.slice(0, 16)}..., found ${block.prevHash.slice(0, 16)}...`,
          expectedPrevHash: prevBlock.hash,
          actualPrevHash: block.prevHash,
          brokenBlock: block
        };
      }
    }
  }

  return {
    isValid: true,
    totalBlocks: ledger.length,
    latestHash: ledger[ledger.length - 1].hash,
    verifiedAt: new Date().toISOString(),
    message: `All ${ledger.length} ledger blocks verified cryptographically intact. Hash chain is unbroken.`
  };
}
