const express = require("express");
const {
  createService,
  getAllServices,
  getServiceById,
  deleteService,
  updateService,
} = require("../controllers/service.controller");
const verifyFirebaseToken = require("../utils/middleware/auth.middleware");
const router = express.Router();

router.post("/",verifyFirebaseToken, createService);
router.get("/", getAllServices);

router
  .route("/:id")
  .get(getServiceById)
  .put(updateService)
  .delete(deleteService);

module.exports = router;
