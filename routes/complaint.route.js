const express = require('express');
const router = express.Router();
const ComplaintController = require('../controllers/complaint.controller');

// Test connection endpoint - must be before dynamic routes
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Complaint service is running',
    timestamp: new Date().toISOString()
  });
});

// Get complaint statistics
router.get('/stats', ComplaintController.getComplaintStats);

// Create a new complaint
router.post('/', ComplaintController.createComplaint);

// Create a new complaint with evidence (combined endpoint)
router.post('/with-evidence', 
  ComplaintController.uploadMiddleware, 
  ComplaintController.createComplaintWithEvidence
);

// Get all complaints with optional filters
router.get('/', ComplaintController.getComplaints);

// Get specific complaint by ID
router.get('/:complaintId', ComplaintController.getComplaintById);

// Update complaint status
router.patch('/:complaintId/status', ComplaintController.updateComplaintStatus);

// Resolve complaint
router.patch('/:complaintId/resolve', ComplaintController.resolveComplaint);

// Upload evidence for a complaint
router.post('/:complaintId/evidence', 
  ComplaintController.uploadMiddleware, 
  ComplaintController.uploadEvidence
);

// Get customer's complaints
router.get('/customer/:customerId', ComplaintController.getCustomerComplaints);

module.exports = router;
