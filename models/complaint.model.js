class Complaint {
  constructor(data) {
    this.id = data.id || null;
    this.customer = {
      name: data.customer?.name || '',
      email: data.customer?.email || '',
      phone: data.customer?.phone || '',
      avatar: data.customer?.avatar || '',
      userId: data.customer?.userId || ''
    };
    this.technician = {
      name: data.technician?.name || '',
      email: data.technician?.email || '',
      phone: data.technician?.phone || '',
      profession: data.technician?.profession || '',
      badge: data.technician?.badge || '',
      rating: data.technician?.rating || 0,
      userId: data.technician?.userId || ''
    };
    this.service = {
      name: data.service?.name || '',
      date: data.service?.date || '',
      time: data.service?.time || '',
      price: data.service?.price || 0,
      serviceId: data.service?.serviceId || ''
    };
    this.complaint = {
      title: data.complaint?.title || '',
      description: data.complaint?.description || '',
      category: data.complaint?.category || '',
      severity: data.complaint?.severity || 'medium',
      submittedAt: data.complaint?.submittedAt || new Date().toISOString(),
      evidence: data.complaint?.evidence || [],
      status: data.complaint?.status || 'pending'
    };
    this.resolution = {
      action: data.resolution?.action || '',
      refundAmount: data.resolution?.refundAmount || 0,
      notes: data.resolution?.notes || '',
      technicianAction: data.resolution?.technicianAction || '',
      resolvedAt: data.resolution?.resolvedAt || null,
      resolvedBy: data.resolution?.resolvedBy || ''
    };
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  // Convert to Firebase-friendly format
  toFirebaseObject() {
    return {
      customer: this.customer,
      technician: this.technician,
      service: this.service,
      complaint: this.complaint,
      resolution: this.resolution,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Create from Firebase snapshot
  static fromFirebaseSnapshot(id, data) {
    return new Complaint({
      id,
      ...data
    });
  }

  // Update timestamp
  touch() {
    this.updatedAt = new Date().toISOString();
  }

  // Update status
  updateStatus(status) {
    this.complaint.status = status;
    this.touch();
  }

  // Set resolution
  setResolution(resolutionData) {
    this.resolution = {
      ...this.resolution,
      ...resolutionData,
      resolvedAt: new Date().toISOString()
    };
    this.complaint.status = 'resolved';
    this.touch();
  }

  // Validate complaint data
  validate() {
    const errors = [];

    if (!this.customer.name) errors.push('Customer name is required');
    if (!this.customer.email) errors.push('Customer email is required');
    if (!this.technician.name) errors.push('Technician name is required');
    if (!this.service.name) errors.push('Service name is required');
    if (!this.complaint.title) errors.push('Complaint title is required');
    if (!this.complaint.description) errors.push('Complaint description is required');
    if (!this.complaint.category) errors.push('Complaint category is required');

    const validCategories = [
      'service_quality',
      'behavior', 
      'billing',
      'timeliness',
      'vehicle_damage',
      'parts_quality',
      'other'
    ];
    if (!validCategories.includes(this.complaint.category)) {
      errors.push('Invalid complaint category');
    }

    const validSeverities = ['low', 'medium', 'high', 'urgent'];
    if (!validSeverities.includes(this.complaint.severity)) {
      errors.push('Invalid severity level');
    }

    const validStatuses = ['pending', 'investigating', 'resolved', 'rejected'];
    if (!validStatuses.includes(this.complaint.status)) {
      errors.push('Invalid complaint status');
    }

    return errors;
  }
}

module.exports = Complaint;
