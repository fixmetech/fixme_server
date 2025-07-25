const Joi = require('joi');

const appointmentSchema = Joi.object({
  customerName: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Customer name is required',
    'string.min': 'Customer name must be at least 2 characters',
    'string.max': 'Customer name must not exceed 100 characters'
  }),

  phone: Joi.string().pattern(/^0[0-9]{9}$/).required().messages({
    'string.empty': 'Phone number is required',
    'string.pattern.base': 'Enter valid Sri Lankan mobile number (10 digits starting with 0)'
  }),

  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Please enter a valid email'
  }),

  date: Joi.date().iso().required().messages({
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
  })
});


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

  image: Joi.string().uri().optional().messages({
    'string.uri': 'Image must be a valid URL'
  })
});

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
  })
});


module.exports = {
  appointmentSchema,
  serviceSchema,
  calendarTaskSchema
};

