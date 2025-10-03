const Joi = require('joi');

const bookingSchema = Joi.object({
    bookingDate: Joi.date().required().messages({
        'date.base': 'Booking date is required and must be a valid date'
    }),
    bookingTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required().messages({
        'string.pattern.base': 'Booking time must be in HH:mm format',
        'string.empty': 'Booking time is required'
    }),
    userId: Joi.string().required().messages({
        'string.empty': 'User ID is required'
    }),
    technicianId: Joi.string().required().messages({
        'string.empty': 'Technician ID is required'
    }),
    serviceCategory: Joi.string().valid('Vehicle Services', 'Home Services').required().messages({
        'any.only': 'Service category must be either Vehicle Services or Home Services',
        'string.empty': 'Service category is required'
    }),
    serviceSpecialization: Joi.string().required().messages({
        'string.empty': 'Service specialization is required'
    }),
    description: Joi.string().min(20).max(500).required().messages({
        'string.empty': 'Description is required',
        'string.min': 'Description must be at least 20 characters',
        'string.max': 'Description must not exceed 500 characters'
    }),
    status: Joi.string().valid('pending', 'confirmed', 'completed', 'cancelled').default('pending').messages({
        'any.only': 'Status must be one of pending, confirmed, completed, or cancelled'
    }),
    scheduledDate: Joi.date().required().messages({
        'date.base': 'Scheduled date is required and must be a valid date'
    }),
    scheduledTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required().messages({
        'string.pattern.base': 'Scheduled time must be in HH:mm format',
        'string.empty': 'Scheduled time is required'
    }),
    userDetails: Joi.object({
        name: Joi.string().min(2).max(100).required().messages({
            'string.empty': 'User name is required',
            'string.min': 'User name must be at least 2 characters',
            'string.max': 'User name must not exceed 100 characters'
        }),
        email: Joi.string().email().required().messages({
            'string.email': 'Please provide a valid email address',
            'string.empty': 'Email is required'
        }),
        phone: Joi.string().pattern(/^0[0-9]{9}$/).required().messages({
            'string.pattern.base': 'Enter valid Sri Lankan mobile number (10 digits starting with 0)',
            'string.empty': 'Phone number is required'
        }),
        address: Joi.string().min(10).max(200).required().messages({
            'string.empty': 'Address is required',
            'string.min': 'Address must be at least 10 characters',
            'string.max': 'Address must not exceed 200 characters'
        })
    }).required(),
    technicianDetails: Joi.object({
        name: Joi.string().min(2).max(100).required().messages({
            'string.empty': 'Technician name is required',
            'string.min': 'Technician name must be at least 2 characters',
            'string.max': 'Technician name must not exceed 100 characters'
        }),
        email: Joi.string().email().required().messages({
            'string.email': 'Please provide a valid email address',
            'string.empty': 'Email is required'
        }),
        phone: Joi.string().pattern(/^0[0-9]{9}$/).required().messages({
            'string.pattern.base': 'Enter valid Sri Lankan mobile number (10 digits starting with 0)',
            'string.empty': 'Phone number is required'
        })
    }).required(),
    createdAt: Joi.date().default(() => new Date()).messages({
        'date.base': 'Created at must be a valid date'
    }),
    updatedAt: Joi.date().default(() => new Date()).messages({
        'date.base': 'Updated at must be a valid date'
    }),
    paymentDetails: Joi.object({
        method: Joi.string().valid('credit_card', 'cash', 'online').default('credit_card').messages({
            'any.only': 'Payment method must be either credit_card, cash, or online'
        }),
        status: Joi.string().valid('unpaid', 'paid', 'refunded').default('unpaid').messages({
            'any.only': 'Payment status must be either unpaid, paid, or refunded'
        }),
        transactionId: Joi.string().optional().allow(null).messages({
            'string.empty': 'Transaction ID can be empty if not applicable'
        })
    }).optional(),
    priceEstimate: Joi.number().min(0).default(0).messages({
        'number.min': 'Price estimate must be at least 0'
    })
}).required();


module.exports = {
    bookingSchema
};