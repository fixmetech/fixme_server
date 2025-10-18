const Joi = require('joi');

// Validation schema for scheduling a new interview
const scheduleInterviewSchema = Joi.object({
  registrationId: Joi.string().required().messages({
    'string.base': 'Registration ID must be a string',
    'any.required': 'Registration ID is required'
  }),
  technicianName: Joi.string().required().messages({
    'string.base': 'Technician name must be a string',
    'any.required': 'Technician name is required'
  }),
  technicianEmail: Joi.string().email().required().messages({
    'string.email': 'Technician email must be valid',
    'any.required': 'Technician email is required'
  }),
  technicianPhone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).required().messages({
    'string.pattern.base': 'Technician phone must be a valid phone number',
    'any.required': 'Technician phone is required'
  }),
  type: Joi.string().valid('online', 'physical').required().messages({
    'any.only': 'Interview type must be either "online" or "physical"',
    'any.required': 'Interview type is required'
  }),
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    'string.pattern.base': 'Date must be in YYYY-MM-DD format',
    'any.required': 'Interview date is required'
  }),
  timeSlot: Joi.string().pattern(/^\d{2}:\d{2}$/).required().messages({
    'string.pattern.base': 'Time slot must be in HH:mm format',
    'any.required': 'Interview time slot is required'
  }),
  duration: Joi.number().integer().min(15).max(180).default(30).messages({
    'number.base': 'Duration must be a number',
    'number.integer': 'Duration must be an integer',
    'number.min': 'Duration must be at least 15 minutes',
    'number.max': 'Duration cannot exceed 180 minutes'
  }),
  platform: Joi.string().valid('zoom', 'teams', 'meet', 'skype', 'whatsapp', 'other').when('type', {
    is: 'online',
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'any.only': 'Platform must be one of: zoom, teams, meet, skype, whatsapp, other',
    'any.required': 'Platform is required for online interviews'
  }),
  meetingLink: Joi.string().uri().when('type', {
    is: 'online',
    then: Joi.optional(),
    otherwise: Joi.string().allow('').optional()
  }).messages({
    'string.uri': 'Meeting link must be a valid URL'
  }),
  physicalLocation: Joi.string().max(500).when('type', {
    is: 'physical',
    then: Joi.string().min(10).required(),
    otherwise: Joi.string().allow('').optional()
  }).messages({
    'string.min': 'Physical location must be at least 10 characters',
    'string.max': 'Physical location cannot exceed 500 characters',
    'any.required': 'Physical location is required for physical interviews'
  }),
  interviewerName: Joi.string().required().messages({
    'string.base': 'Interviewer name must be a string',
    'any.required': 'Interviewer name is required'
  }),
  interviewerEmail: Joi.string().email().required().messages({
    'string.email': 'Interviewer email must be valid',
    'any.required': 'Interviewer email is required'
  }),
  notes: Joi.string().max(1000).allow('').optional().messages({
    'string.max': 'Notes cannot exceed 1000 characters'
  }),
  reminderEnabled: Joi.boolean().default(true),
  scheduledBy: Joi.string().optional(),
  status: Joi.string().optional().strip(),
  scheduledAt: Joi.string().optional().strip()
});

// Validation schema for updating interview status
const updateInterviewStatusSchema = Joi.object({
  status: Joi.string().valid('scheduled', 'completed', 'cancelled', 'rescheduled').required().messages({
    'any.only': 'Status must be one of: scheduled, completed, cancelled, rescheduled',
    'any.required': 'Status is required'
  }),
  interviewNotes: Joi.string().max(2000).optional().messages({
    'string.max': 'Interview notes cannot exceed 2000 characters'
  }),
  interviewOutcome: Joi.string().valid('passed', 'failed', 'pending').optional().messages({
    'any.only': 'Interview outcome must be one of: passed, failed, pending'
  }),
  updatedBy: Joi.string().optional()
});

// Validation schema for rescheduling an interview
const rescheduleInterviewSchema = Joi.object({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    'string.pattern.base': 'Date must be in YYYY-MM-DD format',
    'any.required': 'New interview date is required'
  }),
  timeSlot: Joi.string().pattern(/^\d{2}:\d{2}$/).required().messages({
    'string.pattern.base': 'Time slot must be in HH:mm format',
    'any.required': 'New interview time slot is required'
  }),
  reason: Joi.string().max(500).optional().messages({
    'string.max': 'Reschedule reason cannot exceed 500 characters'
  }),
  updatedBy: Joi.string().optional()
});

// Custom validator to check if interview date is in the future
const validateFutureDate = (date, timeSlot) => {
  const interviewDateTime = new Date(`${date}T${timeSlot}`);
  const now = new Date();
  
  if (interviewDateTime <= now) {
    throw new Error('Interview must be scheduled for a future date and time');
  }
  
  // Check if it's within business hours (9 AM - 6 PM)
  const hour = interviewDateTime.getHours();
  if (hour < 9 || hour >= 18) {
    throw new Error('Interview must be scheduled between 9:00 AM and 6:00 PM');
  }
  
  // Check if it's a weekday (Monday-Friday)
  const dayOfWeek = interviewDateTime.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    throw new Error('Interview must be scheduled on a weekday (Monday-Friday)');
  }
  
  return true;
};

// Custom validator to check for scheduling conflicts
const validateNoConflicts = async (db, interviewerEmail, date, timeSlot, duration, excludeInterviewId = null) => {
  try {
    const startTime = new Date(`${date}T${timeSlot}`);
    const endTime = new Date(startTime.getTime() + duration * 60000);
    
    // Query for existing interviews on the same date for the same interviewer
    let query = db.collection('interviews')
      .where('interviewerEmail', '==', interviewerEmail)
      .where('date', '==', date)
      .where('status', 'in', ['scheduled', 'rescheduled']);
    
    const snapshot = await query.get();
    
    for (const doc of snapshot.docs) {
      // Skip the current interview if we're updating
      if (excludeInterviewId && doc.id === excludeInterviewId) {
        continue;
      }
      
      const existingInterview = doc.data();
      const existingStart = new Date(`${existingInterview.date}T${existingInterview.timeSlot}`);
      const existingEnd = new Date(existingStart.getTime() + existingInterview.duration * 60000);
      
      // Check for time overlap
      if ((startTime < existingEnd && endTime > existingStart)) {
        throw new Error(`Interview conflicts with existing interview scheduled at ${existingInterview.timeSlot}`);
      }
    }
    
    return true;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  scheduleInterviewSchema,
  updateInterviewStatusSchema,
  rescheduleInterviewSchema,
  validateFutureDate,
  validateNoConflicts
};