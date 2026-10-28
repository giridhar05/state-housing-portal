import React, { useState, useEffect } from 'react';
import api from './api';
import ApplicantDashboard from './dashboards/ApplicantDashboard';
import VerificationOfficerDashboard from './dashboards/VerificationOfficerDashboard';
import FinanceOfficerDashboard from './dashboards/FinanceOfficerDashboard';
import AllotmentOfficerDashboard from './dashboards/AllotmentOfficerDashboard';
import SystemAdminDashboard from './dashboards/SystemAdminDashboard';
import SuperAdminDashboard from './dashboards/SuperAdminDashboard';
import ChatbotWidget from './components/ChatbotWidget';
import PublicVerifyPage from './components/PublicVerifyPage';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [waitlists, setWaitlists] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [verifyTarget, setVerifyTarget] = useState(null);

  // Auth form states
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regRole, setRegRole] = useState('Applicant');
  
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    // Check if user came from a QR code scan
    const urlParams = new URLSearchParams(window.location.search);
    const qAllotmentId = urlParams.get('allotmentId');
    const qSig = urlParams.get('sig');
    if (qAllotmentId && qSig) {
      setVerifyTarget({ allotmentId: qAllotmentId, sig: qSig });
      setActiveTab('verify');
    }

    initApp();
  }, []);

  const initApp = async () => {
    const token = api.getToken();
    if (token) {
      try {
        const userProfile = await api.getMe();
        setCurrentUser(userProfile);
        fetchNotifications();
        fetchWaitlistsAndSchemes();
      } catch (e) {
        api.setToken(null);
        setCurrentUser(null);
      }
    }
    setLoading(false);
  };

  const fetchNotifications = async () => {
    try {
      const list = await api.getNotifications();
      setNotifications(list);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWaitlistsAndSchemes = async () => {
    try {
      const sch = await api.getSchemes();
      setSchemes(sch);
      
      const apps = await api.getApplications();
      // Filter waitlisted
      const wlApps = apps.filter(a => a.status === 'Waitlisted').sort((a, b) => {
        return (a.waitlistRank || '').localeCompare(b.waitlistRank || '');
      });
      setWaitlists(wlApps);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!mobile || !password) {
      setAuthError('Please fill in all fields.');
      return;
    }
    try {
      setLoading(true);
      const res = await api.login(mobile, password);
      setCurrentUser(res.user);
      setActiveTab('dashboard');
      // Fetch details
      const notifs = await api.getNotifications();
      setNotifications(notifs);
      fetchWaitlistsAndSchemes();
    } catch (err) {
      setAuthError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!regName || !regMobile || !regEmail || !regPassword) {
      setAuthError('Please fill in all required fields.');
      return;
    }
    if (regPassword !== regConfirm) {
      setAuthError('Passwords do not match.');
      return;
    }
    try {
      setLoading(true);
      const res = await api.register({
        name: regName,
        mobile: regMobile,
        email: regEmail,
        password: regPassword,
        role: regRole
      });
      setCurrentUser(res.user);
      setActiveTab('dashboard');
      fetchNotifications();
      fetchWaitlistsAndSchemes();
    } catch (err) {
      setAuthError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.setToken(null);
    setCurrentUser(null);
    setNotifications([]);
    setMobile('');
    setPassword('');
    setRegName('');
    setRegMobile('');
    setRegEmail('');
    setRegPassword('');
    setRegConfirm('');
  };

  const quickFillLogin = (demoMobile) => {
    setMobile(demoMobile);
    setPassword('password123');
    setAuthMode('login');
  };

  const handleMarkNotificationsRead = async () => {
    try {
      await api.readNotifications();
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const refreshGlobal = () => {
    fetchNotifications();
    fetchWaitlistsAndSchemes();
  };

  const handleOpenVerify = (allotmentId, sig) => {
    setVerifyTarget({ allotmentId, sig });
    setActiveTab('verify');
  };

  const renderDashboard = () => {
    if (!currentUser) return null;
    
    switch (currentUser.role) {
      case 'Applicant':
        return <ApplicantDashboard user={currentUser} refreshGlobal={refreshGlobal} onOpenVerify={handleOpenVerify} />;
      case 'Verification Officer':
        return <VerificationOfficerDashboard user={currentUser} refreshGlobal={refreshGlobal} />;
      case 'Finance Officer':
        return <FinanceOfficerDashboard user={currentUser} refreshGlobal={refreshGlobal} />;
      case 'Allotment Officer':
        return <AllotmentOfficerDashboard user={currentUser} refreshGlobal={refreshGlobal} />;
      case 'System Administrator':
        return <SystemAdminDashboard user={currentUser} refreshGlobal={refreshGlobal} />;
      case 'Super Admin':
        return <SuperAdminDashboard user={currentUser} refreshGlobal={refreshGlobal} />;
      default:
        return <p>Dashboard not found for role: {currentUser.role}</p>;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--background)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 600 }}>
          Loading Housing Board Portal...
        </div>
      </div>
    );
  }

  // If not logged in, render Login/Register UI or Public QR Verify Page
  if (!currentUser) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
        <header className="header">
          <div className="logo-section">
            <div className="logo-icon">🏛️</div>
            <div className="logo-text">
              <h1>Tamil Nadu Housing Board</h1>
              <span>Computerized Allotment Portal</span>
            </div>
          </div>
          <div>
            <button
              onClick={() => setActiveTab(activeTab === 'verify' ? 'dashboard' : 'verify')}
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {activeTab === 'verify' ? '← Back to Login' : '🔍 Verify Allotment QR'}
            </button>
          </div>
        </header>

        {activeTab === 'verify' ? (
          <PublicVerifyPage
            allotmentId={verifyTarget?.allotmentId}
            sig={verifyTarget?.sig}
            onBack={() => setActiveTab('dashboard')}
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 1.5rem' }}>
            <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '2.5rem 2rem', boxShadow: 'var(--shadow-lg)' }}>
              
              <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', marginBottom: '2rem' }}>
                <button 
                  onClick={() => { setAuthMode('login'); setAuthError(''); }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: 'transparent',
                    border: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: authMode === 'login' ? 'var(--primary)' : 'var(--text-muted)',
                    borderBottom: authMode === 'login' ? '3px solid var(--primary)' : 'none',
                    cursor: 'pointer',
                    marginBottom: '-2px'
                  }}
                >
                  Sign In
                </button>
                <button 
                  onClick={() => { setAuthMode('register'); setAuthError(''); }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: 'transparent',
                    border: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: authMode === 'register' ? 'var(--primary)' : 'var(--text-muted)',
                    borderBottom: authMode === 'register' ? '3px solid var(--primary)' : 'none',
                    cursor: 'pointer',
                    marginBottom: '-2px'
                  }}
                >
                  Create Account
                </button>
              </div>

              {authError && (
                <div style={{
                  color: 'var(--danger)',
                  padding: '0.75rem',
                  backgroundColor: 'var(--danger-bg)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1.5rem',
                  fontSize: '0.85rem',
                  borderLeft: '4px solid var(--danger)'
                }}>
                  {authError}
                </div>
              )}

              {authMode === 'login' && (
                <form onSubmit={handleLogin}>
                  <div className="form-group">
                    <label className="form-label">Mobile Number or Email</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 9812345670" 
                      className="form-control" 
                      value={mobile} 
                      onChange={(e) => setMobile(e.target.value)} 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input 
                      type="password" 
                      placeholder="Enter password" 
                      className="form-control" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }}>
                    Sign In to Portal
                  </button>

                  <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>
                      QUICK ROLE DEMO LOGINS (PASSWORD: password123):
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <button type="button" onClick={() => quickFillLogin('9812345670')} className="btn btn-secondary btn-sm">Applicant (Rajesh)</button>
                      <button type="button" onClick={() => quickFillLogin('9812345671')} className="btn btn-secondary btn-sm">Applicant (Priya)</button>
                      <button type="button" onClick={() => quickFillLogin('9876543212')} className="btn btn-secondary btn-sm">Verification Officer</button>
                      <button type="button" onClick={() => quickFillLogin('9876543214')} className="btn btn-secondary btn-sm">Allotment Officer</button>
                      <button type="button" onClick={() => quickFillLogin('9876543210')} className="btn btn-secondary btn-sm">System Admin</button>
                      <button type="button" onClick={() => quickFillLogin('9876543211')} className="btn btn-secondary btn-sm">Super Admin</button>
                    </div>
                  </div>
                </form>
              )}

              {authMode === 'register' && (
                <form onSubmit={handleRegister}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Sundar Pichai" 
                      className="form-control" 
                      value={regName} 
                      onChange={(e) => setRegName(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Mobile Number</label>
                      <input 
                        type="text" 
                        placeholder="10-digit mobile" 
                        className="form-control" 
                        value={regMobile} 
                        onChange={(e) => setRegMobile(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Role</label>
                      <select className="form-control" value={regRole} onChange={(e) => setRegRole(e.target.value)}>
                        <option value="Applicant">Citizen Applicant</option>
                        <option value="Verification Officer">Verification Officer</option>
                        <option value="Allotment Officer">Allotment Officer</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="name@gmail.com" 
                      className="form-control" 
                      value={regEmail} 
                      onChange={(e) => setRegEmail(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Password</label>
                      <input 
                        type="password" 
                        placeholder="Password" 
                        className="form-control" 
                        value={regPassword} 
                        onChange={(e) => setRegPassword(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Confirm Password</label>
                      <input 
                        type="password" 
                        placeholder="Confirm" 
                        className="form-control" 
                        value={regConfirm} 
                        onChange={(e) => setRegConfirm(e.target.value)} 
                        required 
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-success" style={{ width: '100%', padding: '0.85rem', marginTop: '1rem' }}>
                    Register Secure Account
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Floating Bilingual AI Assistant */}
        <ChatbotWidget currentUser={currentUser} />
      </div>
    );
  }

  const unreadNotifications = notifications.filter(n => !n.isRead);

  // Authenticated View
  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="logo-section">
          <div className="logo-icon">🏛️</div>
          <div className="logo-text">
            <h1>Tamil Nadu Housing Board</h1>
            <span>Transparent Allotment & Waitlist Core</span>
          </div>
        </div>

        <div className="header-actions">
          <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
            Logged in: <strong style={{ color: '#fff' }}>{currentUser.name}</strong>
          </span>
          <span className="user-badge">{currentUser.role}</span>

          {/* Notifications Bell */}
          <div style={{ position: 'relative' }}>
            <button className="notif-btn" onClick={() => setShowNotifDropdown(!showNotifDropdown)}>
              🔔
              {unreadNotifications.length > 0 && (
                <span className="notif-badge">{unreadNotifications.length}</span>
              )}
            </button>

            {showNotifDropdown && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '35px',
                width: '320px',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-lg)',
                borderRadius: 'var(--radius-md)',
                zIndex: 150,
                padding: '1rem',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>Notifications ({notifications.length})</strong>
                  {unreadNotifications.length > 0 && (
                    <button onClick={handleMarkNotificationsRead} style={{ background: 'transparent', border: 'none', color: 'var(--info)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Mark all read</button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>No notifications.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {notifications.map(n => (
                      <div key={n.id} style={{ fontSize: '0.75rem', padding: '0.5rem', borderRadius: '4px', backgroundColor: n.isRead ? 'transparent' : 'rgba(var(--primary-hsl), 0.04)', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{n.title}</div>
                        <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0' }}>{n.message}</p>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(n.createdAt).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Secure Logout */}
          <button className="btn btn-secondary btn-sm" onClick={handleLogout} style={{ border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
            Logout 🚪
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="main-wrapper">
        {/* Sidebar */}
        <aside className="sidebar">
          <div 
            onClick={() => setActiveTab('dashboard')} 
            className={`sidebar-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            📊 My Dashboard
          </div>

          <div 
            onClick={() => { setActiveTab('waitlists'); fetchWaitlistsAndSchemes(); }} 
            className={`sidebar-nav-item ${activeTab === 'waitlists' ? 'active' : ''}`}
          >
            📋 Explainable Waitlists
          </div>

          <div 
            onClick={() => { setActiveTab('schemes'); fetchWaitlistsAndSchemes(); }} 
            className={`sidebar-nav-item ${activeTab === 'schemes' ? 'active' : ''}`}
          >
            🏢 Housing Schemes
          </div>

          <div 
            onClick={() => { setVerifyTarget(null); setActiveTab('verify'); }} 
            className={`sidebar-nav-item ${activeTab === 'verify' ? 'active' : ''}`}
          >
            🔍 QR Document Verification
          </div>
        </aside>

        {/* Content Body */}
        <main className="content-body">
          {activeTab === 'dashboard' && renderDashboard()}

          {activeTab === 'verify' && (
            <PublicVerifyPage
              allotmentId={verifyTarget?.allotmentId}
              sig={verifyTarget?.sig}
              onBack={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'waitlists' && (
            <div className="card">
              <h3 className="card-title">State Housing Waitlist Master Board</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                View waitlist queues across all schemes. Ranked strictly by priority score descending. Ranks advance automatically when vacancies open or SLA offer timers expire.
              </p>

              {waitlists.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No waitlisted applicants found across schemes.</p>
              ) : (
                <div className="custom-table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Scheme Code</th>
                        <th>Applicant</th>
                        <th>Priority Score</th>
                        <th>Original Rank</th>
                        <th>Current Rank</th>
                        <th>Category</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waitlists.map(wl => (
                        <tr key={wl.id}>
                          <td><strong>{wl.schemeCode}</strong></td>
                          <td>
                            <strong>{wl.personalDetails?.fullName}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {wl.id}</div>
                          </td>
                          <td>
                            <span style={{ background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                              {wl.score || 0} pts
                            </span>
                          </td>
                          <td><span style={{ color: 'var(--text-muted)' }}>WL-{String(wl.originalWaitlistRank || wl.waitlistRank).replace('WL-', '')}</span></td>
                          <td><strong style={{ color: 'var(--warning)' }}>{wl.waitlistRank}</strong></td>
                          <td>{wl.category}</td>
                          <td><span className="badge badge-waitlisted">Waiting Queue</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'schemes' && (
            <div className="card">
              <h3 className="card-title">Registered Housing Schemes Catalog</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {schemes.map(s => (
                  <div key={s.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', backgroundColor: 'var(--surface)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.code}</span>
                    <h4 style={{ color: 'var(--primary)', margin: '0.25rem 0' }}>{s.name}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>📍 {s.location}, {s.district}</p>
                    
                    <div style={{ fontSize: '0.85rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                      <div className="d-flex justify-between">
                        <span>Units Configured:</span>
                        <strong>{s.unitsCount}</strong>
                      </div>
                      <div className="d-flex justify-between">
                        <span>Income Cap:</span>
                        <strong>Rs. {s.incomeLimit?.toLocaleString()}</strong>
                      </div>
                      <div className="d-flex justify-between">
                        <span>Scoring Engine:</span>
                        <strong style={{ color: '#059669' }}>Rules v{s.ruleVersion || 1}</strong>
                      </div>
                      <div className="d-flex justify-between">
                        <span>Application Dates:</span>
                        <span>{s.startDate} to {s.endDate}</span>
                      </div>
                      <div className="d-flex justify-between" style={{ marginTop: '0.5rem' }}>
                        <span>Scheme Status:</span>
                        <span className="badge badge-eligible">{s.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Floating Bilingual AI Assistant */}
      <ChatbotWidget currentUser={currentUser} />
    </div>
  );
}
