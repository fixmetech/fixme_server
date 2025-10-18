/**
 * Towing Service Model
 * 
 * This model represents the structure for storing towing service providers
 * in Firestore. Towing services are separate from regular technicians.
 */

const towingServiceSchema = {
  // Basic business information
  businessName: {
    type: String,
    required: true,
    description: 'Name of the towing service business'
  },
  
  description: {
    type: String,
    required: false,
    description: 'Description of the towing service offered'
  },
  
  // Contact information
  phone: {
    type: String,
    required: true,
    description: 'Primary phone number for the towing service'
  },
  
  alternatePhone: {
    type: String,
    required: false,
    description: 'Alternative phone number'
  },
  
  email: {
    type: String,
    required: false,
    description: 'Email address for contact'
  },
  
  // Location information
  address: {
    type: String,
    required: true,
    description: 'Physical address of the towing service'
  },
  
  city: {
    type: String,
    required: true,
    description: 'City where the service is located'
  },
  
  state: {
    type: String,
    required: false,
    description: 'State or province'
  },
  
  postalCode: {
    type: String,
    required: false,
    description: 'Postal or ZIP code'
  },
  
  coordinates: {
    type: Object,
    properties: {
      latitude: Number,
      longitude: Number
    },
    required: false,
    description: 'GPS coordinates for location-based searches'
  },
  
  // Service details
  serviceTypes: {
    type: Array,
    items: String,
    default: ['Emergency Towing', 'Roadside Assistance'],
    description: 'Types of towing services offered'
  },
  
  vehicleTypes: {
    type: Array,
    items: String,
    default: ['Cars', 'Motorcycles', 'Trucks'],
    description: 'Types of vehicles they can tow'
  },
  
  // Operational information
  operatingHours: {
    type: Object,
    properties: {
      monday: { start: String, end: String, is24Hour: Boolean },
      tuesday: { start: String, end: String, is24Hour: Boolean },
      wednesday: { start: String, end: String, is24Hour: Boolean },
      thursday: { start: String, end: String, is24Hour: Boolean },
      friday: { start: String, end: String, is24Hour: Boolean },
      saturday: { start: String, end: String, is24Hour: Boolean },
      sunday: { start: String, end: String, is24Hour: Boolean }
    },
    required: false,
    description: 'Operating hours for each day of the week'
  },
  
  is24HourService: {
    type: Boolean,
    default: false,
    description: 'Whether the service operates 24/7'
  },
  
  // Pricing information
  baseTowingFee: {
    type: Number,
    required: false,
    description: 'Base fee for towing service'
  },
  
  perKmRate: {
    type: Number,
    required: false,
    description: 'Rate per kilometer for towing'
  },
  
  emergencyRate: {
    type: Number,
    required: false,
    description: 'Additional rate for emergency services'
  },
  
  // Service area
  serviceRadius: {
    type: Number,
    default: 50,
    description: 'Service radius in kilometers'
  },
  
  serviceCities: {
    type: Array,
    items: String,
    default: [],
    description: 'List of cities served'
  },
  
  // Rating and reviews
  rating: {
    type: Number,
    default: 4.0,
    min: 0,
    max: 5,
    description: 'Average rating from customers'
  },
  
  reviewCount: {
    type: Number,
    default: 0,
    description: 'Total number of reviews received'
  },
  
  totalTows: {
    type: Number,
    default: 0,
    description: 'Total number of towing jobs completed'
  },
  
  // Status and verification
  isActive: {
    type: Boolean,
    default: true,
    description: 'Whether the service is currently active'
  },
  
  isVerified: {
    type: Boolean,
    default: false,
    description: 'Whether the service has been verified'
  },
  
  licenseNumber: {
    type: String,
    required: false,
    description: 'Business license number'
  },
  
  insuranceDetails: {
    type: Object,
    properties: {
      provider: String,
      policyNumber: String,
      expiryDate: Date
    },
    required: false,
    description: 'Insurance information'
  },
  
  // Media
  profileImage: {
    type: String,
    required: false,
    description: 'URL to profile image'
  },
  
  images: {
    type: Array,
    items: String,
    default: [],
    description: 'Array of image URLs'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    description: 'When the service was registered'
  },
  
  updatedAt: {
    type: Date,
    default: Date.now,
    description: 'When the service was last updated'
  },
  
  // Emergency response
  averageResponseTime: {
    type: Number,
    required: false,
    description: 'Average response time in minutes'
  },
  
  // Equipment
  equipment: {
    type: Array,
    items: String,
    default: [],
    description: 'Available towing equipment (flatbed, wheel lift, etc.)'
  }
};

/**
 * Default service types for towing services
 */
const DEFAULT_SERVICE_TYPES = [
  'Emergency Towing',
  'Roadside Assistance',
  'Vehicle Recovery',
  'Accident Towing',
  'Breakdown Service',
  'Jump Start Service',
  'Tire Change',
  'Fuel Delivery',
  'Lockout Service',
  'Winch Service'
];

/**
 * Default vehicle types
 */
const DEFAULT_VEHICLE_TYPES = [
  'Cars',
  'Motorcycles', 
  'Trucks',
  'SUVs',
  'Vans',
  'Heavy Vehicles'
];

module.exports = {
  towingServiceSchema,
  DEFAULT_SERVICE_TYPES,
  DEFAULT_VEHICLE_TYPES,
  
  // Collection name in Firestore
  COLLECTION_NAME: 'towingServices'
};