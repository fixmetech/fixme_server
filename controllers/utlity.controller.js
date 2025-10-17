const { db, geoDb } = require("../firebase");
const Service = require("../models/service.model");
const serviceSchema = require("../validators/service.validator");
const collection = db.collection("services");
const {
  findNearbyTechnicians,
} = require("../utils/findNearbyTechnicians.util");
const geofire = require("geofire-common");

// Error handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message });
  });
};

const filterNearbyTechnicians = asyncHandler(async (req, res) => {
  const { lat, lng, radiusInM } = req.body;
  const { serviceCategory } = req.query;

  // Validate input parameters
  if (!lat || !lng || !radiusInM) {
    return res.status(400).json({
      error: "Missing required parameters: lat, lng, radiusInM",
    });
  }

  // Validate numeric values
  if (isNaN(lat) || isNaN(lng) || isNaN(radiusInM)) {
    return res.status(400).json({
      error: "lat, lng, and radiusInM must be valid numbers",
    });
  }

  const technicians = await findNearbyTechnicians(lat, lng, radiusInM);

  if (serviceCategory) {
    // Validate serviceCategory
    if (typeof serviceCategory !== "string" || serviceCategory.trim() === "" || !['homes', 'vehicles'].includes(serviceCategory)) {
      return res.status(400).json({
        error: "Invalid serviceCategory",
      });
    }
    // Filter technicians by service category
    const techniciansByCategory = technicians.filter(
      (tech) => tech.serviceCategory === serviceCategory
    );
    return res.status(200).json({
      success: true,
      message: `Found ${techniciansByCategory.length} nearby technicians for ${serviceCategory}`,
      data: techniciansByCategory,
      count: techniciansByCategory.length,
    });
  }

  res.status(200).json({
    success: true,
    message: `Found ${technicians.length} nearby technicians`,
    data: technicians,
    count: technicians.length,
  });
});

const updateTechnicianLocation = asyncHandler(async (req, res) => {
  const { technicianId } = req.params;
  const { lat, lng, serviceCategory } = req.body;

  // Validate required parameters
  if (!technicianId) {
    return res.status(400).json({
      error: "technicianId query parameter is required",
    });
  }

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({
      error: "lat and lng are required in request body",
    });
  }

  if (serviceCategory === undefined) {
    return res.status(400).json({
      error: "serviceCategory is required in request body",
    });
  }

  // Validate numeric values
  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({
      error: "lat and lng must be valid numbers",
    });
  }

  // Generate geohash from lat/lng using geofire-common
  const hash = geofire.geohashForLocation([lat, lng]);
  const updatedAt = Date.now();

  // Build the data to store
  const locationData = {
    geohash: hash,
    serviceCategory,
    location: { lat, lng },
    updatedAt,
  };

  // Save to RTDB
  await geoDb.ref(`technicians/${technicianId}`).set(locationData);

  res.status(200).json({
    success: true,
    message: "Technician location updated successfully",
    data: {
      technicianId,
      ...locationData,
    },
  });
});

module.exports = {
  filterNearbyTechnicians,
  updateTechnicianLocation,
};
