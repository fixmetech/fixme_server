class ServiceCenter {
  constructor({
    address,
    agreeToFees,
    agreeToTerms,
    businessName,
    businessType,
    city,
    confirmPassword,
    createdAt,
    description,
    email,
    licenseNumber,
    ownerName,
    password,
    phone,
    planDetails = {},
    selectedPlan,
    state,
    yearsInBusiness,
    zipCode,
    // New fields for search functionality
    rating,
    totalServices,
    location,
    workingHours,
    languages,
    specialServices,
    images,
    features
  }) {
    this.address = address;
    this.agreeToFees = agreeToFees;
    this.agreeToTerms = agreeToTerms;
    this.businessName = businessName;
    this.businessType = businessType;
    this.city = city;
    this.confirmPassword = confirmPassword;
    this.createdAt = createdAt;
    this.description = description;
    this.email = email;
    this.licenseNumber = licenseNumber;
    this.ownerName = ownerName;
    this.password = password;
    this.phone = phone;
    
    this.planDetails = planDetails || {
      features: planDetails.features || [],
      id: planDetails.id || '',
      name: planDetails.name || '',
      popular: planDetails.popular || false,
      price: planDetails.price || 0
    };
    this.selectedPlan = selectedPlan;
    this.state = state;
    this.yearsInBusiness = yearsInBusiness;
    this.zipCode = zipCode;
    
    // New fields for search functionality
    this.rating = rating || 4.0 + Math.random() * 1; // Default random rating for demo
    this.totalServices = totalServices || Math.floor(Math.random() * 500) + 100;
    this.location = location || {
      latitude: null,
      longitude: null,
      address: address,
      city: city,
      state: state,
      zipCode: zipCode
    };
    this.workingHours = workingHours || {
      monday: { start: '08:00', end: '18:00', closed: false },
      tuesday: { start: '08:00', end: '18:00', closed: false },
      wednesday: { start: '08:00', end: '18:00', closed: false },
      thursday: { start: '08:00', end: '18:00', closed: false },
      friday: { start: '08:00', end: '18:00', closed: false },
      saturday: { start: '08:00', end: '16:00', closed: false },
      sunday: { start: '09:00', end: '15:00', closed: false }
    };
    this.languages = languages || ['English', 'Sinhala'];
    this.specialServices = specialServices || [];
    this.images = images || [];
    this.features = features || ['Parking Available', 'Air Conditioned', 'Customer Waiting Area'];
    this.isActive = true;
    this.verificationStatus = 'verified';
    this.tags = [businessType, ...(specialServices || [])];
  }
}

module.exports = ServiceCenter;
