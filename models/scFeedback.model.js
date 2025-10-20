class scFeedback {
    constructor({
      serviceid,
      servicecenterid,
      customerid,
      appointmentid,
      requestmessage,
      replymessage,
      rate,
      requestdate,
      updatedAt
    }) {
      this.serviceid = serviceid;
      this.servicecenterid = servicecenterid;
      this.customerid = customerid;
      this.appointmentid = appointmentid;
      this.requestmessage = requestmessage;
      this.replymessage = replymessage;
      this.rate = rate;
      this.requestdate = requestdate;
      this.updatedAt = updatedAt;
    }
  }
  
  module.exports = scFeedback;
  