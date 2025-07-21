class Technician {
  constructor({
    name,
    email,
    phone,
    password, // Will be hashed
    serviceCategory,
    specializations,
    serviceDescription,
    address,
    serviceRadius,
    bankName,
    accountNumber,
    branch,
    idProofUrl,
    certificateUrls,
    profilePictureUrl
  }) {
    this.name = name;
    this.email = email;
    this.phone = phone;
    this.password = password; // Will be hashed before storage
    this.serviceCategory = serviceCategory;
    this.specializations = specializations || [];
    this.serviceDescription = serviceDescription;
    this.address = address;
    this.serviceRadius = serviceRadius || 15;
    this.bankName = bankName;
    this.accountNumber = accountNumber;
    this.branch = branch;
    this.idProofUrl = idProofUrl || null;
    this.certificateUrls = certificateUrls || []; // Array of certificate objects
    this.profilePictureUrl = profilePictureUrl || null;
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
