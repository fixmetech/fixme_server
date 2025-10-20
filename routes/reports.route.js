const express = require('express');
const router = express.Router();
const ReportsController = require('../controllers/reports.controller');
const { reportsValidation } = require('../validators/reports.validator');

// Registration Analytics Report
router.get('/registration-analytics', 
  reportsValidation.dateRangeValidation,
  ReportsController.getRegistrationAnalytics
);

// Complaint Summary Report  
router.get('/complaint-summary',
  reportsValidation.complaintReportValidation,
  ReportsController.getComplaintSummaryReport
);

// Probation Tracking Report
router.get('/probation-tracking',
  reportsValidation.dateRangeValidation,
  ReportsController.getProbationTrackingReport
);

// Export Report (Generate downloadable report)
router.post('/export',
  reportsValidation.exportValidation,
  ReportsController.exportReport
);

// Get Report Status
router.get('/status/:reportId',
  reportsValidation.reportIdValidation,
  ReportsController.getReportStatus
);

// Download Report
router.get('/download/:reportId',
  reportsValidation.reportIdValidation,
  ReportsController.downloadReport
);

module.exports = router;