import React, { useState, useEffect } from 'react';
import api from '../api';

export default function VerificationOfficerDashboard({ user, refreshGlobal }) {
  const [queue, setQueue] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [docStatuses, setDocStatuses] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      const data = await api.getVerificationQueue();
      setQueue(data);
      if (data.length > 0 && !selectedApp) {
        selectApplication(data[0]);
      } else if (data.length === 0) {
        setSelectedApp(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectApplication = (app) => {
    setSelectedApp(app);
    setRemarks('');
    // Initialize doc statuses
    const initialStatuses = {};
    app.documents.forEach(d => {
      initialStatuses[d.type] = 'Verified'; // Default to verified for easy approval
    });
    setDocStatuses(initialStatuses);
  };

  const handleDocStatusChange = (docType, status) => {
    setDocStatuses(prev => ({ ...prev, [docType]: status }));
  };

  const handleAction = async (status) => {
    // status: 'Verified' (becomes Eligible), 'Clarification Required', 'Rejected'
    if (!selectedApp) return;
    if ((status === 'Rejected' || status === 'Clarification Required') && !remarks.trim()) {
      alert("Please provide remarks/reasons for rejection or clarification.");
      return;
    }

    setActionLoading(true);
    try {
      await api.verifyDocuments({
        applicationId: selectedApp.id,
        status,
        remarks,
        documentStatus: docStatuses
      });
      alert(`Application updated successfully: Marked as ${status === 'Verified' ? 'Eligible' : status}`);
      setSelectedApp(null);
      fetchQueue();
      refreshGlobal();
    } catch (err) {
      alert(err.message || 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-2">
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--primary)', fontSize: '1.75rem' }}>Document Verification Workspace</h2>
        <p style={{ color: 'var(--text-muted)' }}>Review uploaded certificates, check reservations, and mark applicants as Eligible for the allotment lottery.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: queue.length > 0 ? '300px 1fr' : '1fr', gap: '1.5rem' }}>
        {/* Verification Queue Sidebar */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 className="card-title" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Pending Queue ({queue.length})</h3>
          {queue.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No applications pending verification.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '550px', overflowY: 'auto' }}>
              {queue.map(app => (
                <div 
                  key={app.id} 
                  onClick={() => selectApplication(app)}
                  style={{ 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-md)', 
                    padding: '0.85rem', 
                    cursor: 'pointer',
                    backgroundColor: selectedApp?.id === app.id ? 'rgba(var(--primary-hsl), 0.06)' : 'var(--surface)',
                    borderColor: selectedApp?.id === app.id ? 'var(--primary)' : 'var(--border-color)',
                    transition: 'var(--transition)'
                  }}
                >
                  <strong style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>{app.personalDetails?.fullName || 'Applicant'}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    ID: {app.id} | Income: {app.income.toLocaleString()}<br />
                    Scheme: {app.schemeCode}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Application Inspector */}
        {selectedApp ? (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ color: 'var(--primary)' }}>Verification Audit: {selectedApp.personalDetails?.fullName}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Application Reference: {selectedApp.id} | Scheme: {selectedApp.schemeName}</span>
              </div>
              <div>
                <span className="badge badge-submitted">{selectedApp.status}</span>
              </div>
            </div>

            {/* Profile Meta Info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', backgroundColor: 'rgba(var(--background-hsl), 0.5)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Aadhaar Number</span>
                <strong style={{ fontSize: '0.9rem' }}>{selectedApp.personalDetails?.aadhaar || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Age</span>
                <strong style={{ fontSize: '0.9rem' }}>{selectedApp.personalDetails?.age || 'N/A'} Years</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Family Income (Annual)</span>
                <strong style={{ fontSize: '0.9rem' }}>Rs. {selectedApp.income.toLocaleString()}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Social Category</span>
                <strong style={{ fontSize: '0.9rem' }}>{selectedApp.category}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>PH Quota Claimed</span>
                <strong style={{ fontSize: '0.9rem' }}>{selectedApp.reservationClaims?.ph ? 'Yes (+20 pts priority)' : 'No'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Ex-Servicemen Quota</span>
                <strong style={{ fontSize: '0.9rem' }}>{selectedApp.reservationClaims?.ex ? 'Yes (+15 pts priority)' : 'No'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Priority Score (Rule Engine)</span>
                <strong style={{ fontSize: '1.05rem', color: '#059669' }}>⭐ {selectedApp.score || 0} Points</strong>
              </div>
            </div>

            {/* Uploaded Documents List */}
            <div>
              <h4 style={{ color: 'var(--primary)', marginBottom: '0.75rem', fontSize: '1.05rem' }}>Document Checklists & Verification</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {selectedApp.documents && selectedApp.documents.map((doc, idx) => (
                  <div key={idx} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface)' }}>
                    <div>
                      <strong style={{ textTransform: 'capitalize', fontSize: '0.95rem' }}>{doc.type.replace('_', ' ')}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Attachment: {doc.name}</span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <a href="#" onClick={(e) => { e.preventDefault(); alert(`Simulating file view: ${doc.name}`); }} style={{ fontSize: '0.85rem', color: 'var(--info)', fontWeight: 600, textDecoration: 'none' }}>
                        👁 View File
                      </a>
                      
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className={`btn btn-sm ${docStatuses[doc.type] === 'Verified' ? 'btn-success' : 'btn-secondary'}`}
                          onClick={() => handleDocStatusChange(doc.type, 'Verified')}
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          Verify
                        </button>
                        <button 
                          className={`btn btn-sm ${docStatuses[doc.type] === 'Clarification Required' ? 'btn-gold' : 'btn-secondary'}`}
                          onClick={() => handleDocStatusChange(doc.type, 'Clarification Required')}
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          Clarify
                        </button>
                        <button 
                          className={`btn btn-sm ${docStatuses[doc.type] === 'Rejected' ? 'btn-danger' : 'btn-secondary'}`}
                          onClick={() => handleDocStatusChange(doc.type, 'Rejected')}
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Officer Remarks & Decision Form */}
            <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Verification Officer Remarks & Notes</label>
                <textarea 
                  className="form-control" 
                  rows="3" 
                  placeholder="Enter remarks detailing reasons for approval, rejection or requested clarifications..." 
                  value={remarks} 
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button 
                  className="btn btn-danger" 
                  disabled={actionLoading}
                  onClick={() => handleAction('Rejected')}
                >
                  Reject Application
                </button>
                <button 
                  className="btn btn-gold" 
                  disabled={actionLoading}
                  onClick={() => handleAction('Clarification Required')}
                >
                  Request Clarification
                </button>
                <button 
                  className="btn btn-success" 
                  disabled={actionLoading}
                  onClick={() => handleAction('Verified')}
                >
                  Verify & Approve (Eligible)
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>✓</div>
            <h3 style={{ color: 'var(--primary)' }}>Verification Queue Clear</h3>
            <p style={{ color: 'var(--text-muted)' }}>There are currently no applicant document submissions awaiting verification.</p>
          </div>
        )}
      </div>
    </div>
  );
}
