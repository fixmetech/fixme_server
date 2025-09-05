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
    zipCode
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
  }
}

module.exports = ServiceCenter;
