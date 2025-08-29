const { db, geoDb } = require("../firebase");
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

const findNearestTechnician = asyncHandler(async (req, res) => {
  const { jobRequest } = req.body;

  // Validate input parameters
  if (!jobRequest) {
    return res.status(400).json({
      error: "Missing required parameters: jobRequest",
    });
  }

  // Validate numeric values
  if (isNaN(jobRequest.customerLocation) || isNaN(jobRequest.serviceCategory) || isNaN(jobRequest.propertyInfo)) {
    return res.status(400).json({
      error: "customerLocation, serviceCategory, and propertyInfo must be valid numbers",
    });
  }

  if (jobRequest.serviceCategory) {
    // Validate serviceCategory
    if (typeof jobRequest.serviceCategory !== "string" || jobRequest.serviceCategory.trim() === "" || !['homes', 'vehicles'].includes(jobRequest.serviceCategory)) {
      return res.status(400).json({
        error: "Invalid serviceCategory",
      });
    }
  }

  res.status(200).json({
    success: true,
    message: `Found nearby technicians`,
  });
});

module.exports = {
  findNearestTechnician,
};
