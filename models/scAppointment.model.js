class scAppointment {
    constructor({
      customerName,
      service, // can be service ID or name
      phoneNumber,
      date,
      time,
      duration, // in minutes or format like "1h"
      email,
      status, // e.g., "pending", "confirmed", "completed"
      notes = ''
    }) {
      this.customerName = customerName;
      this.service = service;
      this.phoneNumber = phoneNumber;
      this.date = date;
      this.time = time;
      this.duration = duration;
      this.email = email;
      this.status = status;
      this.notes = notes;
    }
  }
  
  module.exports = scAppointment;
  