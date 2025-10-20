// fixme_server/controllers/job.controller.js
const { db } = require("../firebase");
const Feedback = require("../models/feedback.model");
const JobRequest = require("../models/jobRequest.model");
const {
  findNearbyTechnicians,
} = require("../utils/findNearbyTechnicians.util");
const {
  sendJobRequestToTechnician,
  notifyTechnicianSequentially,
} = require("../utils/technicianNotification");
const geofire = require("geofire-common");
const collection = db.collection("jobRequests");

// Error handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message });
  });
};

/**
 * GET /job-requests/:jobRequestId
 * Returns a normalized job request document.
 */
exports.getJobRequestById = async (req, res) => {
  try {
    const { jobRequestId } = req.params;
    if (!jobRequestId) {
      return res.status(400).json({ error: "Missing jobRequestId" });
    }

    const snap = await db.collection("jobRequests").doc(jobRequestId).get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Job request not found" });
    }

    const d = snap.data() || {};

    const toNumberOrNull = (v) => {
      if (v === undefined || v === null || v === "") return null;
      if (typeof v === "number") return v;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    // Normalize payload (match your schema; keep pin as number)
    const payload = {
      id: snap.id,
      createdAt: d.createdAt || null,
      updatedAt: d.updatedAt || null,
      customerId: d.customerId || null,
      technicianId: d.technicianId || null,
      description: d.description || "",
      pin: typeof d.pin === "number" ? d.pin : Number(d.pin),
      serviceCategory: d.serviceCategory || "",
      status: d.status || "",
      customerLocation: d.customerLocation || null,
      propertyInfo: d.propertyInfo || null,
      estimatedCost: toNumberOrNull(d.estimatedCost),
      estimateStatus: d.estimateStatus || "Pending",
      estimateDescription: d.estimateDescription || "",
      estimateSubmittedAt: d.estimateSubmittedAt || null,
      estimateDecidedAt: d.estimateDecidedAt || null,
    };

    return res.json(payload);
  } catch (err) {
    console.error("getJobRequestById error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.getJobRequestInfoById = async (req, res) => {
  try {
    const { jobRequestId } = req.params;
    if (!jobRequestId) {
      return res.status(400).json({
        success: false,
        error: "Missing jobRequestId",
      });
    }

    const snap = await db.collection("jobRequests").doc(jobRequestId).get();
    if (!snap.exists) {
      return res.status(404).json({
        success: false,
        error: "Job request not found",
      });
    }

    const data = snap.data();
    console.log(data);
    const dataWithId = { ...data, jobId: snap.id };
    result = JobRequest.fromMap(dataWithId);
    // console.log(result);

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("getJobRequestInfoById error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

exports.confirmPin = async (req, res) => {
  try {
    const { jobRequestId } = req.params;
    const { pin } = req.body || {};

    if (!jobRequestId) {
      return res.status(400).json({ error: "Missing jobRequestId" });
    }
    if (pin === undefined || pin === null || String(pin).trim() === "") {
      return res.status(400).json({ error: "Missing pin" });
    }

    // If you have auth middleware:
    // const uid = req.user?.uid; // set in middleware after verifyIdToken
    // Optionally check this uid matches the job's technicianId below

    const ref = db.collection("jobRequests").doc(jobRequestId);
    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Job request not found" });
    }

    const data = snap.data();
    const expectedPin =
      typeof data.pin === "number" ? data.pin : Number(data.pin);
    const givenPin = typeof pin === "number" ? pin : Number(pin);

    if (!Number.isFinite(expectedPin) || !Number.isFinite(givenPin)) {
      return res.status(400).json({ error: "Invalid pin format" });
    }

    // Optional auth enforcement:
    // if (uid && data.technicianId && uid !== data.technicianId) {
    //   return res.status(403).json({ error: 'Not authorized to confirm this job' });
    // }

    if (expectedPin !== givenPin) {
      return res.status(401).json({ error: "Incorrect PIN" });
    }

    // Update job: mark confirmed / set status; keep your schema semantics
    const nowIso = new Date().toISOString();
    const updates = {
      customerConfirmed: true,
      status: "technicianConfirmed", 
      updatedAt: nowIso,
    };

    await ref.update(updates);

    const updated = (await ref.get()).data();

    return res.json({
      message: "PIN confirmed",
      job: {
        id: jobRequestId,
        ...updated,
      },
    });
  } catch (err) {
    console.error("confirmPin error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/jobs/:jobId/estimate
exports.submitEstimate = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { estimatedCost, estimateDescription } = req.body || {};

    if (!jobId) return res.status(400).json({ error: "Missing jobId" });
    if (estimatedCost === undefined || Number(estimatedCost) <= 0) {
      return res.status(400).json({ error: "Invalid estimatedCost" });
    }

    // Optionally enforce auth here using req.user.uid === technicianId
    const ref = db.collection("jobRequests").doc(jobId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Job not found" });

    const nowIso = new Date().toISOString();

    await ref.update({
      estimatedCost: Number(estimatedCost),
      estimateDescription: estimateDescription || "",
      estimateStatus: "Pending", // Pending | Approved | Rejected
      estimateSubmittedAt: nowIso,
      updatedAt: nowIso,
    });

    const updated = (await ref.get()).data();

    return res.json({
      message: "Estimate submitted",
      job: { id: jobId, ...updated },
    });
  } catch (err) {
    console.error("submitEstimate error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/jobs/:jobId/estimate-status
exports.getEstimateStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!jobId) return res.status(400).json({ error: "Missing jobId" });

    const ref = db.collection("jobRequests").doc(jobId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Job not found" });

    const data = snap.data();
    const status = data.estimateStatus || "Pending";

    return res.json({ status, job: { id: jobId, ...data } });
  } catch (err) {
    console.error("getEstimateStatus error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.approveEstimateDecision = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { decision } = req.body || {};
    if (!jobId) return res.status(400).json({ error: "Missing jobId" });
    if (!decision || !["Approved", "Rejected"].includes(decision)) {
      return res
        .status(400)
        .json({ error: "Decision must be Approved or Rejected" });
    }

    // Optionally verify that req.user.uid === customerId here

    const ref = db.collection("jobRequests").doc(jobId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Job not found" });

    const nowIso = new Date().toISOString();
    const updates = {
      estimateStatus: decision,
      estimateDecidedAt: nowIso,
      updatedAt: nowIso,
    };

    // Business rule: when approved, you may also set status
    if (decision === "Approved") {
      updates.status = "EstimateApproved"; // adjust to your flow
    }

    await ref.update(updates);
    const updated = (await ref.get()).data();

    return res.json({
      message: `Estimate ${decision.toLowerCase()}`,
      job: { id: jobId, ...updated },
    });
  } catch (err) {
    console.error("approveEstimateDecision error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/jobs/:jobId/status
exports.getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!jobId) return res.status(400).json({ error: "Missing jobId" });

    const ref = db.collection("jobRequests").doc(jobId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Job not found" });

    const data = snap.data() || {};
    const status = data.status || "";

    return res.json({
      status,
      job: { id: jobId, ...data }, // handy if you want to inspect other fields when debugging
    });
  } catch (err) {
    console.error("getJobStatus error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.finishJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!jobId) return res.status(400).json({ error: "Missing jobId" });

    const ref = db.collection("jobRequests").doc(jobId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Job not found" });

    const nowIso = new Date().toISOString();
    await ref.update({
      status: "TechnicianFinish",
      technicianFinishedAt: nowIso,
      updatedAt: nowIso,
    });

    const updated = (await ref.get()).data();
    return res.json({
      message: "Job marked as finished",
      job: { id: jobId, ...updated },
    });
  } catch (err) {
    console.error("finishJob error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

function generateSixDigit() {
  return Math.floor(100000 + Math.random() * 900000); // 100000..999999
}

// POST /api/jobs/:jobId/finish-pin
// Generates a unique 6-digit pin and saves it as jobRequests/{jobId}.finishPin
// Overwrites existing finishPin if present (per your requirement).
exports.setFinishPin = async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!jobId) return res.status(400).json({ error: "Missing jobId" });

    const ref = db.collection("jobRequests").doc(jobId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Job not found" });

    // Ensure global uniqueness across collection (reasonable attempt with a few tries)
    // If you only need per-job uniqueness, you can skip the uniqueness check loop.
    let finishPin;
    let attempts = 0;
    const MAX_ATTEMPTS = 8;

    do {
      attempts += 1;
      finishPin = generateSixDigit();

      const dup = await db
        .collection("jobRequests")
        .where("finishPin", "==", finishPin)
        .limit(1)
        .get();

      if (dup.empty) break;
    } while (attempts < MAX_ATTEMPTS);

    // Even if uniqueness check failed repeatedly, we still proceed with the last generated PIN.
    // (Collision chances are very small; the loop above is a best-effort.)
    const nowIso = new Date().toISOString();
    await ref.update({
      finishPin,
      finishPinIssuedAt: nowIso,
      updatedAt: nowIso,
    });

    const updated = (await ref.get()).data();

    return res.json({
      message: "Finish PIN generated",
      finishPin,
      job: { id: jobId, ...updated },
    });
  } catch (err) {
    console.error("setFinishPin error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/jobs/:jobId/start-pin
exports.setStartPin = async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!jobId) return res.status(400).json({ error: "Missing jobId" });

    const ref = db.collection("jobRequests").doc(jobId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Job not found" });

    // Try a few times to avoid global collisions (best-effort)
    let pin;
    let attempts = 0;
    const MAX_ATTEMPTS = 8;

    do {
      attempts += 1;
      pin = generateSixDigit();

      const dup = await db
        .collection("jobRequests")
        .where("pin", "==", pin)
        .limit(1)
        .get();

      if (dup.empty) break;
    } while (attempts < MAX_ATTEMPTS);

    const nowIso = new Date().toISOString();
    await ref.update({
      pin,
      pinIssuedAt: nowIso,
      updatedAt: nowIso,
    });

    return res.json({
      message: "Start PIN generated",
      pin,
      job: { id: jobId },
    });
  } catch (err) {
    console.error("setStartPin error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/jobs/:jobId/finish-pin
// Returns { finishPin, job: { ...optional for debugging } }
exports.getFinishPin = async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!jobId) return res.status(400).json({ error: "Missing jobId" });

    const ref = db.collection("jobRequests").doc(jobId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Job not found" });

    const data = snap.data() || {};
    const finishPin =
      typeof data.finishPin === "number"
        ? data.finishPin
        : Number(data.finishPin);

    if (!Number.isFinite(finishPin)) {
      return res.status(404).json({ error: "Finish PIN not set for this job" });
    }

    return res.json({
      finishPin,
      job: { id: jobId }, // keep payload lean
    });
  } catch (err) {
    console.error("getFinishPin error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/jobs/:jobId/verify-finish-pin
// Compares against jobRequests/{jobId}.finishPin and, if correct,
// marks the job completed (status = 'Completed') with timestamps.
exports.verifyFinishPin = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { pin } = req.body || {};

    if (!jobId) return res.status(400).json({ error: "Missing jobId" });
    if (pin === undefined || String(pin).trim() === "")
      return res.status(400).json({ error: "Missing pin" });

    const ref = db.collection("jobRequests").doc(jobId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Job not found" });

    const data = snap.data() || {};
    const expected =
      typeof data.finishPin === "number"
        ? data.finishPin
        : Number(data.finishPin);
    const given = typeof pin === "number" ? pin : Number(pin);

    if (!Number.isFinite(expected)) {
      return res.status(400).json({ error: "Finish PIN not set for this job" });
    }
    if (!Number.isFinite(given)) {
      return res.status(400).json({ error: "Invalid pin format" });
    }
    if (expected !== given) {
      return res.status(401).json({ error: "Incorrect PIN" });
    }

    const nowIso = new Date().toISOString();
    await ref.update({
      status: "completed", // <-- final status (rename if you prefer)
      customerConfirmedAt: nowIso,
      updatedAt: nowIso,
    });

    // Increment technician's totalJobs field by 1
    const jobData = (await ref.get()).data();
    const technicianId = jobData.technicianId;
    if (technicianId) {
      const techRef = db.collection("technicians").doc(technicianId);
      await techRef.update({
        totalJobs: db.FieldValue.increment(1),
        updatedAt: nowIso,
      });
    }

    const updated = (await ref.get()).data();
    return res.json({
      message: "Finish PIN verified. Job completed.",
      job: { id: jobId, ...updated },
    });
  } catch (err) {
    console.error("verifyFinishPin error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/jobs/:jobId/review
// Body: { rating: number(1..5), review: string }
exports.saveReview = async (req, res) => {
  try {
    const { jobId } = req.params;
    let { rating, review } = req.body || {};

    if (!jobId) return res.status(400).json({ error: "Missing jobId" });
    rating = Number(rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "rating must be between 1 and 5" });
    }
    review = typeof review === "string" ? review.trim() : "";
    if (!review) return res.status(400).json({ error: "review is required" });

    const jobRef = db.collection("jobRequests").doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists)
      return res.status(404).json({ error: "Job not found" });

    const job = jobSnap.data();
    const technicianId = job.technicianId || null;
    const customerId = job.customerId || null;

    // 1️⃣ Update jobRequests
    await jobRef.update({
      rating,
      review,
      reviewAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 2️⃣ Create Feedback instance
    const feedback = new Feedback({
      jobId,
      technicianId,
      customerId,
      rating,
      review,
      serviceCategory: job.serviceCategory,
      status: job.status,
    });

    // 3️⃣ Save to technicianFeedback collection
    await db
      .collection("technicianFeedback")
      .doc(jobId)
      .set(feedback.toFirestore(), { merge: true });

    res.json({ message: "Review saved successfully" });
  } catch (err) {
    console.error("saveReview error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getJobActivitiesByCustomerId = asyncHandler(async (req, res) => {
  const { customerId } = req.params;

  if (!customerId) {
    return res.status(400).json({ error: "Missing customerId" });
  }

  //console.log("customerId:", customerId);

  const jobRequestsSnapshot = await db
    .collection("jobRequests")
    .where("customerId", "==", customerId)
    .get();

  // If no jobs found
  if (jobRequestsSnapshot.empty) {
    return res.status(200).json({
      success: true,
      message: `No job activities found for customerId: ${customerId}`,
      data: [],
      count: 0,
    });
  }

  // Use Promise.all to handle async operations properly
  const jobRequests = await Promise.all(
    jobRequestsSnapshot.docs.map(async (doc) => {
      const jobData = doc.data();
      let technicianName = null;
      let technicianPhone = null;

      if (jobData.technicianId) {
        const technicianDoc = await db
          .collection("technicians")
          .doc(jobData.technicianId)
          .get();
        if (technicianDoc.exists) {
          const techData = technicianDoc.data();
          technicianName = techData.name || null;
          technicianPhone = techData.phone || null;
        }
      }

      return {
        jobId: doc.id,
        technicianName,
        technicianPhone,
        ...jobData,
      };
    })
  );

  //console.log("step 03");
  //console.log("jobRequests:", jobRequests);

  res.status(200).json({
    success: true,
    message: `Found ${jobRequests.length} job activities for customerId: ${customerId}`,
    data: jobRequests,
    count: jobRequests.length,
  });
});

exports.findNearestTechnician = asyncHandler(async (req, res) => {
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

  console.log("step02 done");

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
  // const selectedTechnician = filteredTechnicians[0];
  // const technicianId = selectedTechnician.id.trim();

  // await sendJobRequestToTechnician(technicianId, "Customer", jobRequestId);

  // Notify technicians sequentially
  const assignedTechnicianId = await notifyTechnicianSequentially(
    filteredTechnicians,
    jobRequestId
  );

  console.log("step03 done");

  if (!assignedTechnicianId) {
    return res.status(404).json({
      success: false,
      message: "No technician accepted the job request",
      data: { jobId: jobRequestId },
    });
  }

  // Update job request with technician assignment
  const updatedJobData = {
    assignedTechnicianId,
    status: "confirmed",
    updatedAt: new Date().toISOString(),
  };

  await collection.doc(jobRequestId).update(updatedJobData);

  // Get the updated job request
  const updatedJobDoc = await collection.doc(jobRequestId).get();
  const updatedJobRequest = { jobId: jobRequestId, ...updatedJobDoc.data() };

  // Get technician details from users collection (assuming technicians are stored there)
  const technicianDoc = await db
    .collection("technicians")
    .doc(assignedTechnicianId)
    .get();

  if (!technicianDoc.exists) {
    return res.status(404).json({
      success: false,
      error: "Assigned technician not found in database",
    });
  }
  console.log("step04 done");

  return res.status(200).json({
    success: true,
    message: "Job request created and technician assigned successfully",
    data: {
      jobRequest: updatedJobRequest,
      technician: {
        id: technicianDoc.id,
        ...technicianDoc.data(),
      },
    },
  });
});

exports.cancelJobRequest = async (req, res) => {
  const { jobId } = req.params;

  if (!jobId) {
    return res.status(400).json({ error: "Missing jobId parameter" });
  }

  const jobRef = db.collection("jobRequests").doc(jobId);
  const jobSnap = await jobRef.get();

  if (!jobSnap.exists) {
    return res.status(404).json({ error: "Job request not found" });
  }

  // Update the job request status
  await jobRef.update({
    status: "cancelled",
    updatedAt: new Date().toISOString(),
  });

  return res.status(200).json({
    success: true,
    message: "Job request cancelled successfully",
  });
};

exports.updateJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { status } = req.body;
    //console.log("step0");

    if (!jobId) {
      return res.status(400).json({ success: false, error: "Missing jobId" });
    }
    //console.log("step1");

    if (!status) {
      return res
        .status(400)
        .json({ success: false, error: "Missing status" });
    }

    const jobRef = db.collection("jobRequests").doc(jobId);
    const snap = await jobRef.get();
    //console.log("step2");

    if (!snap.exists) {
      return res
        .status(404)
        .json({ success: false, error: "Job request not found" });
    }

    //console.log("step3");

    // Update status
    await jobRef.update({
      status: status,
      updatedAt: new Date().toISOString(),
    });
    //console.log("step4");

    const updatedJob = await jobRef.get();

    return res.json({
      success: true,
      message: `Job status updated to '${status}'`,
      data: updatedJob.data(),
    });
  } catch (err) {
    console.error("Error updating job status:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};
