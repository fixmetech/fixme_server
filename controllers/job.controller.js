// fixme_server/controllers/job.controller.js
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


exports.confirmPin = async (req, res) => {
  try {
    const { jobRequestId } = req.params;
    const { pin } = req.body || {};

    if (!jobRequestId) {
      return res.status(400).json({ error: 'Missing jobRequestId' });
    }
    if (pin === undefined || pin === null || String(pin).trim() === '') {
      return res.status(400).json({ error: 'Missing pin' });
    }

    // If you have auth middleware:
    // const uid = req.user?.uid; // set in middleware after verifyIdToken
    // Optionally check this uid matches the job's technicianId below

    const ref = db.collection('jobRequests').doc(jobRequestId);
    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(404).json({ error: 'Job request not found' });
    }

    const data = snap.data();
    const expectedPin = typeof data.pin === 'number' ? data.pin : Number(data.pin);
    const givenPin = typeof pin === 'number' ? pin : Number(pin);

    if (!Number.isFinite(expectedPin) || !Number.isFinite(givenPin)) {
      return res.status(400).json({ error: 'Invalid pin format' });
    }

    // Optional auth enforcement:
    // if (uid && data.technicianId && uid !== data.technicianId) {
    //   return res.status(403).json({ error: 'Not authorized to confirm this job' });
    // }

    if (expectedPin !== givenPin) {
      return res.status(401).json({ error: 'Incorrect PIN' });
    }

    // Update job: mark confirmed / set status; keep your schema semantics
    const nowIso = new Date().toISOString();
    const updates = {
      customerConfirmed: true,
      status: 'Verified', // or 'InProgress' per your flow
      updatedAt: nowIso,
    };

    await ref.update(updates);

    const updated = (await ref.get()).data();

    return res.json({
      message: 'PIN confirmed',
      job: {
        id: jobRequestId,
        ...updated,
      },
    });
  } catch (err) {
    console.error('confirmPin error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/jobs/:jobId/estimate
exports.submitEstimate = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { estimatedCost, estimateDescription } = req.body || {};

    if (!jobId) return res.status(400).json({ error: 'Missing jobId' });
    if (estimatedCost === undefined || Number(estimatedCost) <= 0) {
      return res.status(400).json({ error: 'Invalid estimatedCost' });
    }

    // Optionally enforce auth here using req.user.uid === technicianId
    const ref = db.collection('jobRequests').doc(jobId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Job not found' });

    const nowIso = new Date().toISOString();

    await ref.update({
      estimatedCost: Number(estimatedCost),
      estimateDescription: estimateDescription || '',
      estimateStatus: 'Pending',      // Pending | Approved | Rejected
      estimateSubmittedAt: nowIso,
      updatedAt: nowIso,
    });

    const updated = (await ref.get()).data();

    return res.json({
      message: 'Estimate submitted',
      job: { id: jobId, ...updated },
    });
  } catch (err) {
    console.error('submitEstimate error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/jobs/:jobId/estimate-status
exports.getEstimateStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!jobId) return res.status(400).json({ error: 'Missing jobId' });

    const ref = db.collection('jobRequests').doc(jobId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Job not found' });

    const data = snap.data();
    const status = data.estimateStatus || 'Pending';

    return res.json({
      status,
      job: { id: jobId, ...data },
    });
  } catch (err) {
    console.error('getEstimateStatus error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
