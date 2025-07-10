const express = require("express");
const {
  createService,
  getAllServices,
  getServiceById,
  deleteService,
  updateService,
} = require("../controllers/service.controller");
const router = express.Router();

router.post("/", createService);
router.get("/", getAllServices);

router
  .route("/:id")
  .get(getServiceById)
  .put(updateService)
  .delete(deleteService);

module.exports = router;
