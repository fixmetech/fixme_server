const Joi = require('joi');

const serviceSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  category: Joi.string().valid('Home', 'Vehicle', 'Other').required(),
  icon: Joi.string().optional(),
  description: Joi.string().max(300).required(),
});

module.exports = serviceSchema;
