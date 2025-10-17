const express = require('express');
const router = express.Router();
const {
  searchTechnicians,
  searchServiceCenters,
  getServiceCategories,
  getFeaturedResults,
  getSearchSuggestions
} = require('../controllers/search.controller');

// Search routes
router.get('/technicians', searchTechnicians);
router.get('/service-centers', searchServiceCenters);

// Category routes
router.get('/categories', getServiceCategories);

// Featured content routes
router.get('/featured', getFeaturedResults);

// Search suggestions
router.get('/suggestions', getSearchSuggestions);

module.exports = router;