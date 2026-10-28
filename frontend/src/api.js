const API_BASE = 'http://localhost:5000/api';

// Helper to get auth header
const getHeaders = () => {
  const token = sessionStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const api = {
  // Auth
  getToken: () => sessionStorage.getItem('token'),
  
  setToken: (token) => {
    if (token) sessionStorage.setItem('token', token);
    else sessionStorage.removeItem('token');
  },
  
  getUsers: async () => {
    const res = await fetch(`${API_BASE}/auth/users`);
    return res.json();
  },
  
  login: async (mobile, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    api.setToken(data.token);
    return data;
  },

  register: async (userData) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    }
    const data = await res.json();
    api.setToken(data.token);
    return data;
  },
  
  getMe: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders()
    });
    if (!res.ok) {
      api.setToken(null);
      throw new Error('Session expired');
    }
    return res.json();
  },

  // Schemes
  getSchemes: async () => {
    const res = await fetch(`${API_BASE}/schemes`);
    return res.json();
  },
  
  getScheme: async (id) => {
    const res = await fetch(`${API_BASE}/schemes/${id}`);
    return res.json();
  },
  
  createScheme: async (schemeData) => {
    const res = await fetch(`${API_BASE}/schemes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(schemeData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create scheme');
    }
    return res.json();
  },

  // Applications
  getApplications: async () => {
    const res = await fetch(`${API_BASE}/applications`, {
      headers: getHeaders()
    });
    return res.json();
  },
  
  createApplication: async (appData) => {
    const res = await fetch(`${API_BASE}/applications`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(appData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create application');
    }
    return res.json();
  },
  
  updateApplication: async (id, appData) => {
    const res = await fetch(`${API_BASE}/applications/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(appData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update application');
    }
    return res.json();
  },
  
  uploadDocument: async (id, docType, file) => {
    const formData = new FormData();
    formData.append('docType', docType);
    if (file) {
      formData.append('file', file);
    }
    
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${API_BASE}/applications/${id}/documents`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Document upload failed');
    }
    return res.json();
  },
  
  payApplication: async (id, amount, paymentType) => {
    const res = await fetch(`${API_BASE}/applications/${id}/pay`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ amount, paymentType })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Payment processing failed');
    }
    return res.json();
  },

  // Verification Officer
  getVerificationQueue: async () => {
    const res = await fetch(`${API_BASE}/verification/queue`, {
      headers: getHeaders()
    });
    return res.json();
  },
  
  verifyDocuments: async (actionData) => {
    const res = await fetch(`${API_BASE}/verification/action`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(actionData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit verification action');
    }
    return res.json();
  },

  // Finance Officer
  getPayments: async () => {
    const res = await fetch(`${API_BASE}/finance/payments`, {
      headers: getHeaders()
    });
    return res.json();
  },
  
  verifyPayment: async (paymentId, status) => {
    const res = await fetch(`${API_BASE}/finance/verify`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ paymentId, status })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to verify payment');
    }
    return res.json();
  },

  // Allotment Officer
  executeAllotment: async (schemeId) => {
    const res = await fetch(`${API_BASE}/allotment/execute`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ schemeId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Allotment engine execution failed');
    }
    return res.json();
  },

  // Super Admin - Vacancy Trigger
  createVacancy: async (applicationId, reason) => {
    const res = await fetch(`${API_BASE}/vacancy/create`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ applicationId, reason })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create vacancy');
    }
    return res.json();
  },

  // Reports, Notifications & Audits
  getReports: async () => {
    const res = await fetch(`${API_BASE}/reports/dashboard`, {
      headers: getHeaders()
    });
    return res.json();
  },
  
  getNotifications: async () => {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: getHeaders()
    });
    return res.json();
  },
  
  readNotifications: async () => {
    const res = await fetch(`${API_BASE}/notifications/read`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },
  
  getAuditLogs: async () => {
    const res = await fetch(`${API_BASE}/audit/logs`, {
      headers: getHeaders()
    });
    return res.json();
  },
  
  createUser: async (userData) => {
    const res = await fetch(`${API_BASE}/auth/create-user`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create user');
    }
    return res.json();
  },

  // ----------------------------------------------------
  // INNOVATION 1: PRIORITY SCORING ENGINE
  // ----------------------------------------------------
  getSchemeRules: async (schemeId) => {
    const res = await fetch(`${API_BASE}/schemes/${schemeId}/rules`, { headers: getHeaders() });
    return res.json();
  },
  updateSchemeRules: async (schemeId, rules) => {
    const res = await fetch(`${API_BASE}/schemes/${schemeId}/rules`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ rules })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update rules');
    }
    return res.json();
  },
  simulateScore: async (schemeId, sampleApplicant, customRules) => {
    const res = await fetch(`${API_BASE}/schemes/${schemeId}/rules/simulate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ sampleApplicant, customRules })
    });
    return res.json();
  },

  // ----------------------------------------------------
  // INNOVATION 2: EXPLAINABLE WAITLIST & ETA
  // ----------------------------------------------------
  getWaitlistStatus: async (applicationId) => {
    const res = await fetch(`${API_BASE}/applications/${applicationId}/waitlist-status`, { headers: getHeaders() });
    return res.json();
  },

  // ----------------------------------------------------
  // INNOVATION 7: AUTO-PROMOTION & SLA TIMERS
  // ----------------------------------------------------
  respondToOffer: async (applicationId, action) => {
    const res = await fetch(`${API_BASE}/allotments/${applicationId}/respond`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ action })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to respond to offer');
    }
    return res.json();
  },
  checkSlaExpired: async () => {
    const res = await fetch(`${API_BASE}/allotments/check-sla`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },
  simulateOfferExpiry: async (applicationId) => {
    const res = await fetch(`${API_BASE}/allotments/${applicationId}/simulate-expire`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  // ----------------------------------------------------
  // INNOVATION 4: TAMPER-EVIDENT HASH CHAIN AUDIT LEDGER
  // ----------------------------------------------------
  getLedger: async () => {
    const res = await fetch(`${API_BASE}/audit/ledger`, { headers: getHeaders() });
    return res.json();
  },
  verifyLedger: async () => {
    const res = await fetch(`${API_BASE}/audit/ledger/verify`, { headers: getHeaders() });
    return res.json();
  },
  simulateTamper: async (blockSeq, maliciousPayload) => {
    const res = await fetch(`${API_BASE}/audit/ledger/simulate-tamper`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ blockSeq, maliciousPayload })
    });
    return res.json();
  },
  repairLedger: async () => {
    const res = await fetch(`${API_BASE}/audit/ledger/repair`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  // ----------------------------------------------------
  // INNOVATION 12: DIGITAL ALLOTMENT LETTER & HMAC QR
  // ----------------------------------------------------
  getAllotmentLetter: async (allotmentOrAppId) => {
    const res = await fetch(`${API_BASE}/allotments/${allotmentOrAppId}/letter`, { headers: getHeaders() });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch allotment letter');
    }
    return res.json();
  },
  verifyAllotmentPublic: async (allotmentId, sig) => {
    const res = await fetch(`${API_BASE}/allotments/public-verify?allotmentId=${encodeURIComponent(allotmentId)}&sig=${encodeURIComponent(sig)}`);
    return res.json();
  },

  // ----------------------------------------------------
  // INNOVATION 3: BILINGUAL AI CHATBOT (RAG)
  // ----------------------------------------------------
  sendChatMessage: async (message, language) => {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message, language })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to send chat message');
    }
    return res.json();
  },
  createSupportTicket: async (query, language) => {
    const res = await fetch(`${API_BASE}/chat/ticket`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ query, language })
    });
    return res.json();
  }
};
export default api;
