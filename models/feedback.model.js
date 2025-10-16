/**
 * Feedback Model
 * Represents a customer's feedback for a completed job.
 */

class Feedback {
  constructor({
    jobId,
    technicianId,
    customerId,
    rating,
    review,
    serviceCategory = null,
    status = null,
  }) {
    this.jobId = jobId;
    this.technicianId = technicianId;
    this.customerId = customerId;
    this.rating = Number(rating) || 0;        // Ensure numeric rating
    this.review = review?.trim() || '';
    this.serviceCategory = serviceCategory;
    this.status = status;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Convert to plain JSON for saving to Firestore
   */
  toFirestore() {
    return {
      jobId: this.jobId,
      technicianId: this.technicianId,
      customerId: this.customerId,
      rating: this.rating,
      review: this.review,
      serviceCategory: this.serviceCategory,
      status: this.status,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}

module.exports = Feedback;
