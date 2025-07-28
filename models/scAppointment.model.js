class scAppointment {
    constructor({
      customerName,
      servicecenterid, 
      phoneNumber,
      date,
      time,
      duration, 
      email,
      status, 
      notes = ''
    }) {
      this.customerName = customerName;
      this.servicecenterid = servicecenterid;
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
  