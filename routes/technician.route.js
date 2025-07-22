const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  registerTechnician,
  getAllTechnicians,
  getTechnicianById,
  updateTechnicianStatus,
  getTechnicianStatus,
  loginTechnician,
  testEndpoint
} = require('../controllers/technician.controller');
const { uploadTechnicianFiles } = require('../utils/upload.util');

// Technician registration endpoint
router.post('/register', uploadTechnicianFiles, registerTechnician);

// Technician login endpoint
router.post('/login', loginTechnician);

// Get all technicians (for moderators)
router.get('/', getAllTechnicians);

// Get technician by ID
router.get('/:id', getTechnicianById);

// Update technician status (approve/reject) - for moderators
router.patch('/:id/status', updateTechnicianStatus);

// Get registration status by email (for technician app)
router.get('/status/:email', getTechnicianStatus);

// Test endpoint
router.get('/test', testEndpoint);

// Error handling middleware for file uploads
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum allowed size is 5MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Maximum allowed is 10 files.'
      });
    }
  }
  
  if (error.message.includes('Profile picture must be') || 
      error.message.includes('ID proof must be') || 
      error.message.includes('Verification documents must be')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'File upload error occurred.'
  });
});

module.exports = router;
