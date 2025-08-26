const express = require("express");
const { verifyFirebaseToken } = require("../utils/middleware/auth.middleware");
const router = express.Router();
const {
  findNearestTechnician,
} = require("../controllers/job.controller");

router.post("/findNearestTechnician", findNearestTechnician);
//router.put("/cancel/:jobId", cancelJob);

module.exports = router;
