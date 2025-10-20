const { db } = require('../firebase');
const Interview = require('../models/interview.model');
const emailService = require('../services/email.service');
const { 
  scheduleInterviewSchema, 
  updateInterviewStatusSchema, 
  rescheduleInterviewSchema,
  validateFutureDate,
  validateNoConflicts
} = require('../validators/interview.validator');

const interviewCollection = db.collection('interviews');
const technicianCollection = db.collection('technicians');
const technicianNotificationCollection = db.collection('technician_notifications');

// Schedule a new interview
const scheduleInterview = async (req, res) => {
  try {
    const { error, value } = scheduleInterviewSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false,
        error: error.details[0].message 
      });
    }

    // Validate that the date and time are in the future and within business hours
    try {
      validateFutureDate(value.date, value.timeSlot);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError.message
      });
    }

    // Check for scheduling conflicts
    try {
      await validateNoConflicts(db, value.interviewerEmail, value.date, value.timeSlot, value.duration);
    } catch (conflictError) {
      return res.status(409).json({
        success: false,
        error: conflictError.message
      });
    }

    // Verify that the registration exists and is still pending
    const registrationDoc = await technicianCollection.doc(value.registrationId).get();
    if (!registrationDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found'
      });
    }

    const registrationData = registrationDoc.data();
    const allowedStatuses = ['pending', 'reviewing', 'approved'];
    if (!allowedStatuses.includes(registrationData.status)) {
      return res.status(400).json({
        success: false,
        error: `Interview can only be scheduled for ${allowedStatuses.join(', ')} registrations`
      });
    }

    // Check if there's already a pending interview for this registration
    const existingInterviewQuery = await interviewCollection
      .where('registrationId', '==', value.registrationId)
      .where('status', 'in', ['scheduled', 'rescheduled'])
      .get();

    if (!existingInterviewQuery.empty) {
      return res.status(409).json({
        success: false,
        error: 'There is already a pending interview scheduled for this registration'
      });
    }

    // Set the moderator who scheduled the interview
    value.scheduledBy = req.user?.id || 'moderator';
    value.scheduledAt = new Date();

    // Create interview object
    const interview = new Interview(value);
    
    // Save to Firestore
    const docRef = await interviewCollection.add(interview.toObject());

    // Update registration status to 'reviewing' if it's pending
    if (registrationData.status === 'pending') {
      await technicianCollection.doc(value.registrationId).update({
        status: 'reviewing',
        updatedAt: new Date()
      });
    }

    // Create notification for technician about the scheduled interview
    await createInterviewNotification(value.registrationId, 'scheduled', {
      ...interview.toObject(),
      id: docRef.id
    });

    // Send email notification about the scheduled interview
    try {
      const technicianData = registrationData;
      const technicianEmail = technicianData.email;
      const technicianName = technicianData.name || 'Technician';

      if (technicianEmail) {
        await emailService.sendInterviewEmail(
          technicianEmail,
          technicianName,
          {
            id: docRef.id,
            ...interview.toObject()
          }
        );
      }
    } catch (emailError) {
      console.error('Failed to send interview email notification:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Interview scheduled successfully',
      data: {
        id: docRef.id,
        ...interview.toObject()
      }
    });

  } catch (err) {
    console.error('Schedule interview error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to schedule interview' 
    });
  }
};

// Get all interviews with optional filtering
const getInterviews = async (req, res) => {
  try {
    const { status, date, interviewer, page = 1, limit = 20 } = req.query;
    
    let query = interviewCollection.orderBy('scheduledAt', 'desc');
    
    // Apply filters
    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }
    
    if (date) {
      query = query.where('date', '==', date);
    }
    
    if (interviewer) {
      query = query.where('interviewerEmail', '==', interviewer);
    }

    const snapshot = await query.get();
    const interviews = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      scheduledAt: doc.data().scheduledAt?.toDate(),
      completedAt: doc.data().completedAt?.toDate(),
      cancelledAt: doc.data().cancelledAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));

    // Apply pagination
    const total = interviews.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedInterviews = interviews.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedInterviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (err) {
    console.error('Get interviews error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch interviews' 
    });
  }
};

// Update interview status (complete, cancel, etc.)
const updateInterviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateInterviewStatusSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        success: false,
        error: error.details[0].message 
      });
    }

    const interviewRef = interviewCollection.doc(id);
    const doc = await interviewRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Interview not found' 
      });
    }

    const currentData = doc.data();
    
    // Prevent updating already completed or cancelled interviews
    if ((currentData.status === 'completed' || currentData.status === 'cancelled') && 
        value.status !== currentData.status) {
      return res.status(400).json({
        success: false,
        error: `Cannot update ${currentData.status} interview`
      });
    }

    const updateData = {
      status: value.status,
      updatedAt: new Date(),
      updatedBy: value.updatedBy || req.user?.id || 'moderator'
    };

    // Add specific fields based on status
    if (value.status === 'completed') {
      updateData.completedAt = new Date();
      if (value.interviewNotes) {
        updateData.interviewNotes = value.interviewNotes;
      }
      if (value.interviewOutcome) {
        updateData.interviewOutcome = value.interviewOutcome;
      }
    } else if (value.status === 'cancelled') {
      updateData.cancelledAt = new Date();
    }

    await interviewRef.update(updateData);

    // Create notification for technician about the status change
    await createInterviewNotification(currentData.registrationId, value.status, {
      ...currentData,
      ...updateData,
      id
    });

    res.json({
      success: true,
      message: `Interview ${value.status} successfully`,
      data: {
        id,
        status: value.status,
        updatedAt: updateData.updatedAt
      }
    });
  } catch (err) {
    console.error('Update interview status error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update interview status' 
    });
  }
};

// Get interviews for a specific registration
const getInterviewsByRegistration = async (req, res) => {
  try {
    const { registrationId } = req.params;
    
    const snapshot = await interviewCollection
      .where('registrationId', '==', registrationId)
      .get();
    
    const allInterviews = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      scheduledAt: doc.data().scheduledAt?.toDate(),
      completedAt: doc.data().completedAt?.toDate(),
      cancelledAt: doc.data().cancelledAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));

    // Sort by scheduledAt descending
    const interviews = allInterviews.sort((a, b) => b.scheduledAt - a.scheduledAt);

    res.json({
      success: true,
      data: interviews
    });
  } catch (err) {
    console.error('Get interviews by registration error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch interviews for registration' 
    });
  }
};

// Get interview history (completed/cancelled interviews)
const getInterviewHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    // Get all interviews and filter in memory to avoid composite index requirement
    const snapshot = await interviewCollection
      .orderBy('scheduledAt', 'desc')
      .get();
    
    const allInterviews = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      scheduledAt: doc.data().scheduledAt?.toDate(),
      completedAt: doc.data().completedAt?.toDate(),
      cancelledAt: doc.data().cancelledAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));

    // Filter for completed and cancelled interviews
    const interviews = allInterviews.filter(interview => 
      interview.status === 'completed' || interview.status === 'cancelled'
    );

    // Sort by updatedAt descending
    interviews.sort((a, b) => (b.updatedAt || b.scheduledAt) - (a.updatedAt || a.scheduledAt));

    // Apply pagination
    const total = interviews.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedInterviews = interviews.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedInterviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (err) {
    console.error('Get interview history error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch interview history' 
    });
  }
};

// Reschedule an interview
const rescheduleInterview = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = rescheduleInterviewSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        success: false,
        error: error.details[0].message 
      });
    }

    const interviewRef = interviewCollection.doc(id);
    const doc = await interviewRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Interview not found' 
      });
    }

    const currentData = doc.data();
    
    // Only allow rescheduling of scheduled interviews
    if (currentData.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        error: 'Only scheduled interviews can be rescheduled'
      });
    }

    // Validate the new date and time
    try {
      validateFutureDate(value.date, value.timeSlot);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError.message
      });
    }

    // Check for conflicts with the new time slot
    try {
      await validateNoConflicts(db, currentData.interviewerEmail, value.date, value.timeSlot, currentData.duration, id);
    } catch (conflictError) {
      return res.status(409).json({
        success: false,
        error: conflictError.message
      });
    }

    const updateData = {
      date: value.date,
      timeSlot: value.timeSlot,
      status: 'rescheduled',
      rescheduleReason: value.reason,
      updatedAt: new Date(),
      updatedBy: value.updatedBy || req.user?.id || 'moderator'
    };

    await interviewRef.update(updateData);

    // Create notification for technician about the reschedule
    await createInterviewNotification(currentData.registrationId, 'rescheduled', {
      ...currentData,
      ...updateData,
      id
    });

    // Send email notification about the rescheduled interview
    try {
      // Get technician data from registration
      const technicianCollection = db.collection('technicians');
      const registrationDoc = await technicianCollection.doc(currentData.registrationId).get();
      
      if (registrationDoc.exists) {
        const technicianData = registrationDoc.data();
        const technicianEmail = technicianData.email;
        const technicianName = technicianData.name || 'Technician';

        if (technicianEmail) {
          await emailService.sendInterviewEmail(
            technicianEmail,
            technicianName,
            {
              id,
              ...currentData,
              ...updateData,
              isRescheduled: true
            }
          );
        }
      }
    } catch (emailError) {
      console.error('Failed to send reschedule email notification:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Interview rescheduled successfully',
      data: {
        id,
        ...updateData
      }
    });
  } catch (err) {
    console.error('Reschedule interview error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to reschedule interview' 
    });
  }
};

// Check if registration has pending interviews
const checkPendingInterviews = async (registrationId) => {
  try {
    const snapshot = await interviewCollection
      .where('registrationId', '==', registrationId)
      .where('status', 'in', ['scheduled', 'rescheduled'])
      .get();
    
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking pending interviews:', error);
    return false;
  }
};

// Helper function to create interview notifications
const createInterviewNotification = async (registrationId, action, interviewData) => {
  try {
    let title, message;
    
    switch (action) {
      case 'scheduled':
        title = 'Interview Scheduled';
        message = `Your interview has been scheduled for ${interviewData.date} at ${interviewData.timeSlot}`;
        break;
      case 'completed':
        title = 'Interview Completed';
        message = 'Your interview has been completed. You will be notified of the outcome soon.';
        break;
      case 'cancelled':
        title = 'Interview Cancelled';
        message = 'Your scheduled interview has been cancelled. Please contact support if you have questions.';
        break;
      case 'rescheduled':
        title = 'Interview Rescheduled';
        message = `Your interview has been rescheduled to ${interviewData.date} at ${interviewData.timeSlot}`;
        break;
      default:
        return;
    }

    const notificationData = {
      type: 'interview_update',
      title,
      message,
      registrationId,
      interviewId: interviewData.id || null,
      action,
      isRead: false,
      createdAt: new Date()
    };
    
    // Only add notification if we have all required data
    if (registrationId && interviewData.id) {
      await technicianNotificationCollection.add(notificationData);
    }
  } catch (error) {
    console.error('Failed to create interview notification:', error);
  }
};

module.exports = {
  scheduleInterview,
  getInterviews,
  updateInterviewStatus,
  getInterviewsByRegistration,
  getInterviewHistory,
  rescheduleInterview,
  checkPendingInterviews
};