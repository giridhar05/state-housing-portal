import React, { useState, useEffect } from 'react';
import api from '../api';
import AuditLedgerExplorer from '../components/AuditLedgerExplorer';
import RuleBuilderModal from '../components/RuleBuilderModal';

export default function SystemAdminDashboard({ user, refreshGlobal }) {
  const [adminTab, setAdminTab] = useState('schemes'); // 'schemes' | 'users' | 'ledger'
  const [schemesList, setSchemesList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [selectedRuleScheme, setSelectedRuleScheme] = useState(null);
  
  // Scheme Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [district, setDistrict] = useState('');
  const [type, setType] = useState('2BHK');
  const [unitsCount, setUnitsCount] = useState('5');
  const [incomeLimit, setIncomeLimit] = useState('600000');
  
  // Quota states (must add up to 100%)
  const [scst, setScst] = useState(15);
  const [bc, setBc] = useState(25);
  const [ph, setPh] = useState(10);
  const [ex, setEx] = useState(10);
  const [general, setGeneral] = useState(40);

  // Add User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserMobile, setNewUserMobile] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('Verification Officer');

  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchSchemes();
    fetchUsers();
  }, []);

  const fetchSchemes = async () => {
    try {
      const data = await api.getSchemes();
      setSchemesList(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const users = await api.getUsers();
      setUsersList(users);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateScheme = async (e) => {
    e.preventDefault();
    const sum = parseInt(scst) + parseInt(bc) + parseInt(ph) + parseInt(ex) + parseInt(general);
    if (sum !== 100) {
      alert(`Reservation percentages must add up to exactly 100%. (Current sum: ${sum}%)`);
      return;
    }

    if (!name || !code || !unitsCount || !incomeLimit) {
      alert("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      await api.createScheme({
        name,
        code,
        location,
        district,
        type,
        unitsCount,
        incomeLimit,
        reservationRules: { scst, bc, ph, ex, general }
      });
      alert(`Housing scheme ${name} created successfully!`);
      setName('');
      setCode('');
      setLocation('');
      setDistrict('');
      fetchSchemes();
      refreshGlobal();
    } catch (err) {
      alert(err.message || 'Failed to create housing scheme');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserName || !newUserMobile || !newUserEmail || !newUserPassword || !newUserRole) {
      alert("Please fill in all staff fields.");
      return;
    }

    setFormLoading(true);
    try {
      await api.createUser({
        name: newUserName,
        mobile: newUserMobile,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole
      });
      alert(`Staff account ${newUserName} created successfully.`);
      setNewUserName('');
      setNewUserMobile('');
      setNewUserEmail('');
      setNewUserPassword('');
      fetchUsers();
      refreshGlobal();
    } catch (err) {
      alert(err.message || 'Failed to register staff');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--primary)', fontSize: '1.75rem' }}>System Administrator Control Console</h2>
          <p style={{ color: 'var(--text-muted)' }}>Configure housing schemes, tune priority scoring rules, manage staff credentials, and inspect the tamper-evident audit ledger.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '2px solid var(--border-color)', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setAdminTab('schemes')}
          style={{
            padding: '0.75rem 0.5rem',
            background: 'transparent',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            color: adminTab === 'schemes' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: adminTab === 'schemes' ? '3px solid var(--primary)' : 'none',
            cursor: 'pointer',
            marginBottom: '-2px'
          }}
        >
          🏢 Scheme Management & Priority Rules
        </button>
        <button
          onClick={() => setAdminTab('ledger')}
          style={{
            padding: '0.75rem 0.5rem',
            background: 'transparent',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            color: adminTab === 'ledger' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: adminTab === 'ledger' ? '3px solid var(--primary)' : 'none',
            cursor: 'pointer',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>🔗</span> Tamper-Evident Audit Ledger (SHA-256)
        </button>
        <button
          onClick={() => setAdminTab('users')}
          style={{
            padding: '0.75rem 0.5rem',
            background: 'transparent',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            color: adminTab === 'users' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: adminTab === 'users' ? '3px solid var(--primary)' : 'none',
            cursor: 'pointer',
            marginBottom: '-2px'
          }}
        >
          👥 Staff & User Directory
        </button>
      </div>

      {/* Tab 1: Schemes and Rule Builder */}
      {adminTab === 'schemes' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* Active Schemes List with Rule Engine Controls */}
          <div className="card">
            <h3 className="card-title">Active Housing Schemes</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Each scheme is governed by transparent rule-based scoring. Admins can customize point weights without code redeployment.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {schemesList.map(sch => (
                <div
                  key={sch.id}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    background: 'var(--surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ color: 'var(--primary)', margin: '0 0 2px 0' }}>{sch.name}</h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Code: {sch.code} | {sch.type} | Units: {sch.unitsCount}
                      </span>
                    </div>

                    <span style={{
                      background: '#dcfce7',
                      color: '#15803d',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontFamily: 'monospace'
                    }}>
                      Rules v{sch.ruleVersion || 1}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    📍 {sch.location}, {sch.district} • Income limit: ₹{sch.incomeLimit?.toLocaleString()}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setSelectedRuleScheme(sch)}
                      style={{
                        background: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      ⚙️ Configure Priority Scoring Rules
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scheme Creation Panel */}
          <div className="card">
            <h3 className="card-title">Launch New Scheme</h3>
            <form onSubmit={handleCreateScheme}>
              <div className="form-group">
                <label className="form-label">Scheme Name *</label>
                <input type="text" className="form-control" placeholder="e.g. Annanagar High Rise Phase 3" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Scheme Code *</label>
                  <input type="text" className="form-control" placeholder="e.g. ANR-2026" value={code} onChange={(e) => setCode(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Housing Unit Type</label>
                  <select className="form-control" value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="1BHK">1 BHK (EWS)</option>
                    <option value="2BHK">2 BHK (LIG/MIG)</option>
                    <option value="3BHK">3 BHK (HIG)</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Project Location</label>
                  <input type="text" className="form-control" placeholder="e.g. Sector 5" value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">District</label>
                  <input type="text" className="form-control" placeholder="e.g. Chennai" value={district} onChange={(e) => setDistrict(e.target.value)} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Total Units *</label>
                  <input type="number" className="form-control" value={unitsCount} onChange={(e) => setUnitsCount(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Income Cap Limit (Annual Rs.) *</label>
                  <input type="number" className="form-control" value={incomeLimit} onChange={(e) => setIncomeLimit(e.target.value)} required />
                </div>
              </div>

              {/* Quota breakdown */}
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>Reservation Quota Breakdown (%)</h4>
                
                <div className="form-row" style={{ gap: '1rem', marginBottom: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem' }}>SC/ST Quota: {scst}%</label>
                    <input type="range" min="0" max="50" value={scst} onChange={(e) => setScst(parseInt(e.target.value))} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem' }}>BC Quota: {bc}%</label>
                    <input type="range" min="0" max="50" value={bc} onChange={(e) => setBc(parseInt(e.target.value))} style={{ width: '100%' }} />
                  </div>
                </div>

                <div className="form-row" style={{ gap: '1rem', marginBottom: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem' }}>Physically Handicapped (PH): {ph}%</label>
                    <input type="range" min="0" max="20" value={ph} onChange={(e) => setPh(parseInt(e.target.value))} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem' }}>Ex-Servicemen (EX): {ex}%</label>
                    <input type="range" min="0" max="20" value={ex} onChange={(e) => setEx(parseInt(e.target.value))} style={{ width: '100%' }} />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.8rem' }}>General Open Merit: {general}%</label>
                  <input type="range" min="0" max="80" value={general} onChange={(e) => setGeneral(parseInt(e.target.value))} style={{ width: '100%' }} />
                </div>

                <div style={{ fontSize: '0.8rem', color: (parseInt(scst) + parseInt(bc) + parseInt(ph) + parseInt(ex) + parseInt(general) === 100) ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                  Quota Sum: {parseInt(scst) + parseInt(bc) + parseInt(ph) + parseInt(ex) + parseInt(general)}% (Must be 100%)
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '1.25rem' }}>
                {loading ? 'Creating Scheme...' : 'Deploy Housing Scheme'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Tamper-Evident Hash Chain Audit Ledger Explorer */}
      {adminTab === 'ledger' && (
        <AuditLedgerExplorer />
      )}

      {/* Tab 3: Manage Staff & Users */}
      {adminTab === 'users' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '2rem', alignItems: 'start' }}>
          
          <div className="card">
            <h3 className="card-title">Registered Accounts Directory</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Database listing of all applicants, verification officers, and administrative credentials.
            </p>
            
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Mobile</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Password</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map(u => (
                    <tr key={u.id}>
                      <td><strong>{u.name}</strong></td>
                      <td><code>{u.mobile}</code></td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge ${
                          u.role === 'Applicant' ? 'badge-submitted' : 
                          u.role.includes('Admin') ? 'badge-completed' : 'badge-eligible'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td><code>{u.password || 'password123'}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Register Staff / Admin</h3>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Officer Joseph" 
                  value={newUserName} 
                  onChange={(e) => setNewUserName(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mobile Number *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. 9812345678" 
                  value={newUserMobile} 
                  onChange={(e) => setNewUserMobile(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Official Email *</label>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="officer@housingboard.gov" 
                  value={newUserEmail} 
                  onChange={(e) => setNewUserEmail(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assign Role *</label>
                <select 
                  className="form-control" 
                  value={newUserRole} 
                  onChange={(e) => setNewUserRole(e.target.value)}
                >
                  <option value="Verification Officer">Verification Officer</option>
                  <option value="Finance Officer">Finance Officer</option>
                  <option value="Allotment Officer">Allotment Officer</option>
                  <option value="Super Admin">Super Admin</option>
                  <option value="System Administrator">System Administrator</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Temporary Password *</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={newUserPassword} 
                  onChange={(e) => setNewUserPassword(e.target.value)} 
                  required 
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={formLoading} style={{ width: '100%', marginTop: '1rem' }}>
                {formLoading ? 'Registering...' : 'Create Staff Credential'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Rule Builder Modal */}
      {selectedRuleScheme && (
        <RuleBuilderModal
          scheme={selectedRuleScheme}
          onClose={() => setSelectedRuleScheme(null)}
          onRulesUpdated={() => {
            fetchSchemes();
            refreshGlobal();
          }}
        />
      )}
    </div>
  );
}
