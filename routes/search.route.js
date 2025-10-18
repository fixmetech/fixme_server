const express = require('express');
const router = express.Router();
const {
  searchTechnicians,
  searchServiceCenters,
  searchAll,
  searchTowingServices,
  getServiceCategories,
  getFeaturedResults,
  getSearchSuggestions,
  getTechnicianRating,
  getRecentSearches,
  deleteSearchHistory,
  clearSearchHistory,
  getFilterOptions
} = require('../controllers/search.controller');

// Main search routes
router.get('/all', searchAll);  // Unified search across all categories
router.get('/technicians', searchTechnicians);
router.get('/service-centers', searchServiceCenters);
router.get('/towing', searchTowingServices);  // New towing search endpoint

// Category routes
router.get('/categories', getServiceCategories);

// Featured content routes
router.get('/featured', getFeaturedResults);

// Search suggestions
router.get('/suggestions', getSearchSuggestions);

// Filter options for sliders and dropdowns
router.get('/filter-options', getFilterOptions);

// Technician rating
router.get('/technician-rating/:technicianId', getTechnicianRating);

// Search history routes
router.get('/history/:userId', getRecentSearches);  // Get user's recent searches
router.delete('/history/:userId/:searchId', deleteSearchHistory);  // Delete specific search
router.delete('/history/:userId', clearSearchHistory);  // Clear all search history

module.exports = router;