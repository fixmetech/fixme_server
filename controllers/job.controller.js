// fixme_server/controllers/jobRequests.controller.js
const { db } = require('../firebase');

/**
 * GET /job-requests/:jobRequestId
 * Returns a normalized job request document.
 */
exports.getJobRequestById = async (req, res) => {
  try {
    const { jobRequestId } = req.params;
    if (!jobRequestId) {
      return res.status(400).json({ error: 'Missing jobRequestId' });
    }

    const snap = await db.collection('jobRequests').doc(jobRequestId).get();
    if (!snap.exists) {
      return res.status(404).json({ error: 'Job request not found' });
    }

    const d = snap.data() || {};

    // Normalize payload (match your schema; keep pin as number)
    const payload = {
      id: snap.id,
      createdAt: d.createdAt || null,     // you store ISO-8601 strings
      updatedAt: d.updatedAt || null,
      customerId: d.customerId || null,
      technicianId: d.technicianId || null,
      description: d.description || '',
      pin: typeof d.pin === 'number' ? d.pin : Number(d.pin),
      serviceCategory: d.serviceCategory || '',
      status: d.status || '',
      customerLocation: d.customerLocation || null, // { latitude, longitude }
      propertyInfo: d.propertyInfo || null,         // whatever you store
    };

    return res.json(payload);
  } catch (err) {
    console.error('getJobRequestById error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
