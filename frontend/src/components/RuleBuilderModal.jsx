import React, { useState, useEffect } from 'react';
import api from '../api';

export default function RuleBuilderModal({ scheme, onClose, onRulesUpdated }) {
  const [rules, setRules] = useState([]);
  const [ruleVersion, setRuleVersion] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Simulation State
  const [simIncome, setSimIncome] = useState('250000');
  const [simCategory, setSimCategory] = useState('SC/ST');
  const [simPh, setSimPh] = useState(true);
  const [simEx, setSimEx] = useState(false);
  const [simSingleWoman, setSimSingleWoman] = useState(true);
  const [simResidence, setSimResidence] = useState('8');
  const [simResult, setSimResult] = useState(null);

  useEffect(() => {
    if (scheme) {
      fetchRules();
    }
  }, [scheme]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const data = await api.getSchemeRules(scheme.id);
      setRules(data.rules || []);
      setRuleVersion(data.ruleVersion || 1);
      // Run initial simulation
      runSimulation(data.rules);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runSimulation = async (activeRules) => {
    const rulesToUse = activeRules || rules;
    const sampleApplicant = {
      income: parseInt(simIncome) || 0,
      category: simCategory,
      reservationClaims: { ph: simPh, ex: simEx },
      personalDetails: { residenceYears: parseInt(simResidence) || 0, singleWoman: simSingleWoman }
    };

    try {
      const result = await api.simulateScore(scheme.id, sampleApplicant, rulesToUse);
      setSimResult(result);
    } catch (e) {
      console.error(e);
    }
  };

  // Modify rule helper
  const handleIncomeBandPointsChange = (bandIdx, val) => {
    const newRules = JSON.parse(JSON.stringify(rules));
    const incomeRule = newRules.find(r => r.key === 'income');
    if (incomeRule && incomeRule.bands[bandIdx]) {
      incomeRule.bands[bandIdx].points = parseInt(val) || 0;
      setRules(newRules);
      runSimulation(newRules);
    }
  };

  const handleCategoryOptionChange = (catKey, val) => {
    const newRules = JSON.parse(JSON.stringify(rules));
    const catRule = newRules.find(r => r.key === 'category');
    if (catRule && catRule.options) {
      catRule.options[catKey] = parseInt(val) || 0;
      setRules(newRules);
      runSimulation(newRules);
    }
  };

  const handleBooleanPointsChange = (ruleKey, val) => {
    const newRules = JSON.parse(JSON.stringify(rules));
    const target = newRules.find(r => r.key === ruleKey);
    if (target) {
      target.points = parseInt(val) || 0;
      setRules(newRules);
      runSimulation(newRules);
    }
  };

  const handleLinearChange = (field, val) => {
    const newRules = JSON.parse(JSON.stringify(rules));
    const resRule = newRules.find(r => r.key === 'residenceYears');
    if (resRule) {
      resRule[field] = parseInt(val) || 0;
      setRules(newRules);
      runSimulation(newRules);
    }
  };

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      const res = await api.updateSchemeRules(scheme.id, rules);
      alert(res.message);
      if (onRulesUpdated) onRulesUpdated();
      onClose();
    } catch (err) {
      alert("Failed to update rules: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        width: '850px',
        maxWidth: '100%',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '92vh'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          color: '#ffffff',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Admin-Configurable Priority Engine
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800' }}>
              Scoring Rule Builder • {scheme?.name}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              background: '#334155',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}>
              Current: Version {ruleVersion}
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                color: '#94a3b8',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body: Two columns (Left: Rules, Right: Simulator) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '20px',
          padding: '24px',
          overflowY: 'auto'
        }}>
          {/* Left Column: Rule Editor */}
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '14px' }}>
              ⚙️ Configurable Norms & Point Weights
            </div>

            {loading ? (
              <div>Loading rules...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 1. Income Bands */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', background: '#f8fafc' }}>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b', marginBottom: '8px' }}>
                    1. Income Bands (EWS / LIG / MIG / HIG)
                  </div>
                  {rules.find(r => r.key === 'income')?.bands?.map((b, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#475569' }}>{b.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="number"
                          value={b.points}
                          onChange={e => handleIncomeBandPointsChange(idx, e.target.value)}
                          style={{ width: '60px', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', textAlign: 'right' }}
                        />
                        <span style={{ fontSize: '11px', color: '#64748b' }}>pts</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 2. Quota Category Match */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', background: '#f8fafc' }}>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b', marginBottom: '8px' }}>
                    2. Social Category Quota Points
                  </div>
                  {['SC/ST', 'BC', 'General'].map(cat => (
                    <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#475569' }}>{cat} Category</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="number"
                          value={rules.find(r => r.key === 'category')?.options?.[cat] || 0}
                          onChange={e => handleCategoryOptionChange(cat, e.target.value)}
                          style={{ width: '60px', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', textAlign: 'right' }}
                        />
                        <span style={{ fontSize: '11px', color: '#64748b' }}>pts</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 3. Priority Special Categories (PH, Ex, Single Woman) */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', background: '#f8fafc' }}>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b', marginBottom: '8px' }}>
                    3. Affirmative Priority Quotas
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#475569' }}>Differently Abled (PH)</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        value={rules.find(r => r.key === 'ph')?.points || 0}
                        onChange={e => handleBooleanPointsChange('ph', e.target.value)}
                        style={{ width: '60px', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', textAlign: 'right' }}
                      />
                      <span style={{ fontSize: '11px', color: '#64748b' }}>pts</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#475569' }}>Ex-Servicemen / Defense</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        value={rules.find(r => r.key === 'ex')?.points || 0}
                        onChange={e => handleBooleanPointsChange('ex', e.target.value)}
                        style={{ width: '60px', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', textAlign: 'right' }}
                      />
                      <span style={{ fontSize: '11px', color: '#64748b' }}>pts</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#475569' }}>Single-Woman / Widow Household</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        value={rules.find(r => r.key === 'singleWoman')?.points || 0}
                        onChange={e => handleBooleanPointsChange('singleWoman', e.target.value)}
                        style={{ width: '60px', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', textAlign: 'right' }}
                      />
                      <span style={{ fontSize: '11px', color: '#64748b' }}>pts</span>
                    </div>
                  </div>
                </div>

                {/* 4. Residence Linear Points */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', background: '#f8fafc' }}>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b', marginBottom: '8px' }}>
                    4. State Residence Duration
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#475569' }}>Points per Completed Year</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        value={rules.find(r => r.key === 'residenceYears')?.pointsPerUnit || 2}
                        onChange={e => handleLinearChange('pointsPerUnit', e.target.value)}
                        style={{ width: '60px', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', textAlign: 'right' }}
                      />
                      <span style={{ fontSize: '11px', color: '#64748b' }}>pts/yr</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#475569' }}>Maximum Residence Cap</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        value={rules.find(r => r.key === 'residenceYears')?.maxPoints || 20}
                        onChange={e => handleLinearChange('maxPoints', e.target.value)}
                        style={{ width: '60px', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', textAlign: 'right' }}
                      />
                      <span style={{ fontSize: '11px', color: '#64748b' }}>max</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Sandbox Simulator */}
          <div style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
              🧪 Live Score Simulator Sandbox
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px 0' }}>
              Test how candidate profiles would score under your modified rules before publishing:
            </p>

            {/* Test Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '2px' }}>
                  Sample Annual Income (₹)
                </label>
                <input
                  type="number"
                  value={simIncome}
                  onChange={e => { setSimIncome(e.target.value); runSimulation(); }}
                  style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '2px' }}>
                  Social Quota Category
                </label>
                <select
                  value={simCategory}
                  onChange={e => { setSimCategory(e.target.value); runSimulation(); }}
                  style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                >
                  <option value="SC/ST">SC/ST</option>
                  <option value="BC">BC</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '2px' }}>
                  Years of Residence in State
                </label>
                <input
                  type="number"
                  value={simResidence}
                  onChange={e => { setSimResidence(e.target.value); runSimulation(); }}
                  style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '14px', marginTop: '4px' }}>
                <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={simPh}
                    onChange={e => { setSimPh(e.target.checked); runSimulation(); }}
                  />
                  PH Disab.
                </label>
                <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={simEx}
                    onChange={e => { setSimEx(e.target.checked); runSimulation(); }}
                  />
                  Defense
                </label>
                <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={simSingleWoman}
                    onChange={e => { setSimSingleWoman(e.target.checked); runSimulation(); }}
                  />
                  Single Woman
                </label>
              </div>
            </div>

            {/* Simulation Output Card */}
            {simResult && (
              <div style={{
                background: '#ffffff',
                border: '1px solid #bfdbfe',
                borderRadius: '10px',
                padding: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e3a8a' }}>Simulated Total Score</span>
                  <span style={{ fontSize: '20px', fontWeight: '800', color: '#059669' }}>
                    {simResult.totalScore} pts
                  </span>
                </div>

                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                  {simResult.breakdown?.map((b, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569' }}>
                      <span>{b.ruleName}:</span>
                      <strong style={{ color: b.points > 0 ? '#059669' : '#94a3b8' }}>+{b.points}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          padding: '14px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            ℹ️ Changes will automatically bump to <strong>Version {ruleVersion + 1}</strong> and write an immutable block to the Hash Chain Ledger.
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                background: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saveLoading}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {saveLoading ? 'Deploying...' : `🚀 Deploy Rules (v${ruleVersion + 1})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
