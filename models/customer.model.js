class Home {
  constructor(name, address, propertyType, area, customerId) {
    this.name = name;
    this.address = address;
    this.propertyType = propertyType; // apartment, house, villa, etc.
    this.area = area; // in square feet
    this.customerId = customerId;
    this.type = 'home';
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}

class Vehicle {
  constructor(make, model, year, licensePlate, vehicleType, fuelType, customerId) {
    this.make = make;
    this.model = model;
    this.year = year;
    this.licensePlate = licensePlate;
    this.vehicleType = vehicleType; // car, motorcycle, truck, etc.
    this.fuelType = fuelType; // petrol, diesel, electric, etc.
    this.customerId = customerId;
    this.type = 'vehicle';
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}

class Customer {
  constructor(name, email, phone) {
    this.name = name;
    this.email = email;
    this.phone = phone;
    this.homes = [];
    this.vehicles = [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}

module.exports = { Home, Vehicle, Customer };
