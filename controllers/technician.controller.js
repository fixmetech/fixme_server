const { db } = require('../firebase');
const bcrypt = require('bcryptjs');
const Technician = require('../models/technician.model');
const { technicianRegistrationSchema, technicianUpdateSchema } = require('../validators/technician.validator');
const { uploadToFirebaseStorage, generateFileName } = require('../utils/upload.util');

const collection = db.collection('technicians');

// Register new technician
const registerTechnician = async (req, res) => {
  try {
    // Parse specializations if it's a JSON string
    if (req.body.specializations && typeof req.body.specializations === 'string') {
      try {
        req.body.specializations = JSON.parse(req.body.specializations);
      } catch (e) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid specializations format' 
        });
      }
    }

    // Convert serviceRadius to number if it's a string
    if (req.body.serviceRadius && typeof req.body.serviceRadius === 'string') {
      req.body.serviceRadius = parseFloat(req.body.serviceRadius);
    }

    // Validate request body
    const { error, value } = technicianRegistrationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false,
        error: error.details[0].message 
      });
    }

    // Check if email already exists
    const existingTechnician = await collection.where('email', '==', value.email).get();
    if (!existingTechnician.empty) {
      return res.status(409).json({
        success: false,
        error: 'A technician with this email already exists'
      });
    }

    // Check if NIC already exists (removing this check as frontend doesn't have NIC)
    const existingPhone = await collection.where('phone', '==', value.phone).get();
    if (!existingPhone.empty) {
      return res.status(409).json({
        success: false,
        error: 'A technician with this phone number already exists'
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(value.password, saltRounds);

    // Handle file uploads
    let profilePictureUrl = null;
    let idProofUrl = null;
    let certificateUrls = [];

    // Upload profile picture if provided
    if (req.files && req.files.profilePicture) {
      const profilePicture = req.files.profilePicture[0];
      const fileName = generateFileName(profilePicture.originalname, 'profile_');
      profilePictureUrl = await uploadToFirebaseStorage(
        profilePicture, 
        'technicians/profiles', 
        fileName
      );
    }

    // Upload ID proof if provided (required)
    if (req.files && req.files.idProof) {
      const idProof = req.files.idProof[0];
      const fileName = generateFileName(idProof.originalname, 'id_');
      idProofUrl = await uploadToFirebaseStorage(
        idProof,
        'technicians/id_proofs',
        fileName
      );
    }

    // Upload certificates if provided (multiple files allowed)
    if (req.files && req.files.certificates) {
      for (const certificate of req.files.certificates) {
        const fileName = generateFileName(certificate.originalname, 'cert_');
        const certificateUrl = await uploadToFirebaseStorage(
          certificate,
          'technicians/certificates',
          fileName
        );
        certificateUrls.push({
          url: certificateUrl,
          originalName: certificate.originalname,
          uploadedAt: new Date(),
          fileSize: certificate.size,
          mimeType: certificate.mimetype
        });
      }
    }

    // Create technician object
    const technicianData = {
      ...value,
      password: hashedPassword,
      profilePictureUrl: profilePictureUrl,
      idProofUrl: idProofUrl,
      certificateUrls: certificateUrls
    };

    const technician = new Technician(technicianData);
    
    // Save to Firestore
    const docRef = await collection.add({
      ...technician,
      registeredAt: new Date(),
      updatedAt: new Date()
    });

    // Create notification for moderators
    await createModeratorNotification(docRef.id, technician);

    res.status(201).json({
      success: true,
      message: 'Technician registration submitted successfully. Your application is under review.',
      data: {
        id: docRef.id,
        email: technician.email,
        status: technician.status,
        submittedAt: technician.registeredAt
      }
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to register technician. Please try again.' 
    });
  }
};

// Get all technician registrations (for moderators)
const getAllTechnicians = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let query = collection.orderBy('registeredAt', 'desc');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    const snapshot = await query.get();
    const technicians = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      registeredAt: doc.data().registeredAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));

    res.json({
      success: true,
      data: technicians,
      total: technicians.length
    });
  } catch (err) {
    console.error('Get technicians error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch technicians' 
    });
  }
};

// Get technician by ID
const getTechnicianById = async (req, res) => {
  try {
    const doc = await collection.doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Technician not found' 
      });
    }
    
    const data = doc.data();
    res.json({
      success: true,
      data: { 
        id: doc.id, 
        ...data,
        registeredAt: data.registeredAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      }
    });
  } catch (err) {
    console.error('Get technician error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch technician' 
    });
  }
};

// Update technician status (approve/reject) - for moderators
const updateTechnicianStatus = async (req, res) => {
  try {
    const { error, value } = technicianUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false,
        error: error.details[0].message 
      });
    }

    const technicianRef = collection.doc(req.params.id);
    const doc = await technicianRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Technician not found' 
      });
    }

    const updateData = {
      ...value,
      updatedAt: new Date()
    };

    // Add approval/rejection timestamps
    if (value.status === 'approved') {
      updateData.approvedAt = new Date();
      updateData.isActive = true;
    } else if (value.status === 'rejected') {
      updateData.rejectedAt = new Date();
      updateData.isActive = false;
    }

    await technicianRef.update(updateData);

    // Send notification to technician about status update
    await sendStatusUpdateNotification(req.params.id, value.status, value.moderatorComments);

    res.json({
      success: true,
      message: `Technician ${value.status} successfully`,
      data: updateData
    });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update technician status' 
    });
  }
};

// Get technician status by email (for technician app)
const getTechnicianStatus = async (req, res) => {
  try {
    const { email } = req.params;
    
    const snapshot = await collection.where('email', '==', email).get();
    
    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'No registration found for this email'
      });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    
    res.json({
      success: true,
      data: {
        id: doc.id,
        status: data.status,
        isActive: data.isActive,
        submittedAt: data.registeredAt?.toDate(),
        approvedAt: data.approvedAt?.toDate(),
        rejectedAt: data.rejectedAt?.toDate(),
        moderatorComments: data.moderatorComments
      }
    });
  } catch (err) {
    console.error('Get status error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch registration status' 
    });
  }
};
//change the avaialble status of the technician
const changeTechnicianAvailability = async (req, res) => {
  try {
    
    const technicianId = req.params.id;
    const technicianRef = collection.doc(technicianId);
    const doc = await technicianRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Technician not found'
      });
    }

    const technicianData = doc.data();
    const isActive = technicianData.isActive;
   

    await technicianRef.update({
      isActive: !isActive,
      updatedAt: new Date()
    });
    
    res.json({
      success: true,
      message: `Technician availability updated to ${isActive ? 'active' : 'inactive'}`,
      data: {
        id: technicianId,
        isActive: isActive,
        updatedAt: new Date()
      }
    });
  } catch (err) {
    console.error('Change availability error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to change technician availability'
    });
  }
};





// Helper function to create moderator notification
const createModeratorNotification = async (technicianId, technicianData) => {
  try {
    const notificationData = {
      type: 'technician_registration',
      title: 'New Technician Registration',
      message: `${technicianData.name} has submitted a registration request`,
      technicianId: technicianId,
      isRead: false,
      createdAt: new Date()
    };
    
    await db.collection('moderator_notifications').add(notificationData);
  } catch (error) {
    console.error('Failed to create moderator notification:', error);
  }
};

// Helper function to send status update notification
const sendStatusUpdateNotification = async (technicianId, status, comments) => {
  try {
    const notificationData = {
      type: 'status_update',
      title: `Registration ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: status === 'approved' 
        ? 'Congratulations! Your registration has been approved.' 
        : 'Your registration has been rejected.',
      technicianId: technicianId,
      status: status,
      comments: comments,
      isRead: false,
      createdAt: new Date()
    };
    
    await db.collection('technician_notifications').add(notificationData);
  } catch (error) {
    console.error('Failed to send status notification:', error);
  }
};

// Login technician
const loginTechnician = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find technician by email
    const technicianQuery = await collection.where('email', '==', email).get();
    
    if (technicianQuery.empty) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const technicianDoc = technicianQuery.docs[0];
    const technicianData = technicianDoc.data();

    // Check if technician is approved
    if (technicianData.status !== 'approved') {
      return res.status(403).json({
        success: false,
        error: 'Your account is not yet approved. Please wait for moderator approval.',
        status: technicianData.status
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, technicianData.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Remove sensitive data before sending response
    const { password: _, ...safeUserData } = technicianData;


    res.json({
      success: true,
      message: 'Login successful',
      data: {
        id: technicianDoc.id,
        ...safeUserData,
        lastLogin: new Date()
      }
    });

    // Update last login time
    await collection.doc(technicianDoc.id).update({
      lastLogin: new Date(),
      updatedAt: new Date(),
      isActive: true // Set active status on login
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.'
    });
  }
};

module.exports = {
  registerTechnician,
  getAllTechnicians,
  getTechnicianById,
  updateTechnicianStatus,
  getTechnicianStatus,
  loginTechnician,
  changeTechnicianAvailability
};
