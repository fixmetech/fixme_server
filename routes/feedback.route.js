// routes/feedback.route.js
const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedback.controller');

router.get('/technician/:technicianId', feedbackController.getFeedbackByTechnician);

module.exports = router;
