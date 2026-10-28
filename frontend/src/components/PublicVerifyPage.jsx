import React, { useState, useEffect } from 'react';
import api from '../api';

export default function PublicVerifyPage({ allotmentId: propAllotmentId, sig: propSig, onBack }) {
  // Read from props or URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const initialId = propAllotmentId || urlParams.get('allotmentId') || '';
  const initialSig = propSig || urlParams.get('sig') || '';

  const [allotmentId, setAllotmentId] = useState(initialId);
  const [sig, setSig] = useState(initialSig);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialId && initialSig) {
      verifyDocument(initialId, initialSig);
    }
  }, [initialId, initialSig]);

  const verifyDocument = async (idToVerify, sigToVerify) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.verifyAllotmentPublic(idToVerify, sigToVerify);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Verification failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!allotmentId || !sig) {
      setError('Both Allotment ID and Cryptographic Signature are required.');
      return;
    }
    verifyDocument(allotmentId, sig);
  };

  return (
    <div style={{
      maxWidth: '700px',
      margin: '40px auto',
      padding: '0 20px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Top Banner */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          color: '#ffffff',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏛️</div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 4px 0', letterSpacing: '0.3px' }}>
            TAMIL NADU HOUSING BOARD
          </h1>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>
            Public Document Authentication & HMAC-SHA256 Verification Portal
          </div>
        </div>

        {/* Search / Manual Verification Form */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr auto', gap: '10px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Allotment ID / App Ref
                </label>
                <input
                  type="text"
                  placeholder="e.g. alt_app_123"
                  value={allotmentId}
                  onChange={e => setAllotmentId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Cryptographic Signature (HMAC)
                </label>
                <input
                  type="text"
                  placeholder="64-character SHA-256 hex string"
                  value={sig}
                  onChange={e => setSig(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 18px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </form>

          {error && (
            <div style={{ marginTop: '12px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '12px' }}>
              {error}
            </div>
          )}
        </div>

        {/* Results Container */}
        <div style={{ padding: '28px' }}>
          {result && (
            <div>
              {result.isValid ? (
                /* Valid Allotment State */
                <div>
                  <div style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    marginBottom: '20px'
                  }}>
                    <div style={{ fontSize: '32px' }}>✅</div>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#065f46' }}>
                        OFFICIAL DOCUMENT AUTHENTICATED
                      </div>
                      <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }}>
                        This Allotment Order was issued by the Tamil Nadu Housing Board and its cryptographic signature is genuine.
                      </div>
                    </div>
                  </div>

                  {/* Certified Details Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 0', color: '#64748b', width: '38%' }}>Order Reference</td>
                        <td style={{ padding: '8px 0', fontWeight: '700', fontFamily: 'monospace', color: '#0f172a' }}>{result.orderNumber}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 0', color: '#64748b' }}>Beneficiary Name</td>
                        <td style={{ padding: '8px 0', fontWeight: '700', color: '#0f172a' }}>{result.applicantName}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 0', color: '#64748b' }}>Aadhaar Verification</td>
                        <td style={{ padding: '8px 0', fontFamily: 'monospace', color: '#0f172a' }}>{result.maskedAadhaar}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 0', color: '#64748b' }}>Housing Scheme</td>
                        <td style={{ padding: '8px 0', fontWeight: '600', color: '#0f172a' }}>{result.schemeName}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 0', color: '#64748b' }}>Assigned Unit</td>
                        <td style={{ padding: '8px 0', fontWeight: '700', color: '#1e40af' }}>Unit {result.unitNumber} ({result.block})</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 0', color: '#64748b' }}>Allotment Quota / Merit</td>
                        <td style={{ padding: '8px 0', color: '#0f172a' }}>{result.category}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 0', color: '#64748b' }}>State Registry Status</td>
                        <td style={{ padding: '8px 0', fontWeight: '700', color: '#059669' }}>{result.status}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px 0', color: '#64748b' }}>Verified Timestamp</td>
                        <td style={{ padding: '8px 0', color: '#64748b', fontSize: '12px' }}>{new Date(result.verifiedAt).toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Invalid / Tampered State */
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>⚠️</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#991b1b', marginBottom: '6px' }}>
                    AUTHENTICATION FAILED / INVALID DOCUMENT
                  </div>
                  <div style={{ fontSize: '13px', color: '#b91c1c', maxWidth: '480px', margin: '0 auto 16px auto', lineHeight: '1.4' }}>
                    {result.reason || "The cryptographic signature could not be verified against the state database. This document may be fraudulent, expired, or revoked."}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                    Status: {result.status || 'UNVERIFIED'}
                  </div>
                </div>
              )}
            </div>
          )}

          {!result && !loading && (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '30px 0' }}>
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🔍</span>
              Scan an official Allotment Letter QR code or enter the details above to verify document authenticity.
            </div>
          )}
        </div>

        {/* Footer Back Action */}
        {onBack && (
          <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '14px 28px', textAlign: 'center' }}>
            <button
              onClick={onBack}
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 20px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              ← Back to Portal Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
