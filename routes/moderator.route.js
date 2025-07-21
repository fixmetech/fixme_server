const express = require('express');
const router = express.Router();
const {
  registerModerator,
  loginModerator,
  getPendingRegistrations,
  getAllRegistrations,
  getRegistrationDetails,
  reviewTechnicianRegistration,
  getDashboardStats,
  updateTechnicianStatus,
  getTechnicians,
  getDocument,
  verifyDocument,
  addReviewNotes
} = require('../controllers/moderator.controller');

// Moderator authentication routes
router.post('/register', registerModerator); // Admin only - should add auth middleware
router.post('/login', loginModerator);

// Dashboard routes
router.get('/dashboard/stats', getDashboardStats);

// Registration management routes
router.get('/registrations', getAllRegistrations);
router.get('/registrations/pending', getPendingRegistrations);
router.get('/registrations/:id', getRegistrationDetails);
router.patch('/registrations/:id/review', reviewTechnicianRegistration);

// Technician management routes
router.get('/technicians', getTechnicians);
router.patch('/technicians/:id/status', updateTechnicianStatus);

// Document management routes
router.get('/documents/:technicianId/:documentType', getDocument);
router.get('/documents/:technicianId/:documentType/verify', verifyDocument);

// Review management routes
router.post('/registrations/:id/notes', addReviewNotes);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Moderator route error:', error);
  res.status(500).json({
    success: false,
    error: 'An error occurred while processing your request.'
  });
});

module.exports = router;
