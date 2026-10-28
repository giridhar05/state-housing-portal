import React from 'react';

export default function AllotmentLetterModal({ letter, onClose, onOpenVerify }) {
  if (!letter) return null;

  const handlePrint = () => {
    window.print();
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
      padding: '20px',
      overflowY: 'auto'
    }}>
      <div style={{
        background: '#ffffff',
        width: '740px',
        maxWidth: '100%',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '92vh'
      }}>
        {/* Modal Toolbar */}
        <div style={{
          background: '#0f172a',
          color: '#ffffff',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '14px' }}>
            <span>📜</span> Digital Allotment Order (HMAC-SHA256 Secured)
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handlePrint}
              style={{
                background: '#334155',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              🖨️ Print / PDF
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                color: '#94a3b8',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div id="printable-allotment-order" style={{
          padding: '36px 40px',
          overflowY: 'auto',
          background: '#ffffff',
          position: 'relative'
        }}>
          {/* Official Letterhead */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '24px' }}>
            <div style={{ fontSize: '28px', marginBottom: '4px' }}>🏛️</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', letterSpacing: '0.5px' }}>
              TAMIL NADU HOUSING BOARD
            </div>
            <div style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>
              GOVERNMENT OF TAMIL NADU • COMPUTERIZED ALLOTMENT CELL
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Nandanam, Chennai - 600035 | portal.housingboard.tn.gov.in
            </div>
          </div>

          {/* Certificate Title */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Official Order No.
              </div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>
                {letter.orderNumber}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Date of Allotment</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
                {new Date(letter.allottedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Main Statement */}
          <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#334155', marginBottom: '20px' }}>
            The Tamil Nadu Housing Board hereby issues this provisional Allotment Order to the undermentioned applicant under the computerized merit & priority scoring system.
          </p>

          {/* Details Table */}
          <div style={{
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            overflow: 'hidden',
            marginBottom: '24px'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 14px', fontWeight: '600', color: '#475569', width: '38%' }}>Allottee Name</td>
                  <td style={{ padding: '10px 14px', fontWeight: '700', color: '#0f172a' }}>{letter.applicantName}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 14px', fontWeight: '600', color: '#475569' }}>Aadhaar Verification Ref</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#0f172a' }}>{letter.maskedAadhaar}</td>
                </tr>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 14px', fontWeight: '600', color: '#475569' }}>Housing Scheme</td>
                  <td style={{ padding: '10px 14px', color: '#0f172a', fontWeight: '600' }}>{letter.schemeName} ({letter.schemeCode})</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 14px', fontWeight: '600', color: '#475569' }}>Allotted Housing Unit</td>
                  <td style={{ padding: '10px 14px', color: '#1e40af', fontWeight: '700' }}>
                    Unit No. {letter.unitNumber} ({letter.block}) • {letter.type}
                  </td>
                </tr>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 14px', fontWeight: '600', color: '#475569' }}>Allotment Quota / Merit</td>
                  <td style={{ padding: '10px 14px', color: '#0f172a' }}>{letter.allotmentCategory}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 14px', fontWeight: '600', color: '#475569' }}>Verified Priority Score</td>
                  <td style={{ padding: '10px 14px', color: '#059669', fontWeight: '700' }}>{letter.priorityScore} Points</td>
                </tr>
                <tr style={{ background: '#f8fafc' }}>
                  <td style={{ padding: '10px 14px', fontWeight: '600', color: '#475569' }}>Document Validity</td>
                  <td style={{ padding: '10px 14px', color: '#059669', fontWeight: '700' }}>
                    <span style={{
                      background: '#dcfce7',
                      color: '#15803d',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      ✓ {letter.status}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Verification QR Code Section */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
            border: '1px dashed #94a3b8',
            borderRadius: '10px',
            padding: '16px 20px',
            marginTop: '16px'
          }}>
            <div style={{ flex: 1, paddingRight: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                🔒 Cryptographic QR Security Seal
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4', margin: '0 0 8px 0' }}>
                Scan to instantly authenticate this allotment with the Government repository. The HMAC-SHA256 signature guarantees this document has not been altered.
              </p>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                HMAC-SIG: {letter.signature}
              </div>
              {onOpenVerify && (
                <button
                  onClick={() => onOpenVerify(letter.allotmentId, letter.signature)}
                  style={{
                    marginTop: '10px',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  🔍 Test Online Verification Page
                </button>
              )}
            </div>

            {letter.qrCodeDataUrl && (
              <div style={{ textAlign: 'center', background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <img
                  src={letter.qrCodeDataUrl}
                  alt="Security QR Code"
                  style={{ width: '110px', height: '110px', display: 'block' }}
                />
                <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>Scan with camera</div>
              </div>
            )}
          </div>

          {/* Official Signoff */}
          <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', maxWidth: '320px' }}>
              {letter.disclaimer}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                borderBottom: '1px solid #0f172a',
                width: '160px',
                marginBottom: '6px',
                paddingBottom: '4px',
                fontSize: '12px',
                fontFamily: 'cursive',
                color: '#1e40af'
              }}>
                Dr. K. Ramanathan, IAS
              </div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a' }}>
                Managing Director / Allotment Officer
              </div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>Tamil Nadu Housing Board</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
