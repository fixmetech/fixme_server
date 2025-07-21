class Moderator {
  constructor({
    name,
    email,
    password, // Will be hashed
    phone,
    role = 'moderator',
    permissions = [],
    isActive = true,
    createdBy, // Admin who created this moderator
    assignedTasks = [], // Array of task IDs assigned to this moderator
    settings = {}
  }) {
    this.name = name;
    this.email = email;
    this.password = password; // Will be hashed before storage
    this.phone = phone;
    this.role = role;
    this.permissions = permissions || [
      'view_registrations',
      'review_documents',
      'approve_technicians',
      'reject_technicians',
      'view_complaints',
      'manage_technicians'
    ];
    this.isActive = isActive;
    this.createdBy = createdBy;
    this.assignedTasks = assignedTasks;
    this.settings = {
      autoApprovalEnabled: false,
      requireManualReview: true,
      notificationPreferences: {
        email: true,
        push: true
      },
      ...settings
    };
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.lastLogin = null;
    this.loginCount = 0;
  }
}

module.exports = Moderator;
