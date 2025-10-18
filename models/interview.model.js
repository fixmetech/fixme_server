class Interview {
  constructor(data) {
    this.registrationId = data.registrationId;
    this.technicianName = data.technicianName;
    this.technicianEmail = data.technicianEmail;
    this.technicianPhone = data.technicianPhone;
    this.type = data.type; // 'online' or 'physical'
    this.date = data.date; // YYYY-MM-DD format
    this.timeSlot = data.timeSlot; // HH:mm format
    this.duration = data.duration || 30; // Duration in minutes
    this.platform = data.platform || null; // For online interviews: 'zoom', 'teams', 'meet', etc.
    this.meetingLink = data.meetingLink || null; // For online interviews
    this.physicalLocation = data.physicalLocation || null; // For physical interviews
    this.interviewerName = data.interviewerName;
    this.interviewerEmail = data.interviewerEmail;
    this.notes = data.notes || null;
    this.status = data.status || 'scheduled'; // 'scheduled', 'completed', 'cancelled', 'rescheduled'
    this.reminderEnabled = data.reminderEnabled || true;
    this.scheduledAt = data.scheduledAt || new Date();
    this.scheduledBy = data.scheduledBy || null; // Moderator ID who scheduled
    this.completedAt = data.completedAt || null;
    this.cancelledAt = data.cancelledAt || null;
    this.interviewNotes = data.interviewNotes || null; // Notes from the actual interview
    this.interviewOutcome = data.interviewOutcome || null; // 'passed', 'failed', 'pending'
    this.updatedAt = data.updatedAt || new Date();
  }

  // Convert to plain object for storage
  toObject() {
    return {
      registrationId: this.registrationId,
      technicianName: this.technicianName,
      technicianEmail: this.technicianEmail,
      technicianPhone: this.technicianPhone,
      type: this.type,
      date: this.date,
      timeSlot: this.timeSlot,
      duration: this.duration,
      platform: this.platform,
      meetingLink: this.meetingLink,
      physicalLocation: this.physicalLocation,
      interviewerName: this.interviewerName,
      interviewerEmail: this.interviewerEmail,
      notes: this.notes,
      status: this.status,
      reminderEnabled: this.reminderEnabled,
      scheduledAt: this.scheduledAt,
      scheduledBy: this.scheduledBy,
      completedAt: this.completedAt,
      cancelledAt: this.cancelledAt,
      interviewNotes: this.interviewNotes,
      interviewOutcome: this.interviewOutcome,
      updatedAt: this.updatedAt
    };
  }

  // Static method to create from database data
  static fromDatabase(data, id) {
    const interview = new Interview(data);
    interview.id = id;
    return interview;
  }

  // Check if interview is in the future
  isFuture() {
    const interviewDateTime = new Date(`${this.date}T${this.timeSlot}`);
    return interviewDateTime > new Date();
  }

  // Check if interview is completed
  isCompleted() {
    return this.status === 'completed';
  }

  // Check if interview is pending (scheduled but not completed)
  isPending() {
    return this.status === 'scheduled' || this.status === 'rescheduled';
  }

  // Get formatted date and time
  getFormattedDateTime() {
    const dateTime = new Date(`${this.date}T${this.timeSlot}`);
    return dateTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
}

module.exports = Interview;