const Joi = require('joi');

const addHomeSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Home name is required',
    'string.min': 'Home name must be at least 2 characters',
    'string.max': 'Home name must not exceed 100 characters'
  }),
  
  address: Joi.object({
    street: Joi.string().required().messages({
      'string.empty': 'Street address is required'
    }),
    city: Joi.string().required().messages({
      'string.empty': 'City is required'
    }),
    district: Joi.string().required().messages({
      'string.empty': 'District is required'
    }),
    postalCode: Joi.string().pattern(/^[0-9]{5}$/).required().messages({
      'string.pattern.base': 'Postal code must be 5 digits',
      'string.empty': 'Postal code is required'
    })
  }).required(),
  
  propertyType: Joi.string().valid('apartment', 'house', 'villa', 'townhouse', 'condo').required().messages({
    'any.only': 'Property type must be one of: apartment, house, villa, townhouse, condo',
    'string.empty': 'Property type is required'
  }),

  area: Joi.number().positive().required().messages({
    'number.base': 'Area must be a number',
    'number.positive': 'Area must be a positive number',
    'number.empty': 'Area is required'
  }),
  
  customerId: Joi.string().required().messages({
    'string.empty': 'Customer ID is required'
  })
});

const addVehicleSchema = Joi.object({
  make: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'Vehicle make is required',
    'string.min': 'Vehicle make must be at least 2 characters',
    'string.max': 'Vehicle make must not exceed 50 characters'
  }),
  
  model: Joi.string().min(1).max(50).required().messages({
    'string.empty': 'Vehicle model is required',
    'string.max': 'Vehicle model must not exceed 50 characters'
  }),
  
  year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).required().messages({
    'number.base': 'Year must be a number',
    'number.integer': 'Year must be a whole number',
    'number.min': 'Year cannot be before 1900',
    'number.max': `Year cannot be after ${new Date().getFullYear() + 1}`,
    'number.empty': 'Year is required'
  }),
  
  licensePlate: Joi.string().pattern(/^[A-Z0-9-]{1,10}$/).required().messages({
    'string.pattern.base': 'License plate must contain only letters, numbers, and hyphens (max 10 characters)',
    'string.empty': 'License plate is required'
  }),
  
  vehicleType: Joi.string().valid('car', 'motorcycle', 'truck', 'van', 'suv', 'bus').required().messages({
    'any.only': 'Vehicle type must be one of: car, motorcycle, truck, van, suv, bus',
    'string.empty': 'Vehicle type is required'
  }),

  fuelType: Joi.string().valid('petrol', 'diesel', 'electric', 'hybrid').required().messages({
    'any.only': 'Fuel type must be one of: petrol, diesel, electric, hybrid',
    'string.empty': 'Fuel type is required'
  }),

  customerId: Joi.string().required().messages({
    'string.empty': 'Customer ID is required'
  })
});

const editHomeSchema = Joi.object({
  customerId: Joi.string().required().messages({
    'string.empty': 'Customer ID is required'
  }),
  
  name: Joi.string().min(2).max(100).optional().messages({
    'string.min': 'Home name must be at least 2 characters',
    'string.max': 'Home name must not exceed 100 characters'
  }),
  
  address: Joi.object({
    street: Joi.string().optional(),
    city: Joi.string().optional(),
    district: Joi.string().optional(),
    postalCode: Joi.string().pattern(/^[0-9]{5}$/).optional().messages({
      'string.pattern.base': 'Postal code must be 5 digits'
    })
  }).optional(),
  
  propertyType: Joi.string().valid('apartment', 'house', 'villa', 'townhouse', 'condo').optional().messages({
    'any.only': 'Property type must be one of: apartment, house, villa, townhouse, condo'
  }),
  
  area: Joi.number().positive().optional().messages({
    'number.base': 'Area must be a number',
    'number.positive': 'Area must be a positive number'
  })
});

const editVehicleSchema = Joi.object({
  customerId: Joi.string().required().messages({
    'string.empty': 'Customer ID is required'
  }),
  
  make: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Vehicle make must be at least 2 characters',
    'string.max': 'Vehicle make must not exceed 50 characters'
  }),
  
  model: Joi.string().min(1).max(50).optional().messages({
    'string.max': 'Vehicle model must not exceed 50 characters'
  }),
  
  year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).optional().messages({
    'number.base': 'Year must be a number',
    'number.integer': 'Year must be a whole number',
    'number.min': 'Year cannot be before 1900',
    'number.max': `Year cannot be after ${new Date().getFullYear() + 1}`
  }),
  
  licensePlate: Joi.string().pattern(/^[A-Z0-9-]{1,10}$/).optional().messages({
    'string.pattern.base': 'License plate must contain only letters, numbers, and hyphens (max 10 characters)'
  }),
  
  vehicleType: Joi.string().valid('car', 'motorcycle', 'truck', 'van', 'suv', 'bus').optional().messages({
    'any.only': 'Vehicle type must be one of: car, motorcycle, truck, van, suv, bus'
  }),

  fuelType: Joi.string().valid('petrol', 'diesel', 'electric', 'hybrid').optional().messages({
    'any.only': 'Fuel type must be one of: petrol, diesel, electric, hybrid'
  })
});

module.exports = {
  addHomeSchema,
  addVehicleSchema,
  editHomeSchema,
  editVehicleSchema
};
