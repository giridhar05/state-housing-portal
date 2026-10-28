// backend/src/services/qrLetter.js
// Tamper-resistant digital allotment order with HMAC-SHA256 QR verification
import crypto from 'crypto';
import QRCode from 'qrcode';

const LETTER_HMAC_SECRET = process.env.HMAC_SECRET || "housing_board_secure_allotment_secret_key_2026";

/**
 * Creates a cryptographic HMAC-SHA256 signature for an allotment order
 */
export function generateLetterSignature(allotmentId, applicationId, userId, unitId) {
  const payload = `${allotmentId}:${applicationId}:${userId}:${unitId}`;
  return crypto.createHmac('sha256', LETTER_HMAC_SECRET).update(payload).digest('hex');
}

/**
 * Verifies if an HMAC signature is genuine and was signed by the server key
 */
export function verifyLetterSignature(allotmentId, applicationId, userId, unitId, signature) {
  const expected = generateLetterSignature(allotmentId, applicationId, userId, unitId);
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature || '', 'hex'));
}

/**
 * Generates official digital allotment letter payload with embeddable QR Code
 */
export async function generateAllotmentLetter(allotment, application, unit, scheme, user, baseUrl = "http://localhost:5173") {
  const allotmentId = allotment.id;
  const applicationId = application.id;
  const userId = application.userId;
  const unitId = unit ? unit.id : (allotment.unitId || "unt_na");

  const signature = generateLetterSignature(allotmentId, applicationId, userId, unitId);

  const verificationUrl = `${baseUrl}/verify-allotment?allotmentId=${encodeURIComponent(allotmentId)}&sig=${encodeURIComponent(signature)}`;

  // Generate QR code data URL (High error correction level 'H' for scanning resilience)
  let qrCodeDataUrl = "";
  try {
    qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 256,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error("QR Code generation error:", err);
  }

  // Mask sensitive identity numbers for public-safe presentation
  const rawAadhaar = application.personalDetails?.aadhaar || "XXXXXXXX1234";
  const maskedAadhaar = rawAadhaar.length >= 12 
    ? `XXXX-XXXX-${rawAadhaar.slice(-4)}` 
    : "XXXX-XXXX-9999";

  const orderNumber = `TNHB/ALLOT/2026/${allotmentId.replace('alt_', '').toUpperCase()}`;

  return {
    orderNumber,
    allotmentId,
    applicationId,
    userId,
    applicantName: application.personalDetails?.fullName || user?.name || "Applicant",
    applicantMobile: user?.mobile || "N/A",
    maskedAadhaar,
    schemeName: scheme?.name || application.schemeName || "Housing Scheme",
    schemeCode: scheme?.code || application.schemeCode || "HS-2026",
    unitNumber: unit?.unitNumber || "N/A",
    block: unit?.block || "N/A",
    type: scheme?.type || "2BHK",
    district: scheme?.district || "Chennai",
    allotmentCategory: application.allotmentReason || application.category || "General Pool",
    priorityScore: application.score || 0,
    allottedDate: application.allottedDate || allotment.createdAt || new Date().toISOString(),
    status: (application.status === "Allotted" || application.status === "Completed") ? "VALID" : "CANCELLED",
    signature,
    verificationUrl,
    qrCodeDataUrl,
    issuedBy: "Tamil Nadu Housing Board - Computerized Allotment Cell",
    disclaimer: "This is a cryptographically secured digital allotment order. Authenticity can be verified at any time using the QR verification seal."
  };
}
