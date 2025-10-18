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
    setStartPin,
    getFinishPin,
    verifyFinishPin,
    saveReview,
    findNearestTechnician,
    getJobActivitiesByCustomerId,
    cancelJobRequest,
 } = require('../controllers/job.controller');

// Optional auth: if you want to require Firebase ID token from client,
// plug your existing middleware here.
// const { verifyAuth } = require('../utils/middleware/auth.middleware');

router.post('/:jobId/start-pin', /* verifyAuth, */ setStartPin);
router.get('/requests/:jobRequestId', /* verifyAuth, */ getJobRequestById);
router.get('/my-activities/:customerId', /* verifyAuth, */ getJobActivitiesByCustomerId);
router.post('/requests/:jobRequestId/confirm-pin', /* verifyAuth, */ confirmPin);
router.post('/:jobId/estimate', /* verifyAuth, */ submitEstimate);
router.get('/:jobId/estimate-status', /* verifyAuth, */ getEstimateStatus);
router.post('/:jobId/estimate-approval', /* verifyAuth, */ approveEstimateDecision);
router.get('/:jobId/status', /* verifyAuth, */ getJobStatus);
router.post('/:jobId/finish', /* verifyAuth, */ finishJob);
router.post('/:jobId/finish-pin', /* verifyAuth, */ setFinishPin);
router.get('/:jobId/finish-pin', /* verifyAuth, */ getFinishPin);
router.post('/:jobId/verify-finish-pin', /* verifyAuth, */ verifyFinishPin);
router.post('/:jobId/review', /* verifyAuth, */ saveReview);
router.post("/findNearestTechnician", findNearestTechnician);
router.post("/cancel/:jobId", cancelJobRequest);


module.exports = router;
