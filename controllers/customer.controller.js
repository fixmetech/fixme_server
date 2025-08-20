const { db } = require("../firebase");
const collection = db.collection("users");

// Helper function to validate user ID
const validateUserId = (id) => {
  if (!id) {
    throw new Error("User ID is required");
  }
};

// Helper function to check user existence and role
const validateCustomerAccess = async (id) => {
  const doc = await collection.doc(id).get();
  
  if (!doc.exists) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  
  if (doc.data().role !== "user") {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }
  
  return doc;
};

// Error handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message });
  });
};


const getProfile = asyncHandler(async (req, res) => {
  const { customerId } = req.params;

  validateUserId(customerId);
  const doc = await validateCustomerAccess(customerId);

  res.status(200).json({ id: doc.id, ...doc.data() });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const data = req.body;

  validateUserId(customerId);

  if (!data || Object.keys(data).length === 0) {
    return res.status(400).json({ error: "No data provided for update" });
  }

  await validateCustomerAccess(customerId);
  await collection.doc(customerId).update(data);

  res.status(200).json({ message: "Profile updated successfully" });
});

const deleteProfile = asyncHandler(async (req, res) => {
  const { customerId } = req.params;

  validateUserId(customerId);
  await validateCustomerAccess(customerId);
  await collection.doc(customerId).delete();

  res.status(200).json({ message: "Profile deleted successfully" });
});

const getProperties = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const { propertyType } = req.query;
  
  // Validate inputs
  validateUserId(customerId);
  await validateCustomerAccess(customerId);
  
  // Validate propertyType parameter
  const allowedPropertyTypes = ['homes', 'vehicles'];
  if (!propertyType) {
    return res.status(400).json({
      success: false,
      message: 'propertyType query parameter is required',
      allowedTypes: allowedPropertyTypes
    });
  }
  
  if (!allowedPropertyTypes.includes(propertyType)) {
    return res.status(400).json({
      success: false,
      message: `Invalid propertyType. Must be one of: ${allowedPropertyTypes.join(', ')}`,
      allowedTypes: allowedPropertyTypes
    });
  }
  
  try {
    const propertiesSnapshot = await db
      .collection('users')
      .doc(customerId)
      .collection(propertyType)
      .get();
    
    if (propertiesSnapshot.empty) {
      return res.status(200).json({
        success: true,
        message: `No ${propertyType} found for this user`,
        data: [],
        propertyType
      });
    }
    
    const properties = [];
    propertiesSnapshot.forEach(doc => {
      properties.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.status(200).json({
      success: true,
      message: `${propertyType.charAt(0).toUpperCase() + propertyType.slice(1)} retrieved successfully`,
      data: properties,
      count: properties.length,
      propertyType
    });
    
  } catch (error) {
    console.error(`Error fetching ${propertyType}:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to retrieve ${propertyType}`,
      error: error.message,
      propertyType
    });
  }
});

// Alternative version with additional filtering options
const getPropertiesWithFilters = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const { propertyType, ...filters } = req.query;
  
  validateUserId(customerId);
  await validateCustomerAccess(customerId);
  
  const allowedPropertyTypes = ['homes', 'vehicles'];
  if (!propertyType || !allowedPropertyTypes.includes(propertyType)) {
    return res.status(400).json({
      success: false,
      message: `Invalid propertyType. Must be one of: ${allowedPropertyTypes.join(', ')}`,
      allowedTypes: allowedPropertyTypes
    });
  }
  
  try {
    let query = db
      .collection('users')
      .doc(customerId)
      .collection(propertyType);
    
    // Apply filters dynamically based on query parameters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== '') {
        query = query.where(key, '==', value);
      }
    });
    
    const propertiesSnapshot = await query.get();
    
    if (propertiesSnapshot.empty) {
      return res.status(200).json({
        success: true,
        message: `No ${propertyType} found matching the criteria`,
        data: [],
        propertyType,
        appliedFilters: filters
      });
    }
    
    const properties = [];
    propertiesSnapshot.forEach(doc => {
      properties.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.status(200).json({
      success: true,
      message: `${propertyType.charAt(0).toUpperCase() + propertyType.slice(1)} retrieved successfully`,
      data: properties,
      count: properties.length,
      propertyType,
      appliedFilters: filters
    });
    
  } catch (error) {
    console.error(`Error fetching ${propertyType} with filters:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to retrieve ${propertyType}`,
      error: error.message,
      propertyType
    });
  }
});

const AddProperty = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const { propertyType } = req.query;
  const propertyData = req.body;

  validateUserId(customerId);
  await validateCustomerAccess(customerId);

  if (!propertyType || !['homes', 'vehicles'].includes(propertyType)) {
    return res.status(400).json({
      success: false,
      message: "Invalid or missing propertyType query parameter. Must be 'homes' or 'vehicles'."
    });
  }

  if (!propertyData || Object.keys(propertyData).length === 0) {
    return res.status(400).json({ error: "No property data provided" });
  }

  // Remove Id from property data
  delete propertyData.id;

  const propertyRef = collection.doc(customerId).collection(propertyType).doc();
  await propertyRef.set(propertyData);

  res.status(201).json({
    success: true,
    message: `${propertyType.charAt(0).toUpperCase() + propertyType.slice(1)} added successfully`,
    data: { id: propertyRef.id, ...propertyData }
  });
});

const getProperty = asyncHandler(async (req, res) => {
  const { customerId, propertyId } = req.params;
  const { propertyType } = req.query;

  validateUserId(customerId);
  await validateCustomerAccess(customerId);

  if (!propertyType || !['homes', 'vehicles'].includes(propertyType)) {
    return res.status(400).json({
      success: false,
      message: "Invalid or missing propertyType query parameter. Must be 'homes' or 'vehicles'."
    });
  }

  const propertyDoc = await db
    .collection('users')
    .doc(customerId)
    .collection(propertyType)
    .doc(propertyId)
    .get();

  if (!propertyDoc.exists) {
    return res.status(404).json({
      success: false,
      message: `${propertyType.charAt(0).toUpperCase() + propertyType.slice(1)} not found`
    });
  }

  res.status(200).json({
    success: true,
    message: `${propertyType.charAt(0).toUpperCase() + propertyType.slice(1)} retrieved successfully`,
    data: { id: propertyDoc.id, ...propertyDoc.data() }
  });
});

const updateProperty = asyncHandler(async (req, res) => {
  const { customerId, propertyId } = req.params;
  const { propertyType } = req.query;
  const propertyData = req.body;

  validateUserId(customerId);
  await validateCustomerAccess(customerId);

  if (!propertyType || !['homes', 'vehicles'].includes(propertyType)) {
    return res.status(400).json({
      success: false,
      message: "Invalid or missing propertyType query parameter. Must be 'homes' or 'vehicles'."
    });
  }

  if (!propertyData || Object.keys(propertyData).length === 0) {
    return res.status(400).json({ error: "No property data provided for update" });
  }

  const propertyRef = db
    .collection('users')
    .doc(customerId)
    .collection(propertyType)
    .doc(propertyId);

  const doc = await propertyRef.get();
  if (!doc.exists) {
    return res.status(404).json({
      success: false,
      message: `${propertyType.charAt(0).toUpperCase() + propertyType.slice(1)} not found`
    });
  }

  await propertyRef.update(propertyData);

  res.status(200).json({
    success: true,
    message: `${propertyType.charAt(0).toUpperCase() + propertyType.slice(1)} updated successfully`,
    data: { id: doc.id, ...doc.data(), ...propertyData }
  });
});

const deleteProperty = asyncHandler(async (req, res) => {
  const { customerId, propertyId } = req.params;
  const { propertyType } = req.query;

  validateUserId(customerId);
  await validateCustomerAccess(customerId);

  if (!propertyType || !['homes', 'vehicles'].includes(propertyType)) {
    return res.status(400).json({
      success: false,
      message: "Invalid or missing propertyType query parameter. Must be 'homes' or 'vehicles'."
    });
  }

  const propertyRef = db
    .collection('users')
    .doc(customerId)
    .collection(propertyType)
    .doc(propertyId);

  const doc = await propertyRef.get();
  if (!doc.exists) {
    return res.status(404).json({
      success: false,
      message: `${propertyType.charAt(0).toUpperCase() + propertyType.slice(1)} not found`
    });
  }

  await propertyRef.delete();

  res.status(200).json({
    success: true,
    message: `${propertyType.charAt(0).toUpperCase() + propertyType.slice(1)} deleted successfully`
  });
});

module.exports = {
  getProfile,
  updateProfile,
  deleteProfile,
  getProperties,
  getPropertiesWithFilters,
  AddProperty,
  getProperty,
  updateProperty,
  deleteProperty
};
