class JobRequest {
  constructor({
    jobId = null,
    status = "pending",
    customerLocation = null,
    customerId,
    technicianId = null,
    propertyInfo,
    selectedIssues = [],
    description = null,
    serviceCategory = null,
    createdAt = new Date(),
    updatedAt = null,
  }) {
    this.jobId = jobId;
    this.status = status;
    this.customerLocation = customerLocation;
    this.customerId = customerId;
    this.technicianId = technicianId;
    this.propertyInfo = propertyInfo;
    this.selectedIssues = selectedIssues;
    this.description = description;
    this.serviceCategory = serviceCategory;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  // Create JobRequest from Firestore document data
  static fromMap(data) {
    return new JobRequest({
      jobId: data.jobId || null,
      status: data.status || "pending",
      customerLocation: data.customerLocation
        ? {
            latitude: parseFloat(data.customerLocation.latitude) || 0.0,
            longitude: parseFloat(data.customerLocation.longitude) || 0.0,
          }
        : null,
      customerId: data.customerId || "",
      technicianId: data.technicianId || null,
      propertyInfo: data.propertyInfo || {},
      selectedIssues: Array.isArray(data.selectedIssues)
        ? data.selectedIssues
        : [],
      description: data.description || null,
      serviceCategory: data.serviceCategory || null,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : null,
    });
  }

  // Convert JobRequest to plain object for Firestore
  toMap() {
    const createdAt =
      this.createdAt instanceof Date
        ? this.createdAt.toISOString()
        : new Date(this.createdAt).toISOString();

    const updatedAt = this.updatedAt
      ? this.updatedAt instanceof Date
        ? this.updatedAt.toISOString()
        : new Date(this.updatedAt).toISOString()
      : null;
    return {
      jobId: this.jobId,
      status: this.status,
      customerLocation: this.customerLocation
        ? {
            latitude: this.customerLocation.latitude,
            longitude: this.customerLocation.longitude,
          }
        : null,
      customerId: this.customerId,
      technicianId: this.technicianId,
      propertyInfo: this.propertyInfo,
      selectedIssues: this.selectedIssues,
      description: this.description,
      serviceCategory: this.serviceCategory,
      createdAt,
      updatedAt,
    };
  }

  // Validation method
  validate() {
    const errors = [];

    if (!this.customerId || typeof this.customerId !== "string") {
      errors.push("customerId is required and must be a string");
    }

    if (!this.propertyInfo || typeof this.propertyInfo !== "object") {
      errors.push("propertyInfo is required and must be an object");
    }

    if (!Array.isArray(this.selectedIssues)) {
      errors.push("selectedIssues must be an array");
    }

    const validStatuses = [
      "pending",
      "confirmed",
      "in_progress",
      "completed",
      "cancelled",
    ];
    if (!validStatuses.includes(this.status)) {
      errors.push(`status must be one of: ${validStatuses.join(", ")}`);
    }

    if (this.customerLocation) {
      if (
        typeof this.customerLocation.latitude !== "number" ||
        typeof this.customerLocation.longitude !== "number"
      ) {
        errors.push(
          "customerLocation must have valid latitude and longitude numbers"
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

module.exports = JobRequest;
