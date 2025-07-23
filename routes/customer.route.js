const express = require("express");
const {
  getHomes,
  getVehicles,
  getHomeById,
  getVehicleById,
  addNewHome,
  addNewVehicle,
  EditHome,
  EdtitVehicle,
  RemoveProperty,
} = require("../controllers/customer.controller");
const { verifyFirebaseToken } = require("../utils/middleware/auth.middleware");
const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyFirebaseToken);

router.get("/homes", getHomes);
router.get("/vehicles", getVehicles);
router.get("/home/:id", getHomeById);
router.get("/vehicle/:id", getVehicleById);
router.post("/add_new_home", addNewHome);
router.post("/add_new_vehicle", addNewVehicle);
router.put("/edit_home/:id", EditHome);
router.put("/edit_vehicle/:id", EdtitVehicle);
router.delete("/remove_property/:id", RemoveProperty);

module.exports = router;
