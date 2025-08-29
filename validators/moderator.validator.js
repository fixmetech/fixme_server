const Joi = require('joi');

const moderatorRegistrationSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name must not exceed 100 characters'
  }),
  
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'string.empty': 'Email is required'
  }),
  
  password: Joi.string().min(6).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 6 characters'
  }),
  
  phone: Joi.string().pattern(/^0[0-9]{9}$/).required().messages({
    'string.pattern.base': 'Enter valid Sri Lankan mobile number (10 digits starting with 0)',
    'string.empty': 'Phone number is required'
  }),
  
  permissions: Joi.array().items(Joi.string()).optional()
});

const moderatorLoginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'string.empty': 'Email is required'
  }),
  
  password: Joi.string().required().messages({
    'string.empty': 'Password is required'
  })
});

const technicianApprovalSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required().messages({
    'any.only': 'Status must be either approved or rejected',
    'string.empty': 'Status is required'
  }),
  
  moderatorComments: Joi.string().max(500).optional().messages({
    'string.max': 'Comments must not exceed 500 characters'
  }),
  
  badgeType: Joi.when('status', {
    is: 'approved',
    then: Joi.string().valid('professional', 'experience', 'probation').required().messages({
      'any.only': 'Badge type must be professional, experience, or probation',
      'string.empty': 'Badge type is required for approval'
    }),
    otherwise: Joi.optional()
  }),
  
  rejectionReason: Joi.when('status', {
    is: 'rejected',
    then: Joi.string().valid(
      'incomplete_documents',
      'invalid_credentials',
      'failed_verification',
      'insufficient_experience',
      'other'
    ).required().messages({
      'any.only': 'Invalid rejection reason',
      'string.empty': 'Rejection reason is required'
    }),
    otherwise: Joi.optional()
  })
});

const moderatorUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  phone: Joi.string().pattern(/^0[0-9]{9}$/).optional(),
  permissions: Joi.array().items(Joi.string()).optional(),
  isActive: Joi.boolean().optional(),
  settings: Joi.object().optional()
});

const technicianStatusUpdateSchema = Joi.object({
  status: Joi.string().valid('active', 'suspended', 'probation').required(),
  reason: Joi.string().max(500).optional(),
  moderatorComments: Joi.string().max(500).optional()
});

module.exports = {
  moderatorRegistrationSchema,
  moderatorLoginSchema,
  technicianApprovalSchema,
  moderatorUpdateSchema,
  technicianStatusUpdateSchema
};
