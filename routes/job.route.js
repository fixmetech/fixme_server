// fixme_server/routes/job.route.js
const express = require('express');
const router = express.Router();
const { 
    getJobRequestById,
    confirmPin,
 } = require('../controllers/job.controller');

// Optional auth: if you want to require Firebase ID token from client,
// plug your existing middleware here.
// const { verifyAuth } = require('../utils/middleware/auth.middleware');

// GET /job-requests/:jobRequestId
router.get('/job-requests/:jobRequestId', /* verifyAuth, */ getJobRequestById);
router.post('/job-requests/:jobRequestId/confirm-pin', /* verifyAuth, */ confirmPin);

module.exports = router;
