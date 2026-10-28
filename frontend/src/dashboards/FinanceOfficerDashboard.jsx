import React, { useState, useEffect } from 'react';
import api from '../api';

export default function FinanceOfficerDashboard({ user, refreshGlobal }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const data = await api.getPayments();
      setPayments(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerify = async (paymentId, status) => {
    // status: 'Verified', 'Failed'
    setLoading(true);
    try {
      await api.verifyPayment(paymentId, status);
      alert(`Payment status set to ${status}.`);
      fetchPayments();
      refreshGlobal();
    } catch (err) {
      alert(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  // Calculate Aggregates
  const totalRevenue = payments
    .filter(p => p.status === 'Success' || p.status === 'Verified')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingCount = payments.filter(p => p.status === 'Success').length;
  const verifiedCount = payments.filter(p => p.status === 'Verified').length;

  return (
    <div>
      <div className="mb-2">
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--primary)', fontSize: '1.75rem' }}>Financial Accounts Management</h2>
        <p style={{ color: 'var(--text-muted)' }}>Audit application fee receipts and booking payments to process allotment execution forwards.</p>
      </div>

      {/* Finance Stats */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <span className="stat-title">Total Revenue Verified</span>
          <span className="stat-value" style={{ color: 'var(--success)' }}>Rs. {totalRevenue.toLocaleString()}</span>
          <span className="stat-subtitle">Fee and Booking Amount combined</span>
        </div>
        <div className="stat-card">
          <span className="stat-title">Awaiting Audit</span>
          <span className="stat-value" style={{ color: 'var(--warning)' }}>{pendingCount}</span>
          <span className="stat-subtitle">Pending payment approvals</span>
        </div>
        <div className="stat-card">
          <span className="stat-title">Verified Receipts</span>
          <span className="stat-value">{verifiedCount}</span>
          <span className="stat-subtitle">Audited transactions</span>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card">
        <h3 className="card-title">Transaction Ledger</h3>
        {payments.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No payment transactions recorded.</p>
        ) : (
          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>App ID</th>
                  <th>Payment Type</th>
                  <th>Amount (Rs.)</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td><code>{p.transactionId}</code></td>
                    <td>{p.applicationId}</td>
                    <td><strong style={{ fontSize: '0.85rem' }}>{p.type}</strong></td>
                    <td><strong>{p.amount.toLocaleString()}</strong></td>
                    <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${
                        p.status === 'Verified' ? 'badge-eligible' : 
                        p.status === 'Success' ? 'badge-submitted' : 
                        p.status === 'Failed' ? 'badge-rejected' : 'badge-draft'
                      }`}>
                        {p.status === 'Success' ? 'Success (Pending Audit)' : p.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {p.status === 'Success' && (
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-sm btn-success" 
                            disabled={loading}
                            onClick={() => handleVerify(p.id, 'Verified')}
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            Approve
                          </button>
                          <button 
                            className="btn btn-sm btn-danger" 
                            disabled={loading}
                            onClick={() => handleVerify(p.id, 'Failed')}
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {p.status === 'Verified' && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Verified ✓</span>}
                      {p.status === 'Failed' && <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>Failed ✗</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
