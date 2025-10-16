// fixme_server/routes/job.route.js
const express = require('express');
const router = express.Router();
const { 
    getJobRequestById,
    confirmPin,
    submitEstimate, 
    getEstimateStatus,
    approveEstimateDecision,
    getJobStatus,
    finishJob,
    setFinishPin,
    getFinishPin,
    verifyFinishPin,
    saveReview,
 } = require('../controllers/job.controller');

// Optional auth: if you want to require Firebase ID token from client,
// plug your existing middleware here.
// const { verifyAuth } = require('../utils/middleware/auth.middleware');

// GET /job-requests/:jobRequestId
router.get('/job-requests/:jobRequestId', /* verifyAuth, */ getJobRequestById);
router.post('/job-requests/:jobRequestId/confirm-pin', /* verifyAuth, */ confirmPin);
router.post('/jobs/:jobId/estimate', /* verifyAuth, */ submitEstimate);
router.get('/jobs/:jobId/estimate-status', /* verifyAuth, */ getEstimateStatus);
router.post('/jobs/:jobId/estimate-approval', /* verifyAuth, */ approveEstimateDecision);
router.get('/jobs/:jobId/status', /* verifyAuth, */ getJobStatus);
router.post('/jobs/:jobId/finish', /* verifyAuth, */ finishJob);
router.post('/jobs/:jobId/finish-pin', /* verifyAuth, */ setFinishPin);
router.get('/jobs/:jobId/finish-pin', /* verifyAuth, */ getFinishPin);
router.post('/jobs/:jobId/verify-finish-pin', /* verifyAuth, */ verifyFinishPin);
router.post('/jobs/:jobId/review', /* verifyAuth, */ saveReview);

module.exports = router;
