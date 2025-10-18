const Joi = require('joi');

const technicianRegistrationSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name must not exceed 100 characters'
  }),
  
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'string.empty': 'Email is required'
  }),
  
  phone: Joi.string().pattern(/^0[0-9]{9}$/).required().messages({
    'string.pattern.base': 'Enter valid Sri Lankan mobile number (10 digits starting with 0)',
    'string.empty': 'Phone number is required'
  }),
  
  password: Joi.string().min(6).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 6 characters'
  }),

  dateOfBirth: Joi.date().optional().messages({
    'date.base': 'Please provide a valid date of birth'
  }),

  gender: Joi.string().valid('Male', 'Female', 'Other').optional().messages({
    'any.only': 'Gender must be Male, Female, or Other'
  }),

  nicNumber: Joi.string().pattern(/^[0-9]{9}[vVxX]$|^[0-9]{12}$/).optional().messages({
    'string.pattern.base': 'Enter a valid Sri Lankan NIC number'
  }),

  experience: Joi.number().integer().min(0).max(50).optional().messages({
    'number.base': 'Experience must be a number',
    'number.integer': 'Experience must be a whole number',
    'number.min': 'Experience cannot be negative',
    'number.max': 'Experience cannot exceed 50 years'
  }),

  languages: Joi.array().items(
    Joi.string().valid('Sinhala', 'English', 'Tamil')
  ).min(1).optional().messages({
    'array.min': 'At least one language must be selected',
    'any.only': 'Language must be Sinhala, English, or Tamil'
  }),
  
  serviceCategory: Joi.string().valid('Vehicle Services', 'Home Services').required().messages({
    'any.only': 'Service category must be either Vehicle Services or Home Services',
    'string.empty': 'Service category is required'
  }),
  
  specializations: Joi.array().items(Joi.string()).min(1).required().messages({
    'array.min': 'At least one specialization is required',
    'array.base': 'Specializations must be an array'
  }),
  
  serviceDescription: Joi.string().min(20).max(500).required().messages({
    'string.empty': 'Service description is required',
    'string.min': 'Service description must be at least 20 characters',
    'string.max': 'Service description must not exceed 500 characters'
  }),
  
  address: Joi.string().min(10).max(200).required().messages({
    'string.empty': 'Address is required',
    'string.min': 'Address must be at least 10 characters',
    'string.max': 'Address must not exceed 200 characters'
  }),
  
  serviceRadius: Joi.number().min(1).max(100).optional().default(15).messages({
    'number.min': 'Service radius must be at least 1 km',
    'number.max': 'Service radius cannot exceed 100 km'
  }),

  verificationType: Joi.string().valid('Certificate Verification', 'Experience Verification', 'Newbie Application').optional().messages({
    'any.only': 'Verification type must be Certificate Verification, Experience Verification, or Newbie Application'
  }),

  applicationReason: Joi.string().min(50).max(1000).when('verificationType', {
    is: 'Newbie Application',
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'string.min': 'Application reason must be at least 50 characters',
    'string.max': 'Application reason must not exceed 1000 characters',
    'any.required': 'Application reason is required for newbie applications'
  }),
  
  bankName: Joi.string().required().messages({
    'string.empty': 'Bank name is required'
  }),
  
  accountNumber: Joi.string().required().messages({
    'string.empty': 'Account number is required'
  }),
  
  branch: Joi.string().required().messages({
    'string.empty': 'Branch is required'
  })
});

const technicianUpdateSchema = Joi.object({
  status: Joi.string().valid('pending', 'approved', 'rejected').optional(),
  moderatorComments: Joi.string().max(500).optional(),
  isActive: Joi.boolean().optional()
});

module.exports = {
  technicianRegistrationSchema,
  technicianUpdateSchema
};
