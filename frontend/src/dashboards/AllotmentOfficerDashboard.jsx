import React, { useState, useEffect } from 'react';
import api from '../api';

export default function AllotmentOfficerDashboard({ user, refreshGlobal }) {
  const [schemes, setSchemes] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [slaDuration, setSlaDuration] = useState('72');
  const [slaProcessing, setSlaProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const schData = await api.getSchemes();
      const appData = await api.getApplications();
      setSchemes(schData);
      setApplications(appData);
      if (schData.length > 0 && !selectedScheme) {
        setSelectedScheme(schData[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectScheme = (sch) => {
    setSelectedScheme(sch);
    setResults(null);
  };

  const handleRunAllotment = async () => {
    if (!selectedScheme) return;
    if (!window.confirm(`Are you sure you want to run the Rule-Based Priority Allotment for ${selectedScheme.name}? This will allocate housing units according to transparent scores, set a ${slaDuration}-hour SLA deadline, and generate the explainable waitlist.`)) {
      return;
    }

    setLoading(true);
    try {
      const data = await api.executeAllotment(selectedScheme.id, parseInt(slaDuration));
      setResults(data);
      alert(data.message);
      fetchData();
      refreshGlobal();
    } catch (err) {
      alert(err.message || 'Allotment execution failed');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessSla = async () => {
    setSlaProcessing(true);
    try {
      const res = await api.checkSlaExpired();
      alert(res.message);
      fetchData();
      refreshGlobal();
    } catch (err) {
      alert("Failed to process SLA offers: " + err.message);
    } finally {
      setSlaProcessing(false);
    }
  };

  // Compute local counts
  const getEligibleCount = (schemeId) => {
    return applications.filter(a => a.schemeId === schemeId && a.status === 'Eligible').length;
  };

  const getAllotedCount = (schemeId) => {
    return applications.filter(a => a.schemeId === schemeId && (a.status === 'Allotted' || a.status === 'Completed')).length;
  };

  const getWaitlistCount = (schemeId) => {
    return applications.filter(a => a.schemeId === schemeId && a.status === 'Waitlisted').length;
  };

  const getPendingVerificationCount = (schemeId) => {
    return applications.filter(a => a.schemeId === schemeId && (a.status === 'Submitted' || a.status === 'Payment Verified' || a.status === 'Document Verification')).length;
  };

  return (
    <div>
      <div className="mb-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--primary)', fontSize: '1.75rem' }}>Computerized Allotment & Waitlist Console</h2>
          <p style={{ color: 'var(--text-muted)' }}>Execute transparent rule-based priority allotments, monitor SLA offer expiration timers, and audit waitlist ranking.</p>
        </div>

        {/* Global SLA Trigger Button */}
        <button
          className="btn btn-secondary"
          onClick={handleProcessSla}
          disabled={slaProcessing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#0f172a',
            fontWeight: '600'
          }}
        >
          <span>⏱️</span> {slaProcessing ? 'Checking SLAs...' : 'Run SLA Expiration Check Now'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Main Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Schemes Select List */}
          <div className="card">
            <h3 className="card-title">Select Active Scheme</h3>
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {schemes.map(s => {
                const isSelected = selectedScheme?.id === s.id;
                return (
                  <button 
                    key={s.id} 
                    onClick={() => handleSelectScheme(s)}
                    className="btn"
                    style={{
                      backgroundColor: isSelected ? 'var(--primary)' : 'var(--surface)',
                      color: isSelected ? 'white' : 'var(--text)',
                      border: '1px solid var(--border-color)',
                      flexShrink: 0
                    }}
                  >
                    {s.name} ({s.code}) • v{s.ruleVersion || 1}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedScheme && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className="card-title" style={{ margin: 0 }}>
                  Priority Engine Allotment Parameters
                </h3>
                <span className="badge badge-submitted">{selectedScheme.status}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available Units</span>
                  <h4 style={{ color: 'var(--primary)', fontSize: '1.25rem' }}>{selectedScheme.unitsCount} Units</h4>
                </div>
                <div style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Eligible Candidates</span>
                  <h4 style={{ color: 'var(--success)', fontSize: '1.25rem' }}>{getEligibleCount(selectedScheme.id)} Verified</h4>
                </div>
                <div style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Allotted so far</span>
                  <h4 style={{ color: 'var(--primary)', fontSize: '1.25rem' }}>{getAllotedCount(selectedScheme.id)} Allotted</h4>
                </div>
                <div style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Waitlisted</span>
                  <h4 style={{ color: 'var(--warning)', fontSize: '1.25rem' }}>{getWaitlistCount(selectedScheme.id)} Ranked</h4>
                </div>
              </div>

              {/* Warnings / Guidance */}
              {getPendingVerificationCount(selectedScheme.id) > 0 && (
                <div style={{ backgroundColor: 'var(--warning-bg)', borderLeft: '4px solid var(--warning)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                  ⚠️ <strong>Notice:</strong> There are {getPendingVerificationCount(selectedScheme.id)} applications in document verification. Verify them before executing final allotment so their priority scores are accounted for.
                </div>
              )}

              {/* Reservation Policies Details */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>Affirmative Quotas & Rule Version</h4>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>SC/ST: <strong>{selectedScheme.reservationRules.scst}%</strong></span>
                  <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>BC: <strong>{selectedScheme.reservationRules.bc}%</strong></span>
                  <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>PH (Disability): <strong>{selectedScheme.reservationRules.ph}%</strong></span>
                  <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>Ex-Servicemen: <strong>{selectedScheme.reservationRules.ex}%</strong></span>
                  <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>General: <strong>{selectedScheme.reservationRules.general}%</strong></span>
                  <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', background: '#ecfdf5', color: '#047857', borderRadius: '4px', fontWeight: '700' }}>Rules v{selectedScheme.ruleVersion || 1}</span>
                </div>
              </div>

              {/* SLA Deadline Config & Execution Actions */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                    SLA Offer Acceptance Window:
                  </label>
                  <select
                    value={slaDuration}
                    onChange={e => setSlaDuration(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="72">72 Hours (Standard Board Policy)</option>
                    <option value="48">48 Hours (Fast-Track)</option>
                    <option value="24">24 Hours (Urgent Allotment)</option>
                  </select>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  If the candidate fails to accept the allotment within this SLA, the system automatically revokes the offer and auto-promotes the next waitlist candidate.
                </div>
              </div>

              {selectedScheme.status !== 'Allotment Completed' ? (
                <button 
                  className="btn btn-primary" 
                  disabled={loading || getEligibleCount(selectedScheme.id) === 0}
                  onClick={handleRunAllotment}
                  style={{ width: '100%', padding: '1rem', fontWeight: '700' }}
                >
                  {loading ? 'Evaluating Scores & Executing Allotment...' : '🚀 Execute Priority Allotment & Waitlist Draw'}
                </button>
              ) : (
                <div style={{ backgroundColor: 'var(--success-bg)', border: '1px solid var(--success)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <h4 style={{ color: 'var(--success)' }}>Allotment Algorithm Finalized</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                    The computerized priority allotment for this scheme was completed and sealed to the SHA-256 Ledger.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Results Summary if just executed */}
          {results && (
            <div className="card" style={{ border: '2px solid var(--success)', animation: 'fadeIn 0.5s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 className="card-title" style={{ color: 'var(--success)', margin: 0 }}>
                  Allotment Output & Cryptographic Ledger Seal
                </h3>
                {results.ledgerHash && (
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#047857', background: '#dcfce7', padding: '3px 8px', borderRadius: '4px' }}>
                    SHA-256: {results.ledgerHash.slice(0, 16)}...
                  </span>
                )}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Allotted Unit Allocations ({results.allottedCount})</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {results.allotted.map((a, idx) => (
                      <div key={idx} style={{ padding: '0.6rem 0.8rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div><strong>👤 {a.name}</strong></div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.reason}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ background: '#ecfdf5', color: '#047857', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                            {a.score} pts
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ color: 'var(--warning)', marginBottom: '0.5rem' }}>Waitlist Generated ({results.waitlistCount})</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {results.waitlist.map((w, idx) => (
                      <div key={idx} style={{ padding: '0.6rem 0.8rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div><strong>👤 {w.name}</strong></div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--warning)' }}>Rank: {w.rank}</div>
                        </div>
                        <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                          {w.score} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info Panel */}
        {selectedScheme && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 className="card-title" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Scheme Particulars</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="d-flex justify-between" style={{ fontSize: '0.85rem' }}>
                <span>Scheme Code:</span>
                <strong>{selectedScheme.code}</strong>
              </div>
              <div className="d-flex justify-between" style={{ fontSize: '0.85rem' }}>
                <span>Location:</span>
                <strong>{selectedScheme.location}</strong>
              </div>
              <div className="d-flex justify-between" style={{ fontSize: '0.85rem' }}>
                <span>Housing Type:</span>
                <strong>{selectedScheme.type}</strong>
              </div>
              <div className="d-flex justify-between" style={{ fontSize: '0.85rem' }}>
                <span>Income Limit:</span>
                <strong>Rs. {selectedScheme.incomeLimit?.toLocaleString()}</strong>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1rem', paddingTop: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Pool Health Breakdown</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem' }}>
                <div className="d-flex justify-between">
                  <span>Eligible (Awaiting Allotment):</span>
                  <strong>{getEligibleCount(selectedScheme.id)}</strong>
                </div>
                <div className="d-flex justify-between">
                  <span>Pending Document Checks:</span>
                  <strong>{getPendingVerificationCount(selectedScheme.id)}</strong>
                </div>
                <div className="d-flex justify-between">
                  <span>Ranked Waitlist Members:</span>
                  <strong>{getWaitlistCount(selectedScheme.id)}</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
