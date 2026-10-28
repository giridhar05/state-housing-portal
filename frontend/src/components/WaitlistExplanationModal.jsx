import React from 'react';

export default function WaitlistExplanationModal({ statusData, onClose }) {
  if (!statusData) return null;

  const {
    rank,
    numericalRank,
    ahead,
    totalWaitlisted,
    score,
    scoreBreakdown,
    ruleVersion,
    eta,
    schemeName,
    disclaimer
  } = statusData;

  const confidenceColor = eta?.confidence === 'High' 
    ? '#10b981' 
    : (eta?.confidence === 'Moderate' ? '#f59e0b' : '#64748b');

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
        width: '620px',
        maxWidth: '100%',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a, #1e3a8a)',
          color: '#ffffff',
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Transparent Waitlist Mechanics
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800' }}>
              Waitlist Position & Wait-Time Estimate
            </div>
          </div>
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

        {/* Content Body */}
        <div style={{ padding: '24px', overflowY: 'auto' }}>
          {/* Scheme Tag */}
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
            Scheme: <strong style={{ color: '#0f172a' }}>{schemeName}</strong> • Evaluated under <span style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}>Rules v{ruleVersion || 1}</span>
          </div>

          {/* KPI Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '24px'
          }}>
            {/* Rank Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>YOUR RANK</div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#1e40af', marginTop: '4px' }}>
                {rank || `WL-${numericalRank || 1}`}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                out of {totalWaitlisted} applicants
              </div>
            </div>

            {/* Ahead Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>PEOPLE AHEAD</div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                {ahead}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                Anonymized queue
              </div>
            </div>

            {/* Score Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>PRIORITY SCORE</div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#059669', marginTop: '4px' }}>
                {score} <span style={{ fontSize: '14px', fontWeight: '600' }}>pts</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                Rule-based total
              </div>
            </div>
          </div>

          {/* Wait Time Estimate Box */}
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff, #f8fafc)',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⏱️</span> Estimated Wait Time
              </div>
              <span style={{
                background: '#ffffff',
                border: `1px solid ${confidenceColor}`,
                color: confidenceColor,
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '700'
              }}>
                {eta?.confidence} Confidence
              </span>
            </div>

            <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e40af', marginBottom: '4px' }}>
              {eta?.formatted}
            </div>

            <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>
              Based on historical unit surrender and vacancy rates (~{eta?.estimatedMonthlyTurnover} units/month) for this scheme.
            </div>
          </div>

          {/* Why this Rank? Breakdown Accordion */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🔍</span> Why this rank? Transparent Score Breakdown
            </div>

            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              {(scoreBreakdown || []).map((b, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderBottom: idx < scoreBreakdown.length - 1 ? '1px solid #f1f5f9' : 'none',
                    background: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                      {b.ruleName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {b.reason}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: b.points > 0 ? '#059669' : '#94a3b8',
                    fontFamily: 'monospace'
                  }}>
                    +{b.points} pts
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fef3c7',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '11px',
            color: '#92400e',
            lineHeight: '1.4'
          }}>
            <strong>Board Notice:</strong> {disclaimer}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          padding: '12px 24px',
          textAlign: 'right'
        }}>
          <button
            onClick={onClose}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
