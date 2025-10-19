const { db } = require('../firebase');
const bcrypt = require('bcryptjs');
const Moderator = require('../models/moderator.model');
const emailService = require('../services/email.service');
const { 
  moderatorRegistrationSchema, 
  moderatorLoginSchema, 
  technicianApprovalSchema,
  moderatorUpdateSchema,
  technicianStatusUpdateSchema 
} = require('../validators/moderator.validator');
const { 
  generateSignedUrl, 
  verifyDocumentAccess, 
  getDocumentMetadata 
} = require('../utils/document.util');

// Utility function to safely convert Firestore timestamps to JavaScript dates
const safeToDate = (timestamp) => {
  if (!timestamp) return null;
  
  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  } else if (timestamp instanceof Date) {
    return timestamp;
  } else if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  
  return null;
};

const moderatorCollection = db.collection('moderators');
const technicianCollection = db.collection('technicians');
const notificationCollection = db.collection('moderator_notifications');
const technicianNotificationCollection = db.collection('technician_notifications');

// Register new moderator (Admin only)
const registerModerator = async (req, res) => {
  try {
    const { error, value } = moderatorRegistrationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false,
        error: error.details[0].message 
      });
    }

    // Check if email already exists
    const existingModerator = await moderatorCollection.where('email', '==', value.email).get();
    if (!existingModerator.empty) {
      return res.status(409).json({
        success: false,
        error: 'A moderator with this email already exists'
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(value.password, saltRounds);

    // Create moderator object
    const moderatorData = {
      ...value,
      password: hashedPassword,
      createdBy: req.user?.id || 'admin' // Assuming admin authentication
    };

    const moderator = new Moderator(moderatorData);
    
    // Save to Firestore
    const docRef = await moderatorCollection.add({
      ...moderator,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Moderator registered successfully',
      data: {
        id: docRef.id,
        email: moderator.email,
        name: moderator.name,
        role: moderator.role
      }
    });

  } catch (err) {
    console.error('Moderator registration error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to register moderator. Please try again.' 
    });
  }
};

// Moderator login
const loginModerator = async (req, res) => {
  try {
    const { error, value } = moderatorLoginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { email, password } = value;

    // Find moderator by email
    const moderatorQuery = await moderatorCollection.where('email', '==', email).get();
    
    if (moderatorQuery.empty) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const moderatorDoc = moderatorQuery.docs[0];
    const moderatorData = moderatorDoc.data();

    // Check if moderator is active
    if (!moderatorData.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Your account has been deactivated. Please contact administrator.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, moderatorData.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Update last login and login count
    await moderatorCollection.doc(moderatorDoc.id).update({
      lastLogin: new Date(),
      loginCount: (moderatorData.loginCount || 0) + 1,
      updatedAt: new Date()
    });

    // Remove sensitive data before sending response
    const { password: _, ...safeModerator } = moderatorData;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        id: moderatorDoc.id,
        ...safeModerator,
        lastLogin: new Date()
      }
    });

  } catch (error) {
    console.error('Moderator login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.'
    });
  }
};

// Get all pending technician registrations
const getPendingRegistrations = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'pending' } = req.query;
    
    let query = technicianCollection
      .where('status', '==', status)
      .orderBy('registeredAt', 'desc');
    
    const snapshot = await query.get();
    const registrations = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      registeredAt: doc.data().registeredAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));

    // Calculate pagination
    const total = registrations.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedRegistrations = registrations.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedRegistrations,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (err) {
    console.error('Get pending registrations error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch pending registrations' 
    });
  }
};

// Get all registrations with filtering
const getAllRegistrations = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 10 } = req.query;
    
    let query = technicianCollection.orderBy('registeredAt', 'desc');
    
    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }
    
    const snapshot = await query.get();
    let registrations = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      registeredAt: doc.data().registeredAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));

    // Filter by type if specified (this is client-side filtering since Firestore doesn't have this field)
    if (type && type !== 'all') {
      registrations = registrations.filter(reg => reg.type === type);
    }

    // Calculate pagination
    const total = registrations.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedRegistrations = registrations.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedRegistrations,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (err) {
    console.error('Get all registrations error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch registrations' 
    });
  }
};

// Get single registration details for review
const getRegistrationDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const doc = await technicianCollection.doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Registration not found' 
      });
    }
    
    const data = doc.data();
    
    // Get interview information for this registration
    const { checkPendingInterviews } = require('./interview.controller');
    const interviewSnapshot = await db.collection('interviews')
      .where('registrationId', '==', id)
      .get();
    
    const allInterviews = interviewSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledAt: doc.data().scheduledAt?.toDate(),
      completedAt: doc.data().completedAt?.toDate(),
      cancelledAt: doc.data().cancelledAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));
    
    // Sort by scheduledAt descending
    const interviews = allInterviews.sort((a, b) => b.scheduledAt - a.scheduledAt);
    
    const hasPendingInterview = await checkPendingInterviews(id);
    
    res.json({
      success: true,
      data: { 
        id: doc.id, 
        ...data,
        registeredAt: data.registeredAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        interviews,
        hasPendingInterview
      }
    });
  } catch (err) {
    console.error('Get registration details error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch registration details' 
    });
  }
};

// Approve or reject technician registration
const reviewTechnicianRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = technicianApprovalSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        success: false,
        error: error.details[0].message 
      });
    }

    const technicianRef = technicianCollection.doc(id);
    const doc = await technicianRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Registration not found' 
      });
    }

    // Check for pending interviews before allowing final decision
    const { checkPendingInterviews } = require('./interview.controller');
    const hasPendingInterview = await checkPendingInterviews(id);
    
    if (hasPendingInterview && (value.status === 'approved' || value.status === 'rejected')) {
      return res.status(400).json({
        success: false,
        error: 'Cannot make final decision while there are pending interviews. Please complete or cancel the interview first.',
        code: 'PENDING_INTERVIEW_BLOCK'
      });
    }

    const updateData = {
      status: value.status,
      moderatorComments: value.moderatorComments || null,
      reviewedBy: req.user?.id || 'moderator', // Assuming moderator authentication
      reviewedAt: new Date(),
      updatedAt: new Date()
    };

    if (value.status === 'approved') {
      updateData.approvedAt = new Date();
      updateData.isActive = true;
      updateData.badgeType = value.badgeType;
      
      // Set probation status if badge type is probation
      if (value.badgeType === 'probation') {
        updateData.probationStatus = {
          maxJobs: 3,
          completedJobs: 0,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        };
      }
    } else if (value.status === 'rejected') {
      updateData.rejectedAt = new Date();
      updateData.isActive = false;
      updateData.rejectionReason = value.rejectionReason;
    }

    await technicianRef.update(updateData);

    // Create notification for technician
    await createTechnicianNotification(id, value.status, value.moderatorComments, value.badgeType);

    // Send email notification to technician
    try {
      const technicianData = doc.data();
      const technicianEmail = technicianData.email;
      const technicianName = technicianData.name || 'Technician';

      if (technicianEmail) {
        if (value.status === 'approved') {
          await emailService.sendApprovalEmail(
            technicianEmail,
            technicianName,
            value.badgeType,
            value.moderatorComments
          );
        } else if (value.status === 'rejected') {
          await emailService.sendRejectionEmail(
            technicianEmail,
            technicianName,
            value.rejectionReason || value.moderatorComments,
            value.moderatorComments
          );
        }
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: `Registration ${value.status} successfully`,
      data: {
        id,
        status: value.status,
        reviewedAt: updateData.reviewedAt,
        badgeType: value.badgeType,
        moderatorComments: value.moderatorComments
      }
    });
  } catch (err) {
    console.error('Review registration error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to review registration' 
    });
  }
};

// Get dashboard statistics for moderator
const getDashboardStats = async (req, res) => {
  try {
    const [pendingQuery, reviewingQuery, approvedQuery, rejectedQuery] = await Promise.all([
      technicianCollection.where('status', '==', 'pending').get(),
      technicianCollection.where('status', '==', 'reviewing').get(),
      technicianCollection.where('status', '==', 'approved').get(),
      technicianCollection.where('status', '==', 'rejected').get()
    ]);

    const stats = {
      pendingRegistrations: pendingQuery.size,
      reviewingRegistrations: reviewingQuery.size,
      approvedTechnicians: approvedQuery.size,
      rejectedRegistrations: rejectedQuery.size,
      totalRegistrations: pendingQuery.size + reviewingQuery.size + approvedQuery.size + rejectedQuery.size
    };

    // Get recent registrations (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentQuery = await technicianCollection
      .where('registeredAt', '>=', weekAgo)
      .orderBy('registeredAt', 'desc')
      .limit(5)
      .get();

    const recentRegistrations = recentQuery.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      email: doc.data().email,
      serviceCategory: doc.data().serviceCategory,
      status: doc.data().status,
      registeredAt: doc.data().registeredAt?.toDate()
    }));

    res.json({
      success: true,
      data: {
        stats,
        recentRegistrations
      }
    });
  } catch (err) {
    console.error('Get dashboard stats error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch dashboard statistics' 
    });
  }
};

// Update technician status (suspend, activate, etc.)
const updateTechnicianStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = technicianStatusUpdateSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        success: false,
        error: error.details[0].message 
      });
    }

    const technicianRef = technicianCollection.doc(id);
    const doc = await technicianRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Technician not found' 
      });
    }

    const updateData = {
      status: value.status,
      moderatorComments: value.moderatorComments || null,
      statusChangedBy: req.user?.id || 'moderator',
      statusChangedAt: new Date(),
      updatedAt: new Date()
    };

    // Handle different status changes
    if (value.status === 'suspended') {
      updateData.isActive = false;
      updateData.suspendedAt = new Date();
      const suspensionReason = value.moderatorComments || value.reason;
      if (suspensionReason) {
        updateData.suspensionReason = suspensionReason;
      }
    } else if (value.status === 'approved' || value.status === 'active') {
      updateData.isActive = true;
      updateData.suspendedAt = null;
      updateData.suspensionReason = null;
    }

    await technicianRef.update(updateData);

    // Create notification for technician (non-blocking)
    createTechnicianStatusNotification(id, value.status, value.moderatorComments || value.reason)
      .catch(err => console.error('Failed to create notification:', err));

    res.json({
      success: true,
      message: `Technician status updated to ${value.status}`,
      data: {
        id,
        status: value.status,
        updatedAt: updateData.updatedAt
      }
    });
  } catch (err) {
    console.error('Update technician status error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update technician status',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get all active technicians for management with ratings and badge info
const getTechnicians = async (req, res) => {
  try {
    const { status, badge, serviceCategory, page = 1, limit = 10 } = req.query;
    
    let query = technicianCollection;
    
    // Apply filters - but avoid orderBy with where clauses that might cause index issues
    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }
    
    const snapshot = await query.get();
    if (snapshot.empty) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          currentPage: parseInt(page),
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: parseInt(limit)
        }
      });
    }

    let technicians = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id, 
        ...data,
        registeredAt: data.registeredAt?.toDate ? data.registeredAt.toDate() : null,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : null
      };
    });

    // Sort by registeredAt in memory since we can't use orderBy with where clauses
    technicians.sort((a, b) => {
      const dateA = a.registeredAt || new Date(0);
      const dateB = b.registeredAt || new Date(0);
      return dateB - dateA; // Descending order (newest first)
    });

    // Fetch ratings for all technicians (limit to avoid too many concurrent requests)
    const technicianIds = technicians.map(tech => tech.id);
    const ratingMap = {};
    
    // Process technicians in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < technicianIds.length; i += batchSize) {
      const batch = technicianIds.slice(i, i + batchSize);
      const ratingPromises = batch.map(async (techId) => {
        try {
          const feedbackSnapshot = await db.collection('technicianFeedback')
            .where('technicianId', '==', techId)
            .get();
          
          if (feedbackSnapshot.empty) {
            return { technicianId: techId, rating: 0, reviewCount: 0 };
          }
          
          let totalRating = 0;
          let count = 0;
          feedbackSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.rating && typeof data.rating === 'number') {
              totalRating += data.rating;
              count++;
            }
          });
          
          const averageRating = count > 0 ? (totalRating / count) : 0;
          return { technicianId: techId, rating: Math.round(averageRating * 10) / 10, reviewCount: count };
        } catch (error) {
          console.error(`Error fetching ratings for technician ${techId}:`, error);
          return { technicianId: techId, rating: 0, reviewCount: 0 };
        }
      });

      const batchRatings = await Promise.all(ratingPromises);
      batchRatings.forEach(r => {
        ratingMap[r.technicianId] = { rating: r.rating, reviewCount: r.reviewCount };
      });
    }

    // Enhance technicians with rating data and ensure badge type is set
    technicians = technicians.map(tech => {
      const ratingData = ratingMap[tech.id] || { rating: 0, reviewCount: 0 };
      
      // Determine badge type if not set
      let badgeType = tech.badgeType || tech.verificationType;
      if (!badgeType) {
        // Default logic based on verification documents
        if (tech.verificationDocuments && tech.verificationDocuments.certificates && tech.verificationDocuments.certificates.length > 0) {
          badgeType = 'professional';
        } else if (tech.experience && tech.experience > 2) {
          badgeType = 'experience';
        } else {
          badgeType = 'probation';
        }
      }

      return {
        ...tech,
        rating: ratingData.rating,
        reviewCount: ratingData.reviewCount,
        badgeType: badgeType,
        // Ensure required fields have default values
        name: tech.name || 'Unknown',
        email: tech.email || 'No email',
        phone: tech.phone || 'No phone',
        serviceCategory: tech.serviceCategory || 'General',
        totalJobs: tech.totalJobs || 0,
        completedJobs: tech.completedJobs || 0,
        cancelledJobs: tech.cancelledJobs || 0,
        address: tech.address || 'Not provided',
        status: tech.status || 'pending'
      };
    });

    // Client-side filtering for fields not indexed in Firestore
    if (badge && badge !== 'all') {
      technicians = technicians.filter(tech => tech.badgeType === badge);
    }
    
    if (serviceCategory && serviceCategory !== 'all') {
      technicians = technicians.filter(tech => tech.serviceCategory === serviceCategory);
    }

    // Calculate pagination
    const total = technicians.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedTechnicians = technicians.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedTechnicians,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (err) {
    console.error('Get technicians error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ 
      success: false,
      error: `Failed to fetch technicians: ${err.message}`,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// Get detailed technician information with feedback and complaints
const getTechnicianDetails = async (req, res) => {
  try {
    console.log('Getting technician details for ID:', req.params.id);
    const { id } = req.params;
    
    // Get technician data
    const technicianDoc = await technicianCollection.doc(id).get();
    
    if (!technicianDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Technician not found'
      });
    }
    
    // Safely handle date conversions for technician data
    const data = technicianDoc.data();
    const technicianData = {
      id: technicianDoc.id,
      ...data,
      registeredAt: safeToDate(data.registeredAt),
      updatedAt: safeToDate(data.updatedAt)
    };
    
    // Get technician feedback/reviews
    const feedbackSnapshot = await db.collection('technicianFeedback')
      .where('technicianId', '==', id)
      .get();
    
    const feedback = [];
    let totalRating = 0;
    let ratingCount = 0;
    
    // Get customer names for feedback
    const customerIds = [];
    feedbackSnapshot.forEach(doc => {
      const data = doc.data();
      
      feedback.push({
        id: doc.id,
        ...data,
        createdAt: safeToDate(data.createdAt)
      });
      
      if (data.customerId) {
        customerIds.push(data.customerId);
      }
      
      if (data.rating && typeof data.rating === 'number') {
        totalRating += data.rating;
        ratingCount++;
      }
    });
    
    // Fetch customer names
    const customerNamesMap = {};
    if (customerIds.length > 0) {
      const uniqueCustomerIds = [...new Set(customerIds)];
      const customerPromises = uniqueCustomerIds.map(async (customerId) => {
        try {
          const customerDoc = await db.collection('users').doc(customerId).get();
          if (customerDoc.exists) {
            const customerData = customerDoc.data();
            const name = `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim() || 'Customer';
            return { id: customerId, name };
          }
        } catch (error) {
          console.error(`Error fetching customer ${customerId}:`, error);
        }
        return { id: customerId, name: 'Customer' };
      });
      
      const customerResults = await Promise.all(customerPromises);
      customerResults.forEach(customer => {
        customerNamesMap[customer.id] = customer.name;
      });
    }
    
    // Add customer names to feedback
    feedback.forEach(fb => {
      fb.customerName = customerNamesMap[fb.customerId] || 'Customer';
    });
    
    // Sort feedback by createdAt descending (newest first)
    feedback.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return dateB - dateA;
    });
    
    // Get complaints against this technician
    const complaintsSnapshot = await db.collection('complaints')
      .where('technician.userId', '==', id)
      .get();
    
    const complaints = [];
    complaintsSnapshot.forEach(doc => {
      const data = doc.data();
      complaints.push({
        id: doc.id,
        customer: data.customer,
        complaint: data.complaint,
        service: data.service,
        createdAt: data.complaint.submittedAt
      });
    });
    
    // Sort complaints by submittedAt descending (newest first)
    complaints.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return dateB - dateA;
    });
    
    // Calculate average rating
    const averageRating = ratingCount > 0 ? Math.round((totalRating / ratingCount) * 10) / 10 : 0;
    
    // Determine badge type if not set
    let badgeType = technicianData.badgeType || technicianData.verificationType;
    if (!badgeType) {
      if (technicianData.verificationDocuments && technicianData.verificationDocuments.certificates && technicianData.verificationDocuments.certificates.length > 0) {
        badgeType = 'professional';
      } else if (technicianData.experience && technicianData.experience > 2) {
        badgeType = 'experience';
      } else {
        badgeType = 'probation';
      }
    }
    
    const response = {
      technician: {
        ...technicianData,
        badgeType,
        rating: averageRating,
        reviewCount: ratingCount,
        complaintCount: complaints.length,
        totalJobs: technicianData.totalJobs || 0,
        completedJobs: technicianData.completedJobs || 0,
        cancelledJobs: technicianData.cancelledJobs || 0
      },
      feedback,
      complaints
    };
    
    res.json({
      success: true,
      data: response
    });
    
  } catch (err) {
    console.error('Get technician details error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch technician details',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Promote technician from probation
const promoteTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    const { badgeType = 'experience' } = req.body;
    
    const technicianRef = technicianCollection.doc(id);
    const doc = await technicianRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Technician not found'
      });
    }
    
    const technicianData = doc.data();
    
    // Check if technician is currently on probation
    if (technicianData.status !== 'probation' && technicianData.badgeType !== 'probation') {
      return res.status(400).json({
        success: false,
        error: 'Technician is not on probation'
      });
    }
    
    const updateData = {
      status: 'approved',
      badgeType: badgeType,
      updatedAt: new Date()
    };
    
    await technicianRef.update(updateData);
    
    // Create notification for technician
    await createTechnicianNotification(id, 'promoted', `You have been promoted to ${badgeType} status`, badgeType);
    
    res.json({
      success: true,
      message: 'Technician promoted successfully',
      data: {
        id,
        status: updateData.status,
        badgeType: updateData.badgeType,
        updatedAt: updateData.updatedAt
      }
    });
    
  } catch (err) {
    console.error('Promote technician error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to promote technician'
    });
  }
};

// Helper function to create technician notification
const createTechnicianNotification = async (technicianId, status, comments, badgeType) => {
  try {
    const notificationData = {
      type: 'registration_review',
      title: `Registration ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: status === 'approved' 
        ? `Congratulations! Your registration has been approved${badgeType ? ` with ${badgeType} badge` : ''}.` 
        : `Your registration has been ${status}.${comments ? ` Comment: ${comments}` : ''}`,
      technicianId: technicianId,
      status: status,
      badgeType: badgeType || null,
      comments: comments || null,
      isRead: false,
      createdAt: new Date()
    };
    
    await technicianNotificationCollection.add(notificationData);
  } catch (error) {
    console.error('Failed to create technician notification:', error);
  }
};

// Helper function to create technician status notification
const createTechnicianStatusNotification = async (technicianId, status, reason) => {
  try {
    const notificationData = {
      type: 'status_change',
      title: `Account Status Changed`,
      message: `Your account status has been changed to ${status}.${reason ? ` Reason: ${reason}` : ''}`,
      technicianId: technicianId,
      status: status,
      reason: reason || null,
      isRead: false,
      createdAt: new Date()
    };
    
    await technicianNotificationCollection.add(notificationData);
  } catch (error) {
    console.error('Failed to create technician status notification:', error);
  }
};

// Get document with secure access
const getDocument = async (req, res) => {
  try {
    const { technicianId, documentType } = req.params;
    
    // Get technician data
    const technicianDoc = await technicianCollection.doc(technicianId).get();
    if (!technicianDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Technician not found'
      });
    }
    
    const technicianData = technicianDoc.data();
    let documentUrl;
    
    // Get the appropriate document URL
    switch (documentType) {
      case 'profilePicture':
        documentUrl = technicianData.profilePictureUrl;
        break;
      case 'idProof':
        documentUrl = technicianData.idProofUrl;
        break;
      case 'certificates':
        // For certificates, return all certificate URLs
        const certificates = technicianData.certificateUrls || [];
        const certificateAccess = await Promise.all(
          certificates.map(async (cert) => {
            try {
              const signedUrl = await generateSignedUrl(cert.url, 'read', 60);
              return {
                ...cert,
                signedUrl: signedUrl
              };
            } catch (error) {
              return {
                ...cert,
                error: 'Failed to generate access URL'
              };
            }
          })
        );
        
        return res.json({
          success: true,
          data: {
            documentType: 'certificates',
            documents: certificateAccess
          }
        });
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid document type'
        });
    }
    
    if (!documentUrl) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }
    
    // Generate signed URL for secure access
    const signedUrl = await generateSignedUrl(documentUrl, 'read', 60);
    const metadata = await getDocumentMetadata(documentUrl);
    
    res.json({
      success: true,
      data: {
        documentType,
        signedUrl,
        metadata,
        expiresIn: 60 // minutes
      }
    });
    
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to access document'
    });
  }
};

// Verify document integrity and accessibility
const verifyDocument = async (req, res) => {
  try {
    const { technicianId, documentType } = req.params;
    
    const technicianDoc = await technicianCollection.doc(technicianId).get();
    if (!technicianDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Technician not found'
      });
    }
    
    const technicianData = technicianDoc.data();
    let documentUrl;
    
    switch (documentType) {
      case 'profilePicture':
        documentUrl = technicianData.profilePictureUrl;
        break;
      case 'idProof':
        documentUrl = technicianData.idProofUrl;
        break;
      case 'certificates':
        const certificates = technicianData.certificateUrls || [];
        const verificationResults = await Promise.all(
          certificates.map(async (cert) => {
            const verification = await verifyDocumentAccess(cert.url);
            return {
              ...cert,
              verification
            };
          })
        );
        
        return res.json({
          success: true,
          data: {
            documentType: 'certificates',
            verificationResults
          }
        });
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid document type'
        });
    }
    
    if (!documentUrl) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }
    
    const verification = await verifyDocumentAccess(documentUrl);
    
    res.json({
      success: true,
      data: {
        documentType,
        verification
      }
    });
    
  } catch (error) {
    console.error('Verify document error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify document'
    });
  }
};

// Add review notes to a registration
const addReviewNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, reviewStage } = req.body;
    
    if (!notes || notes.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Review notes are required'
      });
    }
    
    const technicianRef = technicianCollection.doc(id);
    const doc = await technicianRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found'
      });
    }
    
    const currentData = doc.data();
    const reviewNotes = currentData.reviewNotes || [];
    
    const newNote = {
      note: notes.trim(),
      reviewStage: reviewStage || 'general',
      addedBy: req.user?.id || 'moderator',
      addedAt: new Date()
    };
    
    reviewNotes.push(newNote);
    
    await technicianRef.update({
      reviewNotes: reviewNotes,
      updatedAt: new Date()
    });
    
    res.json({
      success: true,
      message: 'Review notes added successfully',
      data: newNote
    });
    
  } catch (error) {
    console.error('Add review notes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add review notes'
    });
  }
};

module.exports = {
  registerModerator,
  loginModerator,
  getPendingRegistrations,
  getAllRegistrations,
  getRegistrationDetails,
  reviewTechnicianRegistration,
  getDashboardStats,
  updateTechnicianStatus,
  getTechnicians,
  getTechnicianDetails,
  promoteTechnician,
  getDocument,
  verifyDocument,
  addReviewNotes
};
