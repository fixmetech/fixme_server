// controllers/technician.profile.controller.js
const { db } = require('../firebase');

const collection = db.collection('technicians');

/**
 * Normalize Firestore Timestamp -> JS Date (or null)
 */
const ts = (t) => (t && typeof t.toDate === 'function' ? t.toDate() : t ?? null);

/**
 * Build a frontend-friendly DTO for the Flutter profile screen.
 * - Converts timestamps
 * - Normalizes certificateUrls from array<string> or array<{url}>
 * - Never includes password
 */
const toTechnicianProfileDTO = (doc) => {
  const d = doc.data() || {};

  // Normalize certificate URLs
  let certificateUrls = [];
  if (Array.isArray(d.certificateUrls)) {
    certificateUrls = d.certificateUrls
      .map((c) => (typeof c === 'string' ? c : c?.url))
      .filter(Boolean);
  } else if (Array.isArray(d?.verificationDocuments?.certificates)) {
    // Back-compat with stored verification structure
    certificateUrls = d.verificationDocuments.certificates
      .map((c) => c?.url)
      .filter(Boolean);
  }

  const dto = {
    id: doc.id,

    // Banking
    accountNumber: d.accountNumber ?? null,
    bankName: d.bankName ?? null,
    branch: d.branch ?? null,

    // Identity & contact
    name: d.name ?? null,
    email: d.email ?? null,
    phone: d.phone ?? null,
    address: d.address ?? null,
    role: d.role || 'technician',

    // Review & status
    status: d.status || 'pending',
    badgeType: d.badgeType ?? null,
    isActive: d.isActive ?? false,
    moderatorComments: d.moderatorComments ?? null,
    reviewedAt: ts(d.reviewedAt),
    reviewedBy: d.reviewedBy ?? null,
    approvedAt: ts(d.approvedAt),
    rejectedAt: ts(d.rejectedAt),

    // Probation
    probationStatus: d.probationStatus
      ? {
          ...d.probationStatus,
          startDate: ts(d.probationStatus.startDate),
          endDate: ts(d.probationStatus.endDate),
        }
      : null,

    // Services
    serviceCategory: d.serviceCategory ?? null,
    serviceDescription: d.serviceDescription ?? null,
    serviceRadius: d.serviceRadius ?? null,
    specializations: Array.isArray(d.specializations) ? d.specializations : [],

    // Media
    profilePictureUrl: d.profilePictureUrl ?? null,
    idProofUrl: d.idProofUrl ?? null,
    certificateUrls,

    // Metrics
    rating: d.rating ?? 0,
    totalJobs: d.totalJobs ?? 0,

    // Audit
    registeredAt: ts(d.registeredAt),
    updatedAt: ts(d.updatedAt),
    lastLogin: ts(d.lastLogin),
  };

  // Never send password if it exists
  delete dto.password;
  return dto;
};

/**
 * GET /api/technicians/profile/:id
 */
const getTechnicianProfileById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await collection.doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Technician not found' });
    }
    return res.json({ success: true, data: toTechnicianProfileDTO(doc) });
  } catch (err) {
    console.error('getTechnicianProfileById error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch technician profile' });
  }
};

/**
 * GET /api/technicians/profile/by-email/:email
 */
const getTechnicianProfileByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const snapshot = await collection.where('email', '==', email).limit(1).get();
    if (snapshot.empty) {
      return res.status(404).json({ success: false, error: 'Technician not found' });
    }
    const doc = snapshot.docs[0];
    return res.json({ success: true, data: toTechnicianProfileDTO(doc) });
  } catch (err) {
    console.error('getTechnicianProfileByEmail error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch technician profile' });
  }
};

module.exports = {
  getTechnicianProfileById,
  getTechnicianProfileByEmail,
};
