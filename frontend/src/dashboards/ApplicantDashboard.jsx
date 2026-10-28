import React, { useState, useEffect } from 'react';
import api from '../api';
import WaitlistExplanationModal from '../components/WaitlistExplanationModal';
import AllotmentLetterModal from '../components/AllotmentLetterModal';

export default function ApplicantDashboard({ user, refreshGlobal, onOpenVerify }) {
  const [schemes, setSchemes] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Innovation Modals State
  const [waitlistModalData, setWaitlistModalData] = useState(null);
  const [allotmentLetterData, setAllotmentLetterData] = useState(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [income, setIncome] = useState('');
  const [category, setCategory] = useState('General');
  const [ph, setPh] = useState(false);
  const [ex, setEx] = useState(false);
  const [singleWoman, setSingleWoman] = useState(false);
  const [residenceYears, setResidenceYears] = useState('5');
  const [uploadedDocs, setUploadedDocs] = useState({});

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const schData = await api.getSchemes();
      const appData = await api.getApplications();
      setSchemes(schData);
      setMyApplications(appData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApplyClick = (scheme) => {
    setSelectedScheme(scheme);
    setStep(1);
    setError('');
    // Prefill form
    setFullName(user.name);
    setAge('30');
    setAadhaar('');
    setIncome('');
    setCategory('General');
    setPh(false);
    setEx(false);
    setSingleWoman(false);
    setResidenceYears('5');
    setUploadedDocs({});
    setShowApplyModal(true);
  };

  const handleMockUpload = (docType) => {
    setUploadedDocs(prev => ({
      ...prev,
      [docType]: `${docType}_verified_copy.pdf`
    }));
  };

  const submitApplication = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Create Application with scoring attributes
      const app = await api.createApplication({
        schemeId: selectedScheme.id,
        personalDetails: {
          fullName,
          age,
          aadhaar,
          singleWoman,
          residenceYears: parseInt(residenceYears) || 0
        },
        income,
        category,
        reservationClaims: { ph, ex }
      });

      // 2. Upload Mock Documents
      const docTypes = ['identity_proof', 'income_certificate'];
      if (category !== 'General') docTypes.push('caste_certificate');
      if (ph) docTypes.push('ph_certificate');
      if (ex) docTypes.push('ex_servicemen_certificate');

      for (const dt of docTypes) {
        if (uploadedDocs[dt]) {
          await api.uploadDocument(app.id, dt, null);
        }
      }

      // 3. Submit
      await api.updateApplication(app.id, { action: 'submit' });

      setShowApplyModal(false);
      fetchData();
      refreshGlobal();
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (appId, amount, type) => {
    try {
      await api.payApplication(appId, amount, type);
      fetchData();
      refreshGlobal();
      alert(`Payment of Rs. ${amount.toLocaleString()} for ${type} was successful!`);
    } catch (err) {
      alert(err.message);
    }
  };

  // Innovation 2: Open explainable waitlist modal
  const handleExplainWaitlist = async (appId) => {
    try {
      const data = await api.getWaitlistStatus(appId);
      setWaitlistModalData(data);
    } catch (err) {
      alert("Failed to load waitlist explanation: " + err.message);
    }
  };

  // Innovation 12: View official Allotment Letter
  const handleViewAllotmentLetter = async (appId) => {
    try {
      const data = await api.getAllotmentLetter(appId);
      setAllotmentLetterData(data);
    } catch (err) {
      alert("Failed to load allotment order: " + err.message);
    }
  };

  // Innovation 7: Respond to allotment offer (Accept or Decline)
  const handleRespondOffer = async (appId, action) => {
    if (!window.confirm(`Are you sure you want to ${action.toUpperCase()} this housing unit allotment offer?`)) {
      return;
    }
    try {
      const res = await api.respondToOffer(appId, action);
      alert(res.message);
      fetchData();
      refreshGlobal();
    } catch (err) {
      alert("Action failed: " + err.message);
    }
  };

  // Innovation 7 Demo: Fast-forward offer SLA expiration
  const handleSimulateOfferExpiry = async (appId) => {
    try {
      const res = await api.simulateOfferExpiry(appId);
      alert(res.message);
      fetchData();
      refreshGlobal();
    } catch (err) {
      alert("Simulation failed: " + err.message);
    }
  };

  // Calculate remaining SLA time for an offer
  const calculateSlaRemainingText = (expiresAt) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Offer Expired";
    const hrs = Math.floor(diff / (1000 * 3600));
    const mins = Math.floor((diff % (1000 * 3600)) / (1000 * 60));
    return `${hrs}h ${mins}m remaining to accept`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Draft': return <span className="badge badge-draft">Draft</span>;
      case 'Submitted': return <span className="badge badge-submitted">Submitted</span>;
      case 'Payment Pending': return <span className="badge badge-payment">Payment Pending</span>;
      case 'Payment Verified': return <span className="badge badge-submitted">Payment Verified</span>;
      case 'Document Verification': return <span className="badge badge-payment">Verification In Progress</span>;
      case 'Eligible': return <span className="badge badge-eligible">Eligible for Allotment</span>;
      case 'Allotted': return <span className="badge badge-allotted">🎉 House Allotted</span>;
      case 'Waitlisted': return <span className="badge badge-waitlisted">Waitlisted</span>;
      case 'Offer Expired': return <span className="badge badge-rejected">SLA Offer Expired</span>;
      case 'Offer Declined': return <span className="badge badge-rejected">Offer Declined</span>;
      case 'Completed': return <span className="badge badge-completed">Possessed & Finalized</span>;
      case 'Rejected': return <span className="badge badge-rejected">Rejected</span>;
      case 'Cancelled': return <span className="badge badge-rejected">Cancelled</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <div>
      <div className="mb-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--primary)', fontSize: '1.75rem' }}>Welcome, {user.name}</h2>
          <p style={{ color: 'var(--text-muted)' }}>Explore state housing schemes, monitor transparent scoring, and track waitlist movement in real-time.</p>
        </div>
      </div>

      {/* Active Housing Schemes */}
      <div className="card">
        <h3 className="card-title">Available Housing Schemes</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {schemes.map(s => {
            const hasApplied = myApplications.some(a => a.schemeId === s.id && a.status !== 'Rejected' && a.status !== 'Cancelled');
            return (
              <div key={s.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', backgroundColor: 'var(--surface)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.code}</span>
                    <span className="badge badge-eligible">{s.type}</span>
                  </div>
                  <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>{s.name}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>📍 {s.location}, {s.district}</p>
                  
                  <div style={{ fontSize: '0.85rem', marginBottom: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                    <div className="d-flex justify-between">
                      <span>Total Units:</span>
                      <strong>{s.unitsCount}</strong>
                    </div>
                    <div className="d-flex justify-between">
                      <span>Income Limit:</span>
                      <strong>Rs. {s.incomeLimit.toLocaleString()}/yr</strong>
                    </div>
                    <div className="d-flex justify-between">
                      <span>Rule Engine:</span>
                      <strong style={{ color: '#059669' }}>Rules v{s.ruleVersion || 1} (Transparent)</strong>
                    </div>
                    <div className="d-flex justify-between">
                      <span>Last Date to Apply:</span>
                      <strong style={{ color: 'var(--danger)' }}>{s.endDate}</strong>
                    </div>
                  </div>
                </div>

                {hasApplied ? (
                  <button className="btn btn-secondary" disabled style={{ width: '100%' }}>Already Applied</button>
                ) : (
                  <button className="btn btn-primary" onClick={() => handleApplyClick(s)} style={{ width: '100%' }}>Apply Now</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Applicant Applications */}
      <div className="card">
        <h3 className="card-title">My Applications & Status Timeline</h3>
        {myApplications.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>You haven't submitted any applications yet.</p>
        ) : (
          myApplications.map(app => {
            const steps = [
              { label: 'Submitted', key: ['Submitted', 'Payment Pending', 'Payment Verified', 'Document Verification', 'Eligible', 'Allotted', 'Waitlisted', 'Completed'] },
              { label: 'Payment Verified', key: ['Payment Verified', 'Document Verification', 'Eligible', 'Allotted', 'Waitlisted', 'Completed'] },
              { label: 'Docs Verified', key: ['Eligible', 'Allotted', 'Waitlisted', 'Completed'] },
              { label: 'Allotment Draw', key: ['Allotted', 'Waitlisted', 'Completed'] }
            ];

            const slaText = calculateSlaRemainingText(app.offerExpiresAt);

            return (
              <div key={app.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.5rem', marginBottom: '1.5rem', backgroundColor: 'var(--surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <div>
                    <h4 style={{ color: 'var(--primary)' }}>{app.schemeName}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      App ID: {app.id} | Category: {app.category}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Innovation 1: Priority Score Badge */}
                    {app.score !== undefined && (
                      <span style={{
                        background: '#ecfdf5',
                        color: '#047857',
                        border: '1px solid #a7f3d0',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        ⭐ Score: {app.score} pts
                      </span>
                    )}
                    {getStatusBadge(app.status)}
                  </div>
                </div>

                {/* Status Timeline */}
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '1.5rem 0', flexWrap: 'wrap', gap: '1rem' }}>
                  {steps.map((st, i) => {
                    const isCompleted = st.key.includes(app.status);
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ 
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '50%', 
                          backgroundColor: isCompleted ? 'var(--success)' : 'var(--border-color)', 
                          color: 'white', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: '0.8rem', 
                          fontWeight: 'bold' 
                        }}>
                          {isCompleted ? '✓' : i + 1}
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: isCompleted ? 'var(--text)' : 'var(--text-muted)' }}>{st.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* INNOVATION 2: Waitlisted Info with Explainable Waitlist CTA */}
                {app.status === 'Waitlisted' && (
                  <div style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fef3c7',
                    borderLeft: '4px solid #f59e0b',
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    margin: '1rem 0'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <h5 style={{ color: '#b45309', margin: '0 0 4px 0' }}>
                          Waitlist Position: {app.waitlistRank || 'WL-Active'}
                        </h5>
                        <p style={{ fontSize: '0.85rem', color: '#78350f', margin: 0 }}>
                          Sorted strictly by Priority Score ({app.score} pts). As vacancies occur or offers expire, your position advances automatically.
                        </p>
                      </div>

                      <button
                        className="btn btn-primary"
                        onClick={() => handleExplainWaitlist(app.id)}
                        style={{
                          background: '#d97706',
                          borderColor: '#b45309',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        ⏱️ Explain Rank & Wait Time (ETA)
                      </button>
                    </div>
                  </div>
                )}

                {/* INNOVATION 7 & 12: Allotted Actions with SLA Timer & Digital Letter */}
                {app.status === 'Allotted' && (
                  <div style={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderLeft: '4px solid #16a34a',
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    margin: '1rem 0'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <h5 style={{ color: '#15803d', marginBottom: '0.35rem' }}>
                          🎉 Congratulations! Housing Unit Allotted
                        </h5>
                        <p style={{ fontSize: '0.85rem', color: '#166534', margin: '0 0 8px 0' }}>
                          You have been allotted unit <strong>{app.allottedUnitId}</strong> under {app.allotmentReason || 'Merit Pool'}.
                        </p>
                      </div>

                      {/* SLA Countdown Timer */}
                      {slaText && app.offerStatus === 'Offered' && (
                        <div style={{
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          color: '#b91c1c',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span>⏰</span> SLA Deadline: {slaText}
                        </div>
                      )}
                    </div>

                    {/* Offer Actions */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
                      {app.offerStatus === 'Offered' && (
                        <>
                          <button
                            className="btn btn-primary"
                            onClick={() => handleRespondOffer(app.id, 'accept')}
                            style={{ background: '#16a34a', borderColor: '#15803d' }}
                          >
                            ✓ Accept Allotment Offer
                          </button>

                          <button
                            className="btn btn-secondary"
                            onClick={() => handleRespondOffer(app.id, 'decline')}
                            style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                          >
                            ✕ Decline Offer (Pass to Next in Waitlist)
                          </button>

                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleSimulateOfferExpiry(app.id)}
                            title="Simulate timer reaching zero to demonstrate auto-promotion to examiner"
                            style={{ background: '#f1f5f9', fontSize: '11px' }}
                          >
                            ⏩ Simulate SLA Expiry (Demo)
                          </button>
                        </>
                      )}

                      {/* View & Download Digital Allotment Letter */}
                      <button
                        className="btn btn-primary"
                        onClick={() => handleViewAllotmentLetter(app.id)}
                        style={{
                          background: '#1e40af',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        📜 View Allotment Order (HMAC QR)
                      </button>

                      <button
                        className="btn btn-gold"
                        onClick={() => handlePay(app.id, 100000, 'Booking Amount')}
                      >
                        Pay Booking Amount (Rs. 1,00,000)
                      </button>
                    </div>
                  </div>
                )}

                {/* Offer Expired / Declined Alert */}
                {(app.status === 'Offer Expired' || app.status === 'Offer Declined') && (
                  <div style={{ backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '1rem', borderRadius: 'var(--radius-md)', margin: '1rem 0' }}>
                    <h5 style={{ color: '#b91c1c' }}>Offer Withdrawn: {app.status}</h5>
                    <p style={{ fontSize: '0.85rem', color: '#7f1d1d' }}>
                      The 72-hour offer window closed or was declined. As per SLA norms, the housing unit has been automatically promoted to the next candidate on the waitlist.
                    </p>
                  </div>
                )}

                {/* Payment Pending Actions */}
                {app.status === 'Payment Pending' && (
                  <div style={{ backgroundColor: 'var(--warning-bg)', borderLeft: '4px solid var(--warning)', padding: '1.25rem', borderRadius: 'var(--radius-md)', margin: '1rem 0' }}>
                    <h5 style={{ color: 'var(--warning)', marginBottom: '0.5rem' }}>Application Fee Pending</h5>
                    <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text)' }}>
                      To forward your application for document verification, please pay the standard application fee.
                    </p>
                    <button className="btn btn-primary" onClick={() => handlePay(app.id, 500, 'Application Fee')}>
                      Pay Application Fee (Rs. 500)
                    </button>
                  </div>
                )}

                {/* Rejected Reason */}
                {app.status === 'Rejected' && (
                  <div style={{ backgroundColor: 'var(--danger-bg)', borderLeft: '4px solid var(--danger)', padding: '1rem', borderRadius: 'var(--radius-md)', margin: '1rem 0' }}>
                    <h5 style={{ color: 'var(--danger)' }}>Application Rejected</h5>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text)' }}>Reason: {app.rejectionReason || 'Failed eligibility criteria.'}</p>
                  </div>
                )}

                {/* Completed Details */}
                {app.status === 'Completed' && (
                  <div style={{ backgroundColor: 'var(--success-bg)', borderLeft: '4px solid var(--success)', padding: '1rem', borderRadius: 'var(--radius-md)', margin: '1rem 0' }}>
                    <h5 style={{ color: 'var(--success)' }}>Agreement Complete & Allotment Closed</h5>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text)', marginBottom: '10px' }}>
                      Your agreement has been executed for unit <strong>{app.allottedUnitId}</strong>. Possession letters and keys handover scheduled at District Housing Office.
                    </p>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleViewAllotmentLetter(app.id)}
                    >
                      📜 View Certified Allotment Order
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Application Wizard Modal with Priority Scoring Attributes */}
      {showApplyModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <h3 style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>
              Application Form: {selectedScheme?.name}
            </h3>

            {/* Wizard Steps */}
            <div className="form-step-container">
              <div className={`form-step ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>1. Personal</div>
              <div className={`form-step ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>2. Quota & Scoring Factors</div>
              <div className={`form-step ${step === 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>3. Documents</div>
            </div>

            {error && <div style={{ color: 'var(--danger)', padding: '0.5rem', backgroundColor: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}

            {/* Step 1: Personal Details */}
            {step === 1 && (
              <div>
                <div className="form-group">
                  <label className="form-label">Full Name (As in Aadhaar)</label>
                  <input type="text" className="form-control" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Age</label>
                    <input type="number" className="form-control" value={age} onChange={(e) => setAge(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Aadhaar Card Number</label>
                    <input type="text" placeholder="12-digit number" className="form-control" value={aadhaar} onChange={(e) => setAadhaar(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                  <button className="btn btn-secondary" onClick={() => setShowApplyModal(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={() => {
                    if (!fullName || !aadhaar || !age) {
                      setError('Please fill in all fields.');
                      return;
                    }
                    if (aadhaar.length !== 12 || isNaN(aadhaar)) {
                      setError('Aadhaar must be a valid 12-digit number.');
                      return;
                    }
                    setError('');
                    setStep(2);
                  }}>Next Step</button>
                </div>
              </div>
            )}

            {/* Step 2: Quota & Priority Scoring Parameters */}
            {step === 2 && (
              <div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Social Quota Category</label>
                    <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="General">General (Merit Pool)</option>
                      <option value="SC/ST">SC / ST Category</option>
                      <option value="BC">Backward Classes (BC)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Annual Family Income (Rs.)</label>
                    <input type="number" placeholder="Enter annual income" className="form-control" value={income} onChange={(e) => setIncome(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Years of Permanent State Residence</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    placeholder="e.g. 5"
                    className="form-control"
                    value={residenceYears}
                    onChange={(e) => setResidenceYears(e.target.value)}
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    Awarded 2 priority points per year of state residence under board norms.
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Special Affirmative Categories</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={ph} onChange={(e) => setPh(e.target.checked)} />
                      Physically Handicapped / Differently Abled (PH) Quota (+20 pts)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={ex} onChange={(e) => setEx(e.target.checked)} />
                      Ex-Servicemen / Defense Quota (+15 pts)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={singleWoman} onChange={(e) => setSingleWoman(e.target.checked)} />
                      Single-Woman / Widow Household Security Quota (+15 pts)
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                  <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
                  <button className="btn btn-primary" onClick={() => {
                    if (!income || isNaN(income) || income <= 0) {
                      setError('Please enter a valid annual income.');
                      return;
                    }
                    setError('');
                    setStep(3);
                  }}>Next Step</button>
                </div>
              </div>
            )}

            {/* Step 3: Documents Upload */}
            {step === 3 && (
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Please upload supporting documentation to verify your eligibility. (Click upload to attach)
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '0.9rem' }}>Aadhaar / Identity Proof</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{uploadedDocs.identity_proof || 'No file selected'}</div>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleMockUpload('identity_proof')}>Upload</button>
                  </div>

                  <div style={{ border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '0.9rem' }}>Income Certificate (Tahsildar)</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{uploadedDocs.income_certificate || 'No file selected'}</div>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleMockUpload('income_certificate')}>Upload</button>
                  </div>

                  {category !== 'General' && (
                    <div style={{ border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '0.9rem' }}>Community Certificate ({category})</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{uploadedDocs.caste_certificate || 'No file selected'}</div>
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleMockUpload('caste_certificate')}>Upload</button>
                    </div>
                  )}

                  {ph && (
                    <div style={{ border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '0.9rem' }}>Disability Certificate (PH)</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{uploadedDocs.ph_certificate || 'No file selected'}</div>
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleMockUpload('ph_certificate')}>Upload</button>
                    </div>
                  )}

                  {ex && (
                    <div style={{ border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '0.9rem' }}>Ex-Servicemen Identity Proof</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{uploadedDocs.ex_servicemen_certificate || 'No file selected'}</div>
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleMockUpload('ex_servicemen_certificate')}>Upload</button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                  <button className="btn btn-secondary" onClick={() => setStep(2)}>Back</button>
                  <button className="btn btn-success" disabled={loading || !uploadedDocs.identity_proof || !uploadedDocs.income_certificate} onClick={submitApplication}>
                    {loading ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
                {(!uploadedDocs.identity_proof || !uploadedDocs.income_certificate) && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.5rem', textAlign: 'right' }}>
                    * Identity Proof and Income Certificate are mandatory.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Innovation 2 Modal: Explainable Waitlist */}
      {waitlistModalData && (
        <WaitlistExplanationModal
          statusData={waitlistModalData}
          onClose={() => setWaitlistModalData(null)}
        />
      )}

      {/* Innovation 12 Modal: Digital Allotment Letter */}
      {allotmentLetterData && (
        <AllotmentLetterModal
          letter={allotmentLetterData}
          onClose={() => setAllotmentLetterData(null)}
          onOpenVerify={onOpenVerify}
        />
      )}
    </div>
  );
}
