const { db, geoDb } = require("../firebase");
const JobRequest = require("../models/jobRequest.model");
const {
  findNearbyTechnicians,
} = require("../utils/findNearbyTechnicians.util");
const geofire = require("geofire-common");
const collection = db.collection("jobRequests");

// Error handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message });
  });
};

const findNearestTechnician = asyncHandler(async (req, res) => {
  const jobRequestData = req.body;

  // Validate input parameters
  if (!jobRequestData) {
    return res.status(400).json({
      error: "Missing required parameters: jobRequest",
    });
  }

  // Validate required fields
  if (
    !jobRequestData.customerLocation ||
    !jobRequestData.serviceCategory ||
    !jobRequestData.propertyInfo
  ) {
    return res.status(400).json({
      error: "customerLocation, serviceCategory, and propertyInfo are required",
    });
  }

  // Validate serviceCategory
  if (
    typeof jobRequestData.serviceCategory !== "string" ||
    jobRequestData.serviceCategory.trim() === "" ||
    !["homes", "vehicles"].includes(jobRequestData.serviceCategory)
  ) {
    return res.status(400).json({
      error: "Invalid serviceCategory. Must be 'homes' or 'vehicles'",
    });
  }

  // Validate customerLocation
  if (
    !jobRequestData.customerLocation.latitude ||
    !jobRequestData.customerLocation.longitude
  ) {
    return res.status(400).json({
      error: "customerLocation must have valid latitude and longitude",
    });
  }

  // Create JobRequest instance and validate
  const jobRequest = new JobRequest(jobRequestData);
  const validation = jobRequest.validate();

  if (!validation.isValid) {
    return res.status(400).json({
      error: "Validation failed",
      details: validation.errors,
    });
  }

  // 01 - Save the job request to the database
  const jobRequestRef = await collection.add(jobRequest.toMap());
  const jobRequestId = jobRequestRef.id;

  // Update with the actual jobId
  await collection.doc(jobRequestId).update({ jobId: jobRequestId });

  // 02 - Find nearby technicians
  const nearbyTechnicians = await findNearbyTechnicians(
    jobRequestData.customerLocation.latitude,
    jobRequestData.customerLocation.longitude,
    10000
  );

  // Filter technicians by service category
  const filteredTechnicians = nearbyTechnicians.filter(
    (tech) => tech.serviceCategory === jobRequestData.serviceCategory
  );

  if (filteredTechnicians.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No technicians found in your area for this service category",
      data: {
        jobId: jobRequestId,
        nearbyTechnicians: nearbyTechnicians.length,
        serviceCategory: jobRequestData.serviceCategory,
      },
    });
  }

  // 03 - Assign the nearest technician
  const selectedTechnician = filteredTechnicians[0];
  const technicianId = selectedTechnician.id;

  // Update job request with technician assignment
  const updatedJobData = {
    technicianId,
    status: "confirmed",
    updatedAt: new Date().toISOString(),
  };

  await collection.doc(jobRequestId).update(updatedJobData);

  // Get the updated job request
  const updatedJobDoc = await collection.doc(jobRequestId).get();
  const updatedJobRequest = { jobId: jobRequestId, ...updatedJobDoc.data() };

  // Get technician details from users collection (assuming technicians are stored there)
  const technicianDoc = await db.collection("technicians").doc(technicianId).get();
  
  if (!technicianDoc.exists) {
    return res.status(404).json({
      success: false,
      error: "Assigned technician not found in database",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Job request created and technician assigned successfully",
    data: {
      jobRequest: updatedJobRequest,
      technician: {
        id: technicianDoc.id,
        ...technicianDoc.data(),
      },
      distance: selectedTechnician.distance,
    },
  });
});

module.exports = {
  findNearestTechnician,
};
