import React, { useState, useEffect } from 'react';
import api from '../api';

export default function AuditLedgerExplorer() {
  const [ledger, setLedger] = useState([]);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [tamperStatus, setTamperStatus] = useState('');

  useEffect(() => {
    fetchLedger();
  }, []);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const data = await api.getLedger();
      setLedger(data);
      // Auto-verify on fetch
      const ver = await api.verifyLedger();
      setVerification(ver);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const ver = await api.verifyLedger();
      setVerification(ver);
      setTamperStatus(ver.isValid ? "✅ Hash chain integrity verified: Unbroken SHA-256 linkage." : "❌ Tampering detected!");
    } catch (err) {
      alert("Verification failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateTamper = async () => {
    if (!window.confirm("This will intentionally tamper with Block #2 in the database to demonstrate real-time cryptographic fraud detection. Proceed?")) {
      return;
    }
    setLoading(true);
    try {
      await api.simulateTamper(2, {
        tamperedBy: "Malicious Database Admin",
        fraudulentAllotment: true,
        note: "Forged allotment record inserted directly into database"
      });
      setTamperStatus("⚠️ Block #2 has been tampered with! Re-verifying ledger now...");
      // Re-run verify
      const ver = await api.verifyLedger();
      setVerification(ver);
      const data = await api.getLedger();
      setLedger(data);
    } catch (err) {
      alert("Failed to simulate tamper: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRepair = async () => {
    setLoading(true);
    try {
      const res = await api.repairLedger();
      alert(res.message);
      setTamperStatus("✅ Ledger restored and resealed with valid SHA-256 hashes.");
      fetchLedger();
    } catch (err) {
      alert("Failed to repair ledger: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredBlocks = ledger.filter(b => {
    const q = search.toLowerCase();
    return b.action?.toLowerCase().includes(q) ||
           b.actorId?.toLowerCase().includes(q) ||
           String(b.seq).includes(q) ||
           b.hash?.toLowerCase().includes(q);
  });

  return (
    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
      {/* Header and Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🔗</span>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Tamper-Evident Audit Ledger (SHA-256 Hash Chain)
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Immutable, insert-only cryptographic block chain ensuring no allotment record, rule modification, or verification can be altered unnoticed.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleVerify}
            disabled={loading}
            style={{
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)'
            }}
          >
            🛡️ Verify Ledger Integrity
          </button>

          <button
            onClick={handleSimulateTamper}
            disabled={loading}
            style={{
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 14px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Demonstrate fraud detection for examiners"
          >
            ⚠️ Simulate Tampering (Demo)
          </button>

          <button
            onClick={handleRepair}
            disabled={loading}
            style={{
              background: '#334155',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 14px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🔄 Repair & Reseal Chain
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {tamperStatus && (
        <div style={{
          padding: '10px 16px',
          borderRadius: '8px',
          marginBottom: '14px',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          color: '#1e40af',
          fontSize: '13px',
          fontWeight: '600'
        }}>
          {tamperStatus}
        </div>
      )}

      {/* Verification Status Banner */}
      {verification && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: verification.isValid ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${verification.isValid ? '#a7f3d0' : '#fecaca'}`,
          color: verification.isValid ? '#065f46' : '#991b1b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>{verification.isValid ? '✅' : '🚨'}</span>
            <div>
              <div style={{ fontWeight: '800', fontSize: '15px' }}>
                {verification.isValid ? 'Cryptographic Chain Integrity: 100% VALID' : 'CRITICAL SECURITY ALERT: Tampering Detected!'}
              </div>
              <div style={{ fontSize: '12px', marginTop: '2px' }}>
                {verification.isValid 
                  ? `All ${verification.totalBlocks} sequential blocks verified intact. Latest Hash: ${verification.latestHash ? verification.latestHash.slice(0, 16) + '...' : 'Genesis'}`
                  : `Broken at Block #${verification.brokenSeq}: ${verification.reason}`
                }
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right', fontSize: '11px', opacity: 0.85 }}>
            Verified: {new Date().toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Search Input */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Search by action, actor ID, sequence #, or hash..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '380px',
            padding: '8px 14px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '13px'
          }}
        />
      </div>

      {/* Blocks Chain List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredBlocks.map((block, idx) => {
          const isBroken = verification && !verification.isValid && verification.brokenSeq === block.seq;
          const isGenesis = block.seq === 1;

          return (
            <div
              key={block.seq}
              style={{
                border: isBroken ? '2px solid #ef4444' : '1px solid #e2e8f0',
                borderRadius: '12px',
                background: isBroken ? '#fff1f2' : (isGenesis ? '#f8fafc' : '#ffffff'),
                padding: '16px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                position: 'relative'
              }}
            >
              {/* Connector line for blockchain feel */}
              {idx < filteredBlocks.length - 1 && (
                <div style={{
                  position: 'absolute',
                  bottom: '-14px',
                  left: '32px',
                  width: '2px',
                  height: '14px',
                  background: '#cbd5e1'
                }} />
              )}

              {/* Block Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    background: isBroken ? '#dc2626' : '#1e40af',
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}>
                    Block #{block.seq}
                  </span>
                  <span style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>
                    {block.action}
                  </span>
                  {isGenesis && (
                    <span style={{ background: '#dbeafe', color: '#1e40af', fontSize: '10px', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                      GENESIS
                    </span>
                  )}
                  {isBroken && (
                    <span style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '11px', padding: '1px 8px', borderRadius: '4px', fontWeight: '800' }}>
                      TAMPERED BLOCK
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {new Date(block.ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' })}
                </div>
              </div>

              {/* Actor & Details */}
              <div style={{ fontSize: '12px', color: '#475569', marginBottom: '8px' }}>
                <strong>Actor:</strong> <span style={{ fontFamily: 'monospace', color: '#1e293b' }}>{block.actorId}</span>
              </div>

              {/* Payload Snapshot */}
              <div style={{
                background: isBroken ? '#fecaca' : '#f1f5f9',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#334155',
                overflowX: 'auto',
                marginBottom: '10px'
              }}>
                {JSON.stringify(block.payload, null, 2)}
              </div>

              {/* Hashes Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                fontSize: '11px',
                fontFamily: 'monospace',
                background: '#fafafa',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #f1f5f9'
              }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase' }}>Previous Hash (Link)</div>
                  <div style={{ color: '#475569', wordBreak: 'break-all' }}>
                    {block.prevHash === '0000000000000000000000000000000000000000000000000000000000000000' 
                      ? 'GENESIS_PREV_HASH' 
                      : block.prevHash
                    }
                  </div>
                </div>

                <div>
                  <div style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase' }}>Block SHA-256 Hash</div>
                  <div style={{ color: isBroken ? '#b91c1c' : '#047857', fontWeight: '700', wordBreak: 'break-all' }}>
                    {block.hash}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
