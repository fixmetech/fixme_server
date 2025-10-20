// controllers/feedback.controller.js
const { db } = require("../firebase");
const Feedback = require('../models/feedback.model'); 

// Helper: fetch user display names by ID in batch
async function getCustomerNames(customerIds) {
  // Remove duplicates & nulls
  const uniqueIds = Array.from(new Set(customerIds.filter(Boolean)));
  if (uniqueIds.length === 0) return {};

  const usersRef = db.collection('users');
  const results = {};

  // Use batched get
  const docs = await Promise.all(uniqueIds.map(id => usersRef.doc(id).get()));
  docs.forEach(doc => {
    if (doc.exists) {
      const data = doc.data();
      results[doc.id] = `${data.firstName || ""} ${data.lastName || ""}`.trim() || "Customer";
    }
  });
  return results; // Map: { userId: name }
}

// GET /api/feedback/technician/:technicianId
exports.getFeedbackByTechnician = async (req, res) => {
  const { technicianId } = req.params;
  try {
    const snapshot = await db.collection('technicianFeedback')
      .where('technicianId', '==', technicianId)
      .orderBy('createdAt', 'desc')
      .get();

    const feedback = [];
    snapshot.forEach(doc => feedback.push({ id: doc.id, ...doc.data() }));

    // Get customer names for all feedbacks
    const customerIds = feedback.map(fb => fb.customerId);
    const nameMap = await getCustomerNames(customerIds);

    // Attach name to each feedback item
    feedback.forEach(fb => {
      fb.customerName = nameMap[fb.customerId] || "Customer";
    });

    res.json({ success: true, data: feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
