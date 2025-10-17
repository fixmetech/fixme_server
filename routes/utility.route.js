const express = require("express");
const { verifyFirebaseToken } = require("../utils/middleware/auth.middleware");
const router = express.Router();
const {
  filterNearbyTechnicians,
  updateTechnicianLocation,
} = require("../controllers/utlity.controller");

router.post("/findNearestTechnicians", filterNearbyTechnicians);
router.post("/updateTechnicianLocation/:technicianId", updateTechnicianLocation);

module.exports = router;
