class scService {
    constructor({
      serviceName,
      serviceCategory,
      servicecenterid,
      description,
      duration,
      price,
      tags = [],
      image,
      updatedAt
    }) {
      this.serviceName = serviceName;
      this.servicecenterid = servicecenterid;
      this.serviceCategory = serviceCategory;
      this.description = description;
      this.duration = duration;
      this.price = price;
      this.tags = tags; 
      this.image = image; 
      this.updatedAt = updatedAt;
    }
  }
  
  module.exports = scService;
  