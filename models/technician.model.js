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
    verificationDocuments
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
    this.role = 'technician';
    this.status = 'pending'; // pending, approved, rejected
    this.registeredAt = new Date();
    this.updatedAt = new Date();
    this.moderatorComments = null;
    this.approvedAt = null;
    this.rejectedAt = null;
    this.rating = 0;
    this.totalJobs = 0;
    this.isActive = false; // Only active after approval
  }
}

module.exports = Technician;
