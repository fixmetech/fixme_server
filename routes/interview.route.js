const express = require('express');
const router = express.Router();
const {
  scheduleInterview,
  getInterviews,
  updateInterviewStatus,
  getInterviewsByRegistration,
  getInterviewHistory,
  rescheduleInterview
} = require('../controllers/interview.controller');

// GET /api/moderators/interviews - Get all interviews with filtering
router.get('/', getInterviews);

// GET /api/moderators/interviews/history - Get interview history (completed/cancelled)
router.get('/history', getInterviewHistory);

// GET /api/moderators/interviews/registration/:registrationId - Get interviews for specific registration
router.get('/registration/:registrationId', getInterviewsByRegistration);

// POST /api/moderators/interviews/schedule - Schedule a new interview
router.post('/schedule', scheduleInterview);

// PATCH /api/moderators/interviews/:id/status - Update interview status
router.patch('/:id/status', updateInterviewStatus);

// PATCH /api/moderators/interviews/:id/reschedule - Reschedule an interview
router.patch('/:id/reschedule', rescheduleInterview);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Interview route error:', error);
  res.status(500).json({
    success: false,
    error: 'An error occurred while processing your interview request.'
  });
});

module.exports = router;