const { db, admin, msg } = require("../firebase");
const bcrypt = require("bcryptjs");
const Technician = require("../models/technician.model");
const {
  technicianRegistrationSchema,
  technicianUpdateSchema,
} = require("../validators/technician.validator");
const {
  uploadToFirebaseStorage,
  generateFileName,
} = require("../utils/upload.util");

const collection = db.collection("technicians");

// Register new technician
const registerTechnician = async (req, res) => {
  try {
    // Parse specializations if it's a JSON string
    if (
      req.body.specializations &&
      typeof req.body.specializations === "string"
    ) {
      try {
        req.body.specializations = JSON.parse(req.body.specializations);
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: "Invalid specializations format",
        });
      }
    }

    // Convert serviceRadius to number if it's a string
    if (req.body.serviceRadius && typeof req.body.serviceRadius === "string") {
      req.body.serviceRadius = parseFloat(req.body.serviceRadius);
    }

    // Convert experience to number if it's a string
    if (req.body.experience && typeof req.body.experience === "string") {
      req.body.experience = parseInt(req.body.experience);
    }

    // Parse languages if it's a JSON string
    if (req.body.languages && typeof req.body.languages === "string") {
      try {
        req.body.languages = JSON.parse(req.body.languages);
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: "Invalid languages format",
        });
      }
    }

    // Parse date of birth if provided
    if (req.body.dateOfBirth && typeof req.body.dateOfBirth === "string") {
      req.body.dateOfBirth = new Date(req.body.dateOfBirth);
    }

    // Validate request body
    const { error, value } = technicianRegistrationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
    }

    // Check if email already exists
    const existingTechnician = await collection
      .where("email", "==", value.email)
      .get();
    if (!existingTechnician.empty) {
      return res.status(409).json({
        success: false,
        error: "A technician with this email already exists",
      });
    }

    // Check if phone already exists
    const existingPhone = await collection
      .where("phone", "==", value.phone)
      .get();
    if (!existingPhone.empty) {
      return res.status(409).json({
        success: false,
        error: "A technician with this phone number already exists",
      });
    }

    // Check if NIC already exists (if provided)
    if (value.nicNumber) {
      const existingNIC = await collection
        .where("nicNumber", "==", value.nicNumber)
        .get();
      if (!existingNIC.empty) {
        return res.status(409).json({
          success: false,
          error: "A technician with this NIC number already exists",
        });
      }
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(value.password, saltRounds);

    // Handle file uploads
    let profilePictureUrl = null;
    let idProofUrl = null;
    let idProofBackUrl = null;
    let verificationDocuments = {
      certificates: [],
      workPhotos: [],
      recommendationLetters: [],
      clientReviews: [],
      applicationType: value.verificationType || "newbie",
      applicationReason: value.applicationReason || null,
    };

    // Upload profile picture if provided
    if (req.files && req.files.profilePicture) {
      const profilePicture = req.files.profilePicture[0];
      const fileName = generateFileName(
        profilePicture.originalname,
        "profile_"
      );
      profilePictureUrl = await uploadToFirebaseStorage(
        profilePicture,
        "technicians/profiles",
        fileName
      );
    }

    // Upload ID proof if provided (required)
    if (req.files && req.files.idProof) {
      const idProof = req.files.idProof[0];
      const fileName = generateFileName(idProof.originalname, "id_");
      idProofUrl = await uploadToFirebaseStorage(
        idProof,
        "technicians/id_proofs",
        fileName
      );
    }

    // Upload ID proof back side if provided
    if (req.files && req.files.idProofBack) {
      const idProofBack = req.files.idProofBack[0];
      const fileName = generateFileName(idProofBack.originalname, "id_back_");
      idProofBackUrl = await uploadToFirebaseStorage(
        idProofBack,
        "technicians/id_proofs",
        fileName
      );
    }

    // Upload certificates if provided (multiple files allowed)
    if (req.files && req.files.certificates) {
      for (const certificate of req.files.certificates) {
        const fileName = generateFileName(certificate.originalname, "cert_");
        const certificateUrl = await uploadToFirebaseStorage(
          certificate,
          "technicians/certificates",
          fileName
        );
        const certData = {
          url: certificateUrl,
          originalName: certificate.originalname,
          uploadedAt: new Date(),
          fileSize: certificate.size,
          mimeType: certificate.mimetype,
        };
        verificationDocuments.certificates.push(certData);
      }
    }

    // Upload work photos if provided
    if (req.files && req.files.workPhotos) {
      for (const workPhoto of req.files.workPhotos) {
        const fileName = generateFileName(workPhoto.originalname, "work_");
        const workPhotoUrl = await uploadToFirebaseStorage(
          workPhoto,
          "technicians/verification/work_photos",
          fileName
        );
        verificationDocuments.workPhotos.push({
          url: workPhotoUrl,
          originalName: workPhoto.originalname,
          uploadedAt: new Date(),
          fileSize: workPhoto.size,
          mimeType: workPhoto.mimetype,
        });
      }
    }

    // Upload recommendation letters if provided
    if (req.files && req.files.recommendationLetters) {
      for (const letter of req.files.recommendationLetters) {
        const fileName = generateFileName(letter.originalname, "rec_");
        const letterUrl = await uploadToFirebaseStorage(
          letter,
          "technicians/verification/recommendations",
          fileName
        );
        verificationDocuments.recommendationLetters.push({
          url: letterUrl,
          originalName: letter.originalname,
          uploadedAt: new Date(),
          fileSize: letter.size,
          mimeType: letter.mimetype,
        });
      }
    }

    // Upload client reviews if provided
    if (req.files && req.files.clientReviews) {
      for (const review of req.files.clientReviews) {
        const fileName = generateFileName(review.originalname, "review_");
        const reviewUrl = await uploadToFirebaseStorage(
          review,
          "technicians/verification/client_reviews",
          fileName
        );
        verificationDocuments.clientReviews.push({
          url: reviewUrl,
          originalName: review.originalname,
          uploadedAt: new Date(),
          fileSize: review.size,
          mimeType: review.mimetype,
        });
      }
    }

    // Create technician object
    const technicianData = {
      ...value,
      password: hashedPassword,
      profilePictureUrl: profilePictureUrl,
      idProofUrl: idProofUrl,
      idProofBackUrl: idProofBackUrl,
      verificationDocuments: verificationDocuments,
    };

    const technician = new Technician(technicianData);

    // Save to Firestore
    const docRef = await collection.add({
      name: technician.name,
      email: technician.email,
      phone: technician.phone,
      password: technician.password,
      dateOfBirth: technician.dateOfBirth,
      gender: technician.gender,
      nicNumber: technician.nicNumber,
      experience: technician.experienceYears,
      language: technician.languages,
      serviceCategory: technician.serviceCategory,
      specializations: technician.specializations,
      serviceDescription: technician.serviceDescription,
      address: technician.address,
      serviceRadius: technician.serviceRadius,
      bankName: technician.bankName,
      accountNumber: technician.accountNumber,
      branch: technician.branch,
      idProofUrl: technician.idProofUrl,
      idProofBackUrl: technician.idProofBackUrl,
      profilePictureUrl: technician.profilePictureUrl,
      verificationType: technician.verificationType,
      verificationDocuments: technician.verificationDocuments,
      role: technician.role,
      status: technician.status,
      moderatorComments: technician.moderatorComments,
      approvedAt: technician.approvedAt,
      rejectedAt: technician.rejectedAt,
      rating: technician.rating,
      totalJobs: technician.totalJobs,
      isActive: technician.isActive,
      // Wallet System
      walletBalance: technician.walletBalance,
      walletThreshold: technician.walletThreshold,
      walletTransactions: technician.walletTransactions,
      registeredAt: new Date(),
      updatedAt: new Date(),
    });

    // Create notification for moderators
    await createModeratorNotification(docRef.id, technician);

    res.status(201).json({
      success: true,
      message:
        "Technician registration submitted successfully. Your application is under review.",
      data: {
        id: docRef.id,
        email: technician.email,
        status: technician.status,
        submittedAt: technician.registeredAt,
      },
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to register technician. Please try again.",
    });
  }
};

// Get all technician registrations (for moderators)
const getAllTechnicians = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let query = collection.orderBy("registeredAt", "desc");

    if (status) {
      query = query.where("status", "==", status);
    }

    const snapshot = await query.get();
    const technicians = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      registeredAt: doc.data().registeredAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    }));

    res.json({
      success: true,
      data: technicians,
      total: technicians.length,
    });
  } catch (err) {
    console.error("Get technicians error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch technicians",
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
        error: "Technician not found",
      });
    }

    const data = doc.data();
    res.json({
      success: true,
      data: {
        id: doc.id,
        ...data,
        registeredAt: data.registeredAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      },
    });
  } catch (err) {
    console.error("Get technician error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch technician",
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
        error: error.details[0].message,
      });
    }

    const technicianRef = collection.doc(req.params.id);
    const doc = await technicianRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: "Technician not found",
      });
    }

    const updateData = {
      ...value,
      updatedAt: new Date(),
    };

    // Add approval/rejection timestamps
    if (value.status === "approved") {
      updateData.approvedAt = new Date();
      updateData.isActive = true;
    } else if (value.status === "rejected") {
      updateData.rejectedAt = new Date();
      updateData.isActive = false;
    }

    await technicianRef.update(updateData);

    // Send notification to technician about status update
    await sendStatusUpdateNotification(
      req.params.id,
      value.status,
      value.moderatorComments
    );

    res.json({
      success: true,
      message: `Technician ${value.status} successfully`,
      data: updateData,
    });
  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to update technician status",
    });
  }
};

// Get technician status by email (for technician app)
const getTechnicianStatus = async (req, res) => {
  try {
    const { email } = req.params;

    const snapshot = await collection.where("email", "==", email).get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        error: "No registration found for this email",
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
        moderatorComments: data.moderatorComments,
      },
    });
  } catch (err) {
    console.error("Get status error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch registration status",
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
        error: "Technician not found",
      });
    }

    const technicianData = doc.data();
    const currentStatus = technicianData.isActive;
    const newStatus = !currentStatus;

    await technicianRef.update({
      isActive: newStatus,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: `Technician availability updated to ${newStatus ? 'active' : 'inactive'}`,
      data: {
        id: technicianId,
        isActive: newStatus,
        updatedAt: new Date()
      }
    });
  } catch (err) {
    console.error("Change availability error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to change technician availability",
    });
  }
};

// Helper function to create moderator notification
const createModeratorNotification = async (technicianId, technicianData) => {
  try {
    const notificationData = {
      type: "technician_registration",
      title: "New Technician Registration",
      message: `${technicianData.name} has submitted a registration request`,
      technicianId: technicianId,
      isRead: false,
      createdAt: new Date(),
    };

    await db.collection("moderator_notifications").add(notificationData);
  } catch (error) {
    console.error("Failed to create moderator notification:", error);
  }
};

// Helper function to send status update notification
const sendStatusUpdateNotification = async (technicianId, status, comments) => {
  try {
    const notificationData = {
      type: "status_update",
      title: `Registration ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message:
        status === "approved"
          ? "Congratulations! Your registration has been approved."
          : "Your registration has been rejected.",
      technicianId: technicianId,
      status: status,
      comments: comments,
      isRead: false,
      createdAt: new Date(),
    };

    await db.collection("technician_notifications").add(notificationData);
  } catch (error) {
    console.error("Failed to send status notification:", error);
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
        error: "Email and password are required",
      });
    }

    // Find technician by email
    const technicianQuery = await collection.where("email", "==", email).get();

    if (technicianQuery.empty) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    const technicianDoc = technicianQuery.docs[0];
    const technicianData = technicianDoc.data();

    // Check if technician is approved
    if (technicianData.status !== "approved") {
      return res.status(403).json({
        success: false,
        error:
          "Your account is not yet approved. Please wait for moderator approval.",
        status: technicianData.status,
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      password,
      technicianData.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // Remove sensitive data before sending response
    const { password: _, ...safeUserData } = technicianData;

    res.json({
      success: true,
      message: "Login successful",
      data: {
        id: technicianDoc.id,
        ...safeUserData,
        lastLogin: new Date(),
      },
    });

    // Update last login time
    await collection.doc(technicianDoc.id).update({
      lastLogin: new Date(),
      updatedAt: new Date(),
      isActive: true, // Set active status on login
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: "Login failed. Please try again.",
    });
  }
};

// Test endpoint to verify data structure
const testEndpoint = async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Backend is working correctly",
      supportedFields: [
        "name",
        "email",
        "phone",
        "password",
        "dateOfBirth",
        "gender",
        "nicNumber",
        "serviceCategory",
        "specializations",
        "serviceDescription",
        "address",
        "serviceRadius",
        "bankName",
        "accountNumber",
        "branch",
        "idProofUrl",
        "idProofBackUrl",
        "profilePictureUrl",
        "verificationType",
        "verificationDocuments",
      ],
      verificationDocumentStructure: {
        certificates: [],
        workPhotos: [],
        recommendationLetters: [],
        clientReviews: [],
        applicationType: "verificationType_value",
        applicationReason: "reason_for_newbie_application",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Test endpoint failed",
    });
  }
};

//Get all the booking requests for a technician (schedule and status pending confirmed)
const getBookingsByTechnician = async (req, res) => {
  try {
    const { technicianId } = req.params;
    console.log("Fetching bookings for technician:", technicianId);

    if (!technicianId) {
      return res.status(400).json({
        success: false,
        error: "Technician ID is required",
      });
    }
    const snapshot = await db
      .collection("bookings")
      .where("technicianId", "==", technicianId)
      .orderBy("scheduledDate", "desc")
      .get();
    const bookings = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      bookings.push({
        id: doc.id,
        ...data,
        // Convert Firestore timestamps to ISO strings for frontend
        createdAt: data.createdAt?.toDate()?.toISOString(),
        updatedAt: data.updatedAt?.toDate()?.toISOString(),
        scheduledDate: data.scheduledDate?.toDate()?.toISOString(),
      });
    });

    res.json({
      success: true,
      data: bookings,
      total: bookings.length,
    });
  } catch (err) {
    console.error("Get bookings error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch bookings",
    });
  }
};

// Get all the past requests for a technican (completed rejected and cancelled)
const getPastRequestsByTechnician = async (req, res) => {
  try {
    const { technicianId } = req.params;
    if (!technicianId) {
      return res.status(400).json({
        success: false,
        error: "Technician ID is required",
      });
    }

    // Alternative approach: Use separate queries to avoid composite index
    const statuses = ["completed", "rejected", "cancelled"];
    const allRequests = [];

    // Execute queries for each status separately
    for (const status of statuses) {
      const snapshot = await db
        .collection("bookings")
        .where("technicianId", "==", technicianId)
        .where("status", "==", status)
        .get();

      snapshot.forEach((doc) => {
        const data = doc.data();
        allRequests.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate()?.toISOString(),
          updatedAt: data.updatedAt?.toDate()?.toISOString(),
          scheduledDate: data.scheduledDate?.toDate()?.toISOString(),
        });
      });
    }

    // Sort by scheduledDate in JavaScript
    allRequests.sort((a, b) => {
      const dateA = new Date(a.scheduledDate || a.createdAt);
      const dateB = new Date(b.scheduledDate || b.createdAt);
      return dateB - dateA; // Descending order (newest first)
    });

    res.json({
      success: true,
      data: allRequests,
      total: allRequests.length,
    });
  } catch (err) {
    console.error("Get past requests error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch past requests",
    });
  }
};

// save FCM token for push notifications
const saveFCMToken = async (req, res) => {
  try {
    const { technicianId } = req.body;
    const { fcmToken } = req.body;

    if (!technicianId || !fcmToken) {
      return res.status(400).json({
        success: false,
        error: "technicianId and fcmToken are required",
      });
    }

    const technicianRef = collection.doc(technicianId);
    const doc = await technicianRef.get();
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: "Technician not found",
      });
    }

    await technicianRef.update({
      fcmToken: fcmToken,
      updatedAt: new Date(),
    });

    res.json({
      success: true,
      message: "FCM token saved successfully",
    });
  } catch (error) {
    console.error("Save FCM token error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save FCM token",
    });
  }
};

const sendJobRequestToTechnician = async (req, res) => {
  try {
    const { technicianId, customerName, jobId } = req.body;
    if (!technicianId || !customerName || !jobId) {
      return res.status(400).json({
        success: false,
        error: "technicianId, customerName, and jobId are required",
      });
    }
    // Get technician token from Firestore
    const techDoc = await db.collection("technicians").doc(technicianId).get();

    const token = techDoc.data()?.fcmToken;
    if (!token) {
      console.log("⚠️ No FCM token for technician:", technicianId);
      return res.status(404).json({
        success: false,
        error: "Technician FCM token not found",
      });
    }

    // Create notification message
    const message = {
      token,
      notification: {
        title: "New Job Request",
        body: `${customerName} needs your help!`,
      },
      data: {
        jobId,
        type: "JOB_REQUEST",
      },
    };
    // Send push notification
    const response = await msg.send(message);
    console.log("✅ Notification sent:", response);
    res.json({
      success: true,
      message: "Job request notification sent successfully",
      data: response,
    });
  } catch (error) {
    console.error("❌ Failed to send notification:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send job request notification",
    });
  }
};

const jobAcceptOrReject = async (req, res) => {
  const { jobId, technicianId, response, timestamp } = req.body;

  // Validate request
  if (!jobId || !technicianId || !response) {
    return res.status(400).json({
      success: false,
      message: "jobId, technicianId, and response are required",
    });
  }

  if (!["accepted", "rejected"].includes(response)) {
    return res.status(400).json({
      success: false,
      message: "Response must be either 'accepted' or 'rejected'",
    });
  }

  try {
    const jobRef = db.collection("jobRequests").doc(jobId);

    await db.runTransaction(async (transaction) => {
      const jobDoc = await transaction.get(jobRef);

      if (!jobDoc.exists) {
        throw new Error("Job request not found");
      }

      const jobData = jobDoc.data();
      const technicianResponses = jobData.technicianResponses || {};

      // Save technician response
      technicianResponses[technicianId] = {
        response,
        timestamp: timestamp || new Date().toISOString(),
      };

      // If already confirmed, ignore further acceptances
      if (jobData.status === "confirmed") {
        return;
      }

      const updateData = {
        technicianResponses,
        updatedAt: new Date().toISOString(),
      };

      // If accepted, mark this technician as assigned
      if (response === "accepted") {
        updateData.status = "confirmed";
        updateData.technicianId = technicianId;
      }

      transaction.update(jobRef, updateData);
    });

    console.log(`✅ Technician ${technicianId} ${response} job ${jobId}`);

    return res.status(200).json({
      success: true,
      message: `Technician ${response} job successfully`,
      data: { jobId, technicianId, response },
    });
  } catch (error) {
    console.error("Error updating technician response:", error);
    return res.status(500).json({
      success: false,
      message: "Server error updating technician response",
      error: error.message,
    });
  }
};

// // get the total value of estimated price to get the precentage of 5% of each estimated price for deduct from the technician wallet
// const getTotalWalletDeduction = async (technicianId) => {
//   try {
//     const snapshot = await db.collection('bookings')
//       .where('technicianId', '==', technicianId)
//       .where('paymentDetails.method', '==', 'cash')
//       .where('status', '==', 'completed')
//       .get();
    
//     let totalDeduction = 0;
//     snapshot.forEach(doc => {
//       const data = doc.data();
//       if (data.priceEstimate) {
//         const deduction = data.priceEstimate * 0.05;
//         totalDeduction += deduction;
//       }
//     });
    
//     return totalDeduction;
//   } catch (error) {
//     console.error('Error calculating wallet deduction:', error);
//     throw new Error('Failed to calculate wallet deduction');
//   }
// };

// Deduct commission from technician wallet for cash payments
const deductCommissionFromWallet = async (technicianId, amount, bookingId, description = 'Commission deduction') => {
  try {
    const technicianRef = collection.doc(technicianId);
    const doc = await technicianRef.get();
    
    if (!doc.exists) {
      throw new Error('Technician not found');
    }
    
    const technicianData = doc.data();
    const currentBalance = technicianData.walletBalance || 0;
    const commissionAmount = amount * 0.05; // 5% commission
    const newBalance = currentBalance - commissionAmount;
    
    // Create transaction record
    const transaction = {
      id: `txn_${Date.now()}`,
      type: 'commission_deduction',
      amount: -commissionAmount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      description: description,
      bookingId: bookingId,
      timestamp: new Date(),
      status: 'completed'
    };
    
    // Update wallet balance and add transaction
    await technicianRef.update({
      walletBalance: newBalance,
      walletTransactions: [...(technicianData.walletTransactions || []), transaction],
      updatedAt: new Date()
    });
    
    console.log(`Commission deducted: LKR ${commissionAmount.toFixed(2)} from technician ${technicianId}`);
    return { success: true, newBalance, commissionDeducted: commissionAmount, transaction };
    
  } catch (error) {
    console.error('Error deducting commission:', error);
    throw error;
  }
};

// Add wallet balance (top-up)
const addWalletBalance = async (technicianId, amount, description = 'Wallet top-up') => {
  try {
    const technicianRef = collection.doc(technicianId);
    const doc = await technicianRef.get();
    
    if (!doc.exists) {
      throw new Error('Technician not found');
    }
    
    const technicianData = doc.data();
    const currentBalance = technicianData.walletBalance || 0;
    const newBalance = currentBalance + amount;
    
    // Create transaction record
    const transaction = {
      id: `txn_${Date.now()}`,
      type: 'top_up',
      amount: amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      description: description,
      timestamp: new Date(),
      status: 'completed'
    };
    
    // Update wallet balance and add transaction
    await technicianRef.update({
      walletBalance: newBalance,
      walletTransactions: [...(technicianData.walletTransactions || []), transaction],
      updatedAt: new Date()
    });
    
    console.log(`Wallet topped up: LKR ${amount.toFixed(2)} for technician ${technicianId}`);
    return { success: true, newBalance, amountAdded: amount, transaction };
    
  } catch (error) {
    console.error('Error adding wallet balance:', error);
    throw error;
  }
};

// Get wallet balance and recent transactions
const getWalletInfo = async (req, res) => {
  try {
    const { technicianId } = req.params;
    
    if (!technicianId) {
      return res.status(400).json({
        success: false,
        error: 'Technician ID is required'
      });
    }
    
    const doc = await collection.doc(technicianId).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Technician not found'
      });
    }
    
    const data = doc.data();
    const walletBalance = data.walletBalance || 0;
    const walletThreshold = data.walletThreshold || -5000;
    const transactions = data.walletTransactions || [];
    
    // Sort transactions by timestamp (newest first)
    const sortedTransactions = transactions.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    res.json({
      success: true,
      data: {
        walletBalance,
        walletThreshold,
        transactions: sortedTransactions,
        isWalletCritical: walletBalance <= walletThreshold * 0.8,
        isWalletWarning: walletBalance <= walletThreshold * 0.5 && walletBalance > walletThreshold * 0.8
      }
    });
    
  } catch (error) {
    console.error('Error fetching wallet info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet information'
    });
  }
};

// Top-up wallet endpoint
const topUpWallet = async (req, res) => {
  try {
    const { technicianId } = req.params;
    const { amount, description } = req.body;
    
    if (!technicianId) {
      return res.status(400).json({
        success: false,
        error: 'Technician ID is required'
      });
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      });
    }
    
    const result = await addWalletBalance(
      technicianId, 
      parseFloat(amount), 
      description || 'Wallet top-up'
    );
    
    res.json({
      success: true,
      message: 'Wallet topped up successfully',
      data: result
    });
    
  } catch (error) {
    console.error('Error in wallet top-up:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to top up wallet'
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
  changeTechnicianAvailability,
  testEndpoint,
  getBookingsByTechnician,
  getPastRequestsByTechnician,
  saveFCMToken,
  sendJobRequestToTechnician,
  jobAcceptOrReject,
  // getTotalWalletDeduction,
  deductCommissionFromWallet,
  addWalletBalance,
  getWalletInfo,
  topUpWallet
};
