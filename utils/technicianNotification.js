const { msg, db } = require("../firebase");

// Track active listeners to clean them up later
const activeListeners = new Map();

/**
 * Send job request notification to technician via FCM
 */
const sendJobRequestToTechnician = async (technicianId, customerName, jobId) => {
  try {
    if (!technicianId || !customerName || !jobId) {
      return {
        success: false,
        error: "technicianId, customerName, and jobId are required",
      };
    }

    const techDoc = await db.collection("technicians").doc(technicianId).get();
    const token = techDoc.data()?.fcmToken;

    if (!token) {
      console.log("⚠️ No FCM token for technician:", technicianId);
      return {
        success: false,
        error: "Technician FCM token not found",
      };
    }

    const message = {
      token,
      notification: {
        title: "New Job Request",
        body: `${customerName} needs your help!`,
      },
      data: {
        jobId,
        type: "JOB_REQUEST",
      },
    };

    const response = await msg.send(message);
    console.log("✅ Notification sent:", response);
    return {
      success: true,
      message: "Job request notification sent successfully",
      data: response,
    };
  } catch (error) {
    console.error("❌ Failed to send notification:", error);
    return {
      success: false,
      error: "Failed to send job request notification",
    };
  }
};

/**
 * Start listening for technician response in Firestore
 */
function onTechnicianResponse(jobRequestId, technicianId, callback) {
  const docRef = db.collection("jobRequests").doc(jobRequestId);

  const unsubscribe = docRef.onSnapshot((doc) => {
    if (!doc.exists) return;

    const data = doc.data();
    const response = data.technicianResponses?.[technicianId]?.response;

    if (response === "accepted" || response === "rejected") {
      callback(response);
      removeListener(jobRequestId, technicianId);
    }
  });

  // Save listener so it can be removed later
  const key = `${jobRequestId}_${technicianId}`;
  activeListeners.set(key, unsubscribe);
}

/**
 * Remove a Firestore listener
 */
function removeListener(jobRequestId, technicianId) {
  const key = `${jobRequestId}_${technicianId}`;
  const unsubscribe = activeListeners.get(key);

  if (unsubscribe) {
    unsubscribe(); // stop the snapshot listener
    activeListeners.delete(key);
    console.log(`🧹 Listener removed for ${key}`);
  }
}

/**
 * Send notification and wait for technician’s response
 */
function sendNotificationAndWaitForResponse(technicianId, jobRequestId) {
  return new Promise((resolve) => {
    sendJobRequestToTechnician(technicianId, "Customer", jobRequestId);

    onTechnicianResponse(jobRequestId, technicianId, (response) => {
      resolve(response === "accepted");
    });

    // Timeout after 30s
    setTimeout(() => {
      console.log(`⌛ Timeout: No response from technician ${technicianId}`);
      removeListener(jobRequestId, technicianId);
      resolve(false);
    }, 30000);
  });
}

/**
 * Notify technicians one by one until one accepts
 */
async function notifyTechnicianSequentially(technicians, jobRequestId) {
  for (const tech of technicians) {
    const technicianId = tech.id.trim();
    console.log(`📨 Sending request to technician ${technicianId}...`);

    const accepted = await sendNotificationAndWaitForResponse(
      technicianId,
      jobRequestId
    );

    if (accepted) {
      console.log(`✅ Technician ${technicianId} accepted the job.`);
      return technicianId;
    } else {
      console.log(`❌ Technician ${technicianId} rejected or timed out.`);
    }
  }

  console.log("⚠️ No technician accepted the job.");
  return null;
}

module.exports = {
  sendJobRequestToTechnician,
  notifyTechnicianSequentially,
  sendNotificationAndWaitForResponse,
};
