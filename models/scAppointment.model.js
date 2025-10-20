class scAppointment {
    constructor({
      customerName,
      servicecenterid,
      userid, 
      serviceid,
      phoneNumber,
      serviceName,
      date,
      time,
      duration, 
      email,
      status, 
      notes = ''
    }) {
      this.customerName = customerName;
      this.servicecenterid = servicecenterid;
      this.userid = userid;
      this.serviceid = serviceid;
      this.phoneNumber = phoneNumber;
      this.serviceName = serviceName;
      this.date = date;
      this.time = time;
      this.duration = duration;
      this.email = email;
      this.status = status;
      this.notes = notes;
    }
  }
  
  module.exports = scAppointment;
  