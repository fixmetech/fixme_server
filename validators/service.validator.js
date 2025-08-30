const Joi = require('joi');

// Appointment Schema
const appointmentSchema = Joi.object({
  customerName: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Customer name is required',
    'string.min': 'Customer name must be at least 2 characters',
    'string.max': 'Customer name must not exceed 100 characters'
  }),
  phoneNumber: Joi.string().pattern(/^0[0-9]{9}$/).required().messages({
    'string.empty': 'Phone number is required',
    'string.pattern.base': 'Enter valid Sri Lankan mobile number (10 digits starting with 0)'
  }),
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Please enter a valid email'
  }),
  date: Joi.date().required().messages({
    'date.base': 'Invalid date format',
    'any.required': 'Date is required'
  }),
  time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required().messages({
    'string.pattern.base': 'Time must be in HH:mm format',
    'string.empty': 'Time is required'
  }),
  duration: Joi.number().positive().required().messages({
    'number.base': 'Duration must be a number',
    'number.positive': 'Duration must be a positive number',
    'any.required': 'Duration is required'
  }),
  status: Joi.string().valid('Pending', 'Confirmed', 'Cancelled', 'Completed').required().messages({
    'any.only': 'Status must be one of pending, confirmed, cancelled, or completed',
    'string.empty': 'Status is required'
  }),
  note: Joi.string().max(500).optional().messages({
    'string.max': 'Note must not exceed 500 characters'
  }),
  servicecenterid: Joi.string().required().messages({
    'any.required': 'Service center ID is required'
  }),
  serviceid: Joi.string().required().messages({
    'any.required': 'Service ID is required'
  }),
  userid: Joi.string().required().messages({
    'any.required': 'User  ID is required'
  }),
  notes: Joi.string().optional(),
  updatedAt: Joi.date().optional(),
  serviceName: Joi.string().required().messages({
    'any.required': 'Service Name is required'
  }),
});

// Service Schema
const serviceSchema = Joi.object({
  serviceName: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Service name is required',
    'string.min': 'Service name must be at least 2 characters',
    'string.max': 'Service name must not exceed 100 characters'
  }),
  serviceCategory: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'Service category is required'
  }),
  price: Joi.number().positive().required().messages({
    'number.base': 'Price must be a number',
    'number.positive': 'Price must be a positive number',
    'any.required': 'Price is required'
  }),
  tags: Joi.array().items(Joi.string().min(1)).optional(),
  duration: Joi.number().positive().required().messages({
    'number.base': 'Duration must be a number',
    'number.positive': 'Duration must be positive',
    'any.required': 'Duration is required'
  }),
  description: Joi.string().max(200).message({
    'string.max': 'Description must be at most 200 characters'
  }),

  image: Joi.string().uri().optional().messages({
    'string.uri': 'Image must be a valid URL'
  }),
  servicecenterid: Joi.string().required().messages({
    'any.required': 'Service center ID is required'
  }),
  updatedAt: Joi.date().optional()
});

// Calendar Task Schema
const calendarTaskSchema = Joi.object({
  serviceName: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Service name is required'
  }),
  customerName: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Customer name is required'
  }),
  date: Joi.date().iso().required().messages({
    'date.base': 'Invalid date format',
    'any.required': 'Date is required'
  }),
  time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required().messages({
    'string.pattern.base': 'Time must be in HH:mm format',
    'string.empty': 'Time is required'
  }),
  servicecenterid: Joi.string().required().messages({
    'any.required': 'Service center ID is required'
  }),
  status: Joi.string().valid('Pending', 'Confirmed', 'Cancelled', 'Completed').required().messages({
    'any.only': 'Status must be one of pending, confirmed, cancelled, or completed',
    'string.empty': 'Status is required'
  }),
  duration: Joi.number().positive().required().messages({
    'number.base': 'Duration must be a number',
    'number.positive': 'Duration must be a positive number',
    'any.required': 'Duration is required'
  }),
  updatedAt: Joi.date().optional()
});

// Service Center Schema
const serviceCenterSchema = Joi.object({
  address: Joi.string().min(5).max(200).required(),
  agreeToFees: Joi.boolean().valid(true).required().messages({
    'any.only': 'You must agree to the fees'
  }),
  agreeToTerms: Joi.boolean().valid(true).required().messages({
    'any.only': 'You must agree to the terms'
  }),
  businessName: Joi.string().min(2).max(100).required(),
  businessType: Joi.string().min(2).max(100).required(),
  city: Joi.string().min(2).max(100).required(),
  confirmPassword: Joi.string().required().valid(Joi.ref('password')).messages({
    'any.only': 'Passwords do not match'
  }),
  createdAt: Joi.date().iso().required(),
  description: Joi.string().max(500).required(),
  email: Joi.string().email().required(),
  licenseNumber: Joi.string().required(),
  ownerName: Joi.string().min(2).max(100).required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().pattern(/^0[0-9]{9}$/).required().messages({
    'string.pattern.base': 'Phone must be a valid 10-digit Sri Lankan number'
  }),
  planDetails: Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required(),
    price: Joi.number().positive().required(),
    features: Joi.array().items(Joi.string()).required(),
    popular: Joi.boolean().required()
  }).required(),
  selectedPlan: Joi.string().required(),
  state: Joi.string().required(),
  yearsInBusiness: Joi.string().valid('0-1', '1-3', '3-5', '5+').required(),
  zipCode: Joi.string().pattern(/^\d{5}$/).required().messages({
    'string.pattern.base': 'Zip code must be exactly 5 digits'
  }),
  updatedAt: Joi.date().optional()
});

module.exports = {
  appointmentSchema,
  serviceSchema,
  calendarTaskSchema,
  serviceCenterSchema
};
