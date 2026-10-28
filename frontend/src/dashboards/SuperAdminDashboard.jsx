import React, { useState, useEffect } from 'react';
import api from '../api';

export default function SuperAdminDashboard({ user, refreshGlobal }) {
  const [reports, setReports] = useState(null);
  const [allotments, setAllotments] = useState([]);
  const [promotionFeed, setPromotionFeed] = useState([]);
  const [cancelAppId, setCancelAppId] = useState('');
  const [cancelReason, setCancelReason] = useState('Non-payment of Booking Amount');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSla, setCheckingSla] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const rep = await api.getReports();
      setReports(rep);

      const apps = await api.getApplications();
      // Only get active allotments/completed statuses
      const activeAllotments = apps.filter(a => a.status === 'Allotted' || a.status === 'Completed');
      setAllotments(activeAllotments);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelClick = (appId) => {
    setCancelAppId(appId);
    setCancelReason('Non-payment of Booking Amount');
    setShowCancelModal(true);
  };

  const triggerCancellation = async () => {
    setLoading(true);
    try {
      const data = await api.createVacancy(cancelAppId, cancelReason);
      
      const timestamp = new Date().toLocaleTimeString();
      let alertMsg = `[${timestamp}] Vacancy Created on Unit ${data.vacancy.unitNumber} (${data.vacancy.block}). `;
      if (data.promoted) {
        alertMsg += `⚡ Promoted ${data.promoted.name} (Score: ${data.promoted.score || 0} pts) to Unit ${data.promoted.newUnit}!`;
      } else {
        alertMsg += `Empty waitlist - Unit is now vacant.`;
      }

      setPromotionFeed(prev => [alertMsg, ...prev]);
      alert("Cancellation completed. Waitlist promotion sequence executed successfully!");
      setShowCancelModal(false);
      fetchData();
      refreshGlobal();
    } catch (err) {
      alert(err.message || 'Failed to process cancellation');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckSla = async () => {
    setCheckingSla(true);
    try {
      const res = await api.checkSlaExpired();
      alert(res.message);
      if (res.promotions?.length > 0) {
        res.promotions.forEach(p => {
          const timestamp = new Date().toLocaleTimeString();
          const alertMsg = `[${timestamp}] ⏱️ SLA Expired on App ${p.expiredApplicationId}. Promoted ${p.promotedUserName} to Unit ${p.unitNumber}!`;
          setPromotionFeed(prev => [alertMsg, ...prev]);
        });
      }
      fetchData();
      refreshGlobal();
    } catch (err) {
      alert("Failed to check SLA: " + err.message);
    } finally {
      setCheckingSla(false);
    }
  };

  return (
    <div>
      <div className="mb-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--primary)', fontSize: '1.75rem' }}>Super Administrative Portal</h2>
          <p style={{ color: 'var(--text-muted)' }}>Perform critical vacancy updates, supervise SLA auto-promotion timers, and audit state ledger integrity.</p>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleCheckSla}
          disabled={checkingSla}
          style={{ background: '#d97706', borderColor: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>⚡</span> {checkingSla ? 'Checking SLA Deadlines...' : 'Run SLA Promotion Check Now'}
        </button>
      </div>

      {/* Aggregate stats */}
      {reports && (
        <div className="dashboard-grid">
          <div className="stat-card">
            <span className="stat-title">Total Applications</span>
            <span className="stat-value">{reports.totalApps}</span>
            <span className="stat-subtitle">{reports.submittedApps} active applications</span>
          </div>
          <div className="stat-card">
            <span className="stat-title">Allotted Units</span>
            <span className="stat-value" style={{ color: 'var(--success)' }}>{reports.allottedApps}</span>
            <span className="stat-subtitle">{reports.waitlistedApps} waitlisted applicants</span>
          </div>
          <div className="stat-card">
            <span className="stat-title">Total Revenue Verified</span>
            <span className="stat-value">Rs. {reports.totalRevenue.toLocaleString()}</span>
            <span className="stat-subtitle">Collected & verified</span>
          </div>
          <div className="stat-card">
            <span className="stat-title">Cryptographic Ledger Health</span>
            <span className="stat-value" style={{ color: reports.ledgerHealth?.isValid ? '#059669' : '#dc2626' }}>
              {reports.ledgerHealth?.isValid ? '100% Intact' : 'Tampered!'}
            </span>
            <span className="stat-subtitle">{reports.ledgerHealth?.totalBlocks || 0} SHA-256 blocks verified</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Allotment cancellation console */}
        <div className="card">
          <h3 className="card-title">Vacancy Generator (Active Allotments)</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            To test the automatic waitlist promotion logic, select any allotted or completed applicant below and cancel their allotment.
          </p>

          {allotments.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No active allotments found. Run the Allotment Engine first.</p>
          ) : (
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Applicant Name</th>
                    <th>Scheme Name</th>
                    <th>Allotted Unit</th>
                    <th>Score</th>
                    <th>Offer Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allotments.map(alt => (
                    <tr key={alt.id}>
                      <td><strong>{alt.personalDetails?.fullName || alt.userId}</strong></td>
                      <td>{alt.schemeName}</td>
                      <td><code>{alt.allottedUnitId}</code></td>
                      <td>
                        <span style={{ background: '#ecfdf5', color: '#047857', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                          {alt.score || 0} pts
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${alt.offerStatus === 'Accepted' ? 'badge-completed' : 'badge-payment'}`}>
                          {alt.offerStatus || 'Offered'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                          onClick={() => handleCancelClick(alt.id)}
                        >
                          Revoke Allotment (Trigger Vacancy)
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Live Waitlist Promotion Terminal Feed */}
        <div className="card">
          <h3 className="card-title">Live Promotion Event Feed</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Real-time feed showing waitlist shifts and unit reallocations.
          </p>

          <div style={{ 
            backgroundColor: '#0f172a', 
            color: '#38bdf8', 
            padding: '1rem', 
            borderRadius: 'var(--radius-md)', 
            fontFamily: 'monospace', 
            fontSize: '0.8rem', 
            minHeight: '260px',
            maxHeight: '360px',
            overflowY: 'auto'
          }}>
            <div style={{ color: '#94a3b8', borderBottom: '1px solid #334155', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
              &gt; TNHB SLA & Promotion Terminal Initialized...
            </div>
            {promotionFeed.length === 0 ? (
              <div style={{ color: '#64748b' }}>Awaiting vacancy or SLA expiration events...</div>
            ) : (
              promotionFeed.map((item, index) => (
                <div key={index} style={{ marginBottom: '0.5rem', lineHeight: '1.4' }}>
                  {item}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Revoke Allotment Order</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Cancelling this allotment will revoke possession rights and automatically trigger the promotion engine to allocate this unit to the highest-scoring waitlist applicant.
            </p>

            <div className="form-group">
              <label className="form-label">Official Cancellation Reason *</label>
              <select className="form-control" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}>
                <option value="Non-payment of Booking Amount">Non-payment of Booking Amount (SLA Breach)</option>
                <option value="Voluntary Forfeiture by Applicant">Voluntary Forfeiture by Applicant</option>
                <option value="Document Discrepancy Found in Post-Audit">Document Discrepancy Found in Post-Audit</option>
                <option value="Administrative Cancellation Order">Administrative Cancellation Order</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowCancelModal(false)}>Cancel</button>
              <button className="btn btn-secondary" style={{ backgroundColor: 'var(--danger)', color: 'white', borderColor: 'var(--danger)' }} disabled={loading} onClick={triggerCancellation}>
                {loading ? 'Processing Promotion...' : 'Confirm Revocation & Promote Waitlist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
