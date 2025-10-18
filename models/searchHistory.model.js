/**
 * Search History Model
 * 
 * This model represents the structure for storing user search history
 * in Firestore. Search history is stored as a subcollection under each user.
 */

const searchHistorySchema = {
  // Basic search information
  query: {
    type: String,
    required: true,
    description: 'The search query string entered by the user'
  },
  
  category: {
    type: String,
    required: true,
    enum: ['All', 'Technicians', 'Service Centers', 'Towing'],
    description: 'The search category selected by the user'
  },
  
  // Search metadata
  searchedAt: {
    type: Date,
    required: true,
    default: Date.now,
    description: 'Timestamp when the search was performed'
  },
  
  resultCount: {
    type: Number,
    required: false,
    description: 'Number of results returned for this search'
  },
  
  // User information
  userId: {
    type: String,
    required: true,
    description: 'ID of the user who performed the search'
  },
  
  // Additional metadata
  filters: {
    type: Object,
    required: false,
    description: 'Any filters applied during the search'
  },
  
  location: {
    type: Object,
    required: false,
    properties: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    description: 'Location context if location-based search was used'
  }
};

/**
 * Firestore Collection Structure:
 * 
 * users/{userId}/searchHistory/{searchId}
 * 
 * This allows each user to have their own search history
 * with automatic cleanup and privacy isolation.
 */

module.exports = {
  searchHistorySchema,
  
  // Collection path helper
  getCollectionPath: (userId) => `users/${userId}/searchHistory`,
  
  // Maximum number of search history items to keep per user
  MAX_HISTORY_ITEMS: 50,
  
  // Recent searches limit (for UI display)
  RECENT_SEARCHES_LIMIT: 5
};