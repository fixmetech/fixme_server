class Technician {
  constructor({
    name,
    email,
    phone,
    password, // Will be hashed
    dateOfBirth,
    gender,
    nicNumber,
    serviceCategory,
    specializations,
    serviceDescription,
    address,
    serviceRadius,
    bankName,
    accountNumber,
    branch,
    idProofUrl,
    idProofBackUrl,
    profilePictureUrl,
    verificationType,
    verificationDocuments,
    // New fields for search functionality
    visitingFee,
    languages,
    location,
    availability,
    workingHours
  }) {
    this.name = name;
    this.email = email;
    this.phone = phone;
    this.password = password; // Will be hashed before storage
    this.dateOfBirth = dateOfBirth || null;
    this.gender = gender || null;
    this.nicNumber = nicNumber || null;
    this.serviceCategory = serviceCategory;
    this.specializations = specializations || [];
    this.serviceDescription = serviceDescription;
    this.address = address;
    this.serviceRadius = serviceRadius || 15;
    this.bankName = bankName;
    this.accountNumber = accountNumber;
    this.branch = branch;
    this.idProofUrl = idProofUrl || null;
    this.idProofBackUrl = idProofBackUrl || null;
    this.profilePictureUrl = profilePictureUrl || null;
    this.verificationType = verificationType || null; // Certificate, Experience, Newbie
    this.verificationDocuments = verificationDocuments || {
      certificates: [],
      workPhotos: [],
      recommendationLetters: [],
      clientReviews: [],
      applicationType: verificationType || null,
      applicationReason: null
    };
    
    // New fields for search functionality
    this.visitingFee = visitingFee || Math.floor(Math.random() * 1000) + 300; // Default random fee for demo
    this.languages = languages || ['English']; // Languages spoken
    this.location = location || {
      latitude: null,
      longitude: null,
      address: address,
      city: null,
      state: null
    };
    this.availability = availability || {
      isAvailable: true,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      busyUntil: null
    };
    this.workingHours = workingHours || {
      start: '08:00',
      end: '18:00',
      timezone: 'Asia/Colombo'
    };
    
    this.role = 'technician';
    this.status = 'pending'; // pending, approved, rejected
    this.registeredAt = new Date();
    this.updatedAt = new Date();
    this.moderatorComments = null;
    this.approvedAt = null;
    this.rejectedAt = null;
    this.rating = 0;
    this.totalJobs = 0;
    this.completedJobs = 0;
    this.isActive = false; // Only active after approval
    
    // Additional fields for enhanced search
    this.reviews = [];
    this.averageResponseTime = 30; // minutes
    this.tags = specializations || []; // Searchable tags
    this.experienceYears = 0;
    this.certifications = [];
  }
}

module.exports = Technician;
