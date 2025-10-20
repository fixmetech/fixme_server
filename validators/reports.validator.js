const Joi = require('joi');

// Date range validation
const dateRangeValidation = (req, res, next) => {
  const schema = Joi.object({
    dateRange: Joi.string().valid('7d', '30d', '90d', '1y', 'custom').default('30d'),
    startDate: Joi.when('dateRange', {
      is: 'custom',
      then: Joi.date().iso().required(),
      otherwise: Joi.date().iso().optional()
    }),
    endDate: Joi.when('dateRange', {
      is: 'custom', 
      then: Joi.date().iso().min(Joi.ref('startDate')).required(),
      otherwise: Joi.date().iso().optional()
    })
  });

  const { error, value } = schema.validate(req.query);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: error.details[0].message
    });
  }

  req.query = value;
  next();
};

// Complaint report specific validation
const complaintReportValidation = (req, res, next) => {
  const schema = Joi.object({
    dateRange: Joi.string().valid('7d', '30d', '90d', '1y', 'custom').default('30d'),
    startDate: Joi.when('dateRange', {
      is: 'custom',
      then: Joi.date().iso().required(),
      otherwise: Joi.date().iso().optional()
    }),
    endDate: Joi.when('dateRange', {
      is: 'custom',
      then: Joi.date().iso().min(Joi.ref('startDate')).required(),
      otherwise: Joi.date().iso().optional()
    }),
    severity: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
    status: Joi.string().valid('pending', 'investigating', 'resolved', 'rejected').optional()
  });

  const { error, value } = schema.validate(req.query);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: error.details[0].message
    });
  }

  req.query = value;
  next();
};

// Export validation
const exportValidation = (req, res, next) => {
  const schema = Joi.object({
    reportType: Joi.string().valid('registration-analytics', 'complaint-summary', 'probation-tracking').required(),
    format: Joi.string().valid('pdf', 'excel', 'csv').default('pdf'),
    dateRange: Joi.string().valid('7d', '30d', '90d', '1y', 'custom').default('30d'),
    startDate: Joi.when('dateRange', {
      is: 'custom',
      then: Joi.date().iso().required(),
      otherwise: Joi.date().iso().optional()
    }),
    endDate: Joi.when('dateRange', {
      is: 'custom',
      then: Joi.date().iso().min(Joi.ref('startDate')).required(), 
      otherwise: Joi.date().iso().optional()
    }),
    severity: Joi.when('reportType', {
      is: 'complaint-summary',
      then: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
      otherwise: Joi.forbidden()
    }),
    status: Joi.when('reportType', {
      is: 'complaint-summary',
      then: Joi.string().valid('pending', 'investigating', 'resolved', 'rejected').optional(),
      otherwise: Joi.forbidden()
    })
  });

  const { error, value } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: error.details[0].message
    });
  }

  req.body = value;
  next();
};

// Report ID validation
const reportIdValidation = (req, res, next) => {
  const schema = Joi.object({
    reportId: Joi.string().pattern(/^report_\d+_[a-z0-9]+$/).required()
  });

  const { error, value } = schema.validate(req.params);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid report ID format',
      error: error.details[0].message
    });
  }

  req.params = value;
  next();
};

module.exports = {
  reportsValidation: {
    dateRangeValidation,
    complaintReportValidation,
    exportValidation,
    reportIdValidation
  }
};