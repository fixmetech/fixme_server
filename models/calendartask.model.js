class calendartasks {
    constructor({
      serviceName,
      customerName,
      date,
      time,
      duration, // same format as appointment
      status // e.g., "not started", "in progress", "done"
    }) {
      this.serviceName = serviceName;
      this.customerName = customerName;
      this.date = date;
      this.time = time;
      this.duration = duration;
      this.status = status;
    }
  }
  
  module.exports = calendartasks;
  