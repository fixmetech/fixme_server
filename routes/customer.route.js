const express = require("express");
const { verifyFirebaseToken } = require("../utils/middleware/auth.middleware");
const router = express.Router();
const {
  getProfile,
  getBaseInfo,
  updateProfile,
  deleteProfile,
  getProperties,
  getProperty,
  updateProperty,
  deleteProperty,
  AddProperty,
  getPropertiesWithFilters,
} = require("../controllers/customer.controller");

router
  .route("/profile/:customerId")
  .get(getProfile)
  .put(updateProfile)
  .delete(deleteProfile); 

router.get("/base-info/:customerId", getBaseInfo);

router
  .route("/profile/:customerId/property/:propertyId")
  .get(getProperty)
  .put(updateProperty)
  .delete(deleteProperty);

router.post("/profile/:customerId/property", AddProperty);

router.get("/profile/:customerId/properties", getProperties);
router.get("/profile/:customerId/properties/filters", getPropertiesWithFilters);


module.exports = router;
