class scService {
    constructor({
      name,
      category,
      description,
      price,
      tags = [],
      image
    }) {
      this.name = name;
      this.category = category;
      this.description = description;
      this.price = price;
      this.tags = tags; // Array of strings
      this.image = image; // URL or file name
    }
  }
  
  module.exports = scService;
  