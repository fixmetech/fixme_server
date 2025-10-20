const { db, bucket } = require('../firebase');
const Complaint = require('../models/complaint.model');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    // Check file extension as fallback for mobile uploads with incorrect MIME types
    if (mimetype && extname) {
      return cb(null, true);
    } else if (extname && file.mimetype === 'application/octet-stream') {
      // Allow files with correct extensions but wrong MIME type (common in mobile uploads)
      return cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed!'));
    }
  }
});

const complaintsCollection = 'complaints';

class ComplaintController {
  // Create a new complaint with evidence
  static async createComplaintWithEvidence(req, res) {
    try {
      // Parse complaint data from form fields
      const complaintData = JSON.parse(req.body.complaintData || '{}');
      
      // Generate unique ID
      const complaintId = uuidv4();

      // Enhance customer data with proper name from database
      if (complaintData.customer && complaintData.customer.userId) {
        try {
          const userDoc = await db.collection('users').doc(complaintData.customer.userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data() || {};
            const firstName = userData.firstName || '';
            const lastName = userData.lastName || '';
            
            // Concatenate first and last name
            let fullName = '';
            if (firstName && lastName) {
              fullName = `${firstName} ${lastName}`;
            } else if (firstName) {
              fullName = firstName;
            } else if (lastName) {
              fullName = lastName;
            } else {
              fullName = complaintData.customer.name || 'Unknown User';
            }

            // Update customer data with proper name and other details
            complaintData.customer.name = fullName;
            complaintData.customer.email = userData.email || complaintData.customer.email;
            complaintData.customer.phone = userData.phone || complaintData.customer.phone;
            
            console.log('Enhanced customer data:', {
              name: fullName,
              email: complaintData.customer.email,
              userId: complaintData.customer.userId
            });
          }
        } catch (userFetchError) {
          console.warn('Could not fetch user details from database:', userFetchError);
          // Continue with original data if user fetch fails
        }
      }
      
      // Create complaint instance
      const complaint = new Complaint({
        id: complaintId,
        ...complaintData
      });

      // Validate complaint
      const validationErrors = complaint.validate();
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors
        });
      }

      // Handle evidence files if any
      if (req.files && req.files.length > 0) {
        const uploadPromises = req.files.map(async (file, index) => {
          const fileName = `complaints/${complaintId}/${uuidv4()}_${file.originalname}`;
          const fileUpload = bucket.file(fileName);

          await fileUpload.save(file.buffer, {
            metadata: {
              contentType: file.mimetype,
            },
          });

          // Make file publicly readable
          await fileUpload.makePublic();

          const fileUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

          return {
            fileName: file.originalname,
            url: fileUrl,
            uploadedAt: new Date().toISOString()
          };
        });

        const uploadedFiles = await Promise.all(uploadPromises);

        // Add evidence to complaint
        complaint.complaint.evidence = uploadedFiles;
        complaint.touch();
      }

      // Save to Firestore
      await db.collection(complaintsCollection).doc(complaintId).set(complaint.toFirebaseObject());

      res.status(201).json({
        success: true,
        message: 'Complaint created successfully',
        data: {
          complaintId: complaintId,
          complaint: complaint,
          evidenceCount: complaint.complaint.evidence.length
        }
      });

    } catch (error) {
      console.error('Error creating complaint:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Create a new complaint (without evidence - kept for backward compatibility)
  static async createComplaint(req, res) {
    try {
      const complaintData = req.body;
      
      // Generate unique ID
      const complaintId = uuidv4();

      // Enhance customer data with proper name from database
      if (complaintData.customer && complaintData.customer.userId) {
        try {
          const userDoc = await db.collection('users').doc(complaintData.customer.userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data() || {};
            const firstName = userData.firstName || '';
            const lastName = userData.lastName || '';
            
            // Concatenate first and last name
            let fullName = '';
            if (firstName && lastName) {
              fullName = `${firstName} ${lastName}`;
            } else if (firstName) {
              fullName = firstName;
            } else if (lastName) {
              fullName = lastName;
            } else {
              fullName = complaintData.customer.name || 'Unknown User';
            }

            // Update customer data with proper name and other details
            complaintData.customer.name = fullName;
            complaintData.customer.email = userData.email || complaintData.customer.email;
            complaintData.customer.phone = userData.phone || complaintData.customer.phone;
            
            console.log('Enhanced customer data:', {
              name: fullName,
              email: complaintData.customer.email,
              userId: complaintData.customer.userId
            });
          }
        } catch (userFetchError) {
          console.warn('Could not fetch user details from database:', userFetchError);
          // Continue with original data if user fetch fails
        }
      }
      
      // Create complaint instance
      const complaint = new Complaint({
        id: complaintId,
        ...complaintData
      });

      // Validate complaint
      const validationErrors = complaint.validate();
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors
        });
      }

      // Save to Firestore
      await db.collection(complaintsCollection).doc(complaintId).set(complaint.toFirebaseObject());

      res.status(201).json({
        success: true,
        message: 'Complaint created successfully',
        data: {
          complaintId: complaintId,
          complaint: complaint
        }
      });

    } catch (error) {
      console.error('Error creating complaint:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get all complaints with filters
  static async getComplaints(req, res) {
    try {
      const { status, severity, customerId, technicianId, limit = 50, offset = 0 } = req.query;

      let query = db.collection(complaintsCollection);

      // Apply Firestore filters
      if (status) {
        query = query.where('complaint.status', '==', status);
      }
      if (severity) {
        query = query.where('complaint.severity', '==', severity);
      }
      if (customerId) {
        query = query.where('customer.userId', '==', customerId);
      }
      if (technicianId) {
        query = query.where('technician.userId', '==', technicianId);
      }

      // Order by submission date (newest first)
      query = query.orderBy('complaint.submittedAt', 'desc');

      // Apply pagination
      query = query.limit(parseInt(limit)).offset(parseInt(offset));

      const snapshot = await query.get();

      if (snapshot.empty) {
        return res.status(200).json({
          success: true,
          data: [],
          total: 0
        });
      }

      // Convert to array
      const complaints = [];
      snapshot.forEach(doc => {
        complaints.push(Complaint.fromFirebaseSnapshot(doc.id, doc.data()));
      });

      // Get total count for pagination (this is a separate query in Firestore)
      let countQuery = db.collection(complaintsCollection);
      if (status) {
        countQuery = countQuery.where('complaint.status', '==', status);
      }
      if (severity) {
        countQuery = countQuery.where('complaint.severity', '==', severity);
      }
      if (customerId) {
        countQuery = countQuery.where('customer.userId', '==', customerId);
      }
      if (technicianId) {
        countQuery = countQuery.where('technician.userId', '==', technicianId);
      }

      const countSnapshot = await countQuery.get();
      const total = countSnapshot.size;

      res.status(200).json({
        success: true,
        data: complaints,
        total: total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

    } catch (error) {
      console.error('Error fetching complaints:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get complaint by ID
  static async getComplaintById(req, res) {
    try {
      const { complaintId } = req.params;

      const doc = await db.collection(complaintsCollection).doc(complaintId).get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Complaint not found'
        });
      }

      const complaint = Complaint.fromFirebaseSnapshot(doc.id, doc.data());

      res.status(200).json({
        success: true,
        data: complaint
      });

    } catch (error) {
      console.error('Error fetching complaint:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Update complaint status
  static async updateComplaintStatus(req, res) {
    try {
      const { complaintId } = req.params;
      const { status, notes } = req.body;

      const validStatuses = ['pending', 'investigating', 'resolved', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      const doc = await db.collection(complaintsCollection).doc(complaintId).get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Complaint not found'
        });
      }

      const complaint = Complaint.fromFirebaseSnapshot(doc.id, doc.data());
      complaint.updateStatus(status);

      if (notes) {
        complaint.resolution.notes = notes;
      }

      await db.collection(complaintsCollection).doc(complaintId).update(complaint.toFirebaseObject());

      res.status(200).json({
        success: true,
        message: 'Complaint status updated successfully',
        data: complaint
      });

    } catch (error) {
      console.error('Error updating complaint status:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Resolve complaint
  static async resolveComplaint(req, res) {
    try {
      const { complaintId } = req.params;
      const { action, refundAmount, notes, technicianAction, resolvedBy } = req.body;

      const doc = await db.collection(complaintsCollection).doc(complaintId).get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Complaint not found'
        });
      }

      const complaint = Complaint.fromFirebaseSnapshot(doc.id, doc.data());
      
      complaint.setResolution({
        action,
        refundAmount: refundAmount || 0,
        notes,
        technicianAction,
        resolvedBy
      });

      await db.collection(complaintsCollection).doc(complaintId).update(complaint.toFirebaseObject());

      res.status(200).json({
        success: true,
        message: 'Complaint resolved successfully',
        data: complaint
      });

    } catch (error) {
      console.error('Error resolving complaint:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Upload evidence files
  static async uploadEvidence(req, res) {
    try {
      const { complaintId } = req.params;
      const files = req.files;

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      const doc = await db.collection(complaintsCollection).doc(complaintId).get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Complaint not found'
        });
      }

      const uploadPromises = files.map(async (file, index) => {
        const fileName = `complaints/${complaintId}/${uuidv4()}_${file.originalname}`;
        const fileUpload = bucket.file(fileName);

        await fileUpload.save(file.buffer, {
          metadata: {
            contentType: file.mimetype,
          },
        });

        // Make file publicly readable
        await fileUpload.makePublic();

        const fileUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        return {
          fileName: file.originalname,
          url: fileUrl,
          uploadedAt: new Date().toISOString()
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      // Update complaint with new evidence
      const complaint = Complaint.fromFirebaseSnapshot(doc.id, doc.data());
      complaint.complaint.evidence = [...complaint.complaint.evidence, ...uploadedFiles];
      complaint.touch();

      await db.collection(complaintsCollection).doc(complaintId).update(complaint.toFirebaseObject());

      res.status(200).json({
        success: true,
        message: 'Evidence uploaded successfully',
        data: {
          uploadedFiles: uploadedFiles,
          complaint: complaint
        }
      });

    } catch (error) {
      console.error('Error uploading evidence:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get complaint statistics
  static async getComplaintStats(req, res) {
    try {
      const snapshot = await db.collection(complaintsCollection).get();

      if (snapshot.empty) {
        return res.status(200).json({
          success: true,
          data: {
            total: 0,
            pending: 0,
            investigating: 0,
            resolved: 0,
            rejected: 0,
            highSeverity: 0
          }
        });
      }

      const complaints = [];
      snapshot.forEach(doc => {
        complaints.push(doc.data());
      });
      
      const stats = {
        total: complaints.length,
        pending: complaints.filter(c => c.complaint.status === 'pending').length,
        investigating: complaints.filter(c => c.complaint.status === 'investigating').length,
        resolved: complaints.filter(c => c.complaint.status === 'resolved').length,
        rejected: complaints.filter(c => c.complaint.status === 'rejected').length,
        highSeverity: complaints.filter(c => c.complaint.severity === 'high' || c.complaint.severity === 'urgent').length
      };

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error fetching complaint stats:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get customer's complaints
  static async getCustomerComplaints(req, res) {
    try {
      const { customerId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const query = db.collection(complaintsCollection)
        .where('customer.userId', '==', customerId)
        .orderBy('complaint.submittedAt', 'desc')
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      const snapshot = await query.get();

      if (snapshot.empty) {
        return res.status(200).json({
          success: true,
          data: [],
          total: 0
        });
      }

      const complaints = [];
      snapshot.forEach(doc => {
        complaints.push(Complaint.fromFirebaseSnapshot(doc.id, doc.data()));
      });

      // Get total count for pagination
      const countQuery = db.collection(complaintsCollection)
        .where('customer.userId', '==', customerId);
      const countSnapshot = await countQuery.get();
      const total = countSnapshot.size;

      res.status(200).json({
        success: true,
        data: complaints,
        total: total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

    } catch (error) {
      console.error('Error fetching customer complaints:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

// Export multer upload middleware
ComplaintController.uploadMiddleware = upload.array('evidence', 5); // Max 5 files

module.exports = ComplaintController;
