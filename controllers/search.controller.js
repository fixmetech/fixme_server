const { db } = require('../firebase');
const admin = require('firebase-admin');
const { getCollectionPath, MAX_HISTORY_ITEMS, RECENT_SEARCHES_LIMIT } = require('../models/searchHistory.model');
const { COLLECTION_NAME: TOWING_COLLECTION } = require('../models/towingService.model');

// Collections
const techniciansCollection = db.collection('technicians');
const serviceCentersCollection = db.collection('serviceCenters');
const servicesCollection = db.collection('services');
const towingServicesCollection = db.collection(TOWING_COLLECTION);

// Search technicians with filters
const searchTechnicians = async (req, res) => {
  try {
    const {
      query,
      category,
      filters = {},
      location,
      page = 1,
      limit = 10,
      sort = 'rating'
    } = req.query;

    // Get all approved and active technicians
    const technicianQuery = techniciansCollection
      .where('status', '==', 'approved')
      .where('isActive', '==', true);

    const snapshot = await technicianQuery.get();
    let technicians = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filter by service category if provided (using specializations mapping)
    if (category && category !== '') {
      technicians = technicians.filter(technician => {
        const specializations = technician.specializations || [];
        return specializations.some(spec => {
          const specLower = spec.toLowerCase();
          const categoryLower = category.toLowerCase();
          
          // Map category to related specializations
          switch (categoryLower) {
            case 'towing':
              return specLower.includes('towing') || specLower.includes('tow');
            case 'electricians':
              return specLower.includes('electrical') || specLower.includes('electric') || specLower.includes('wiring') || specLower.includes('battery');
            case 'plumbers':
              return specLower.includes('plumb') || specLower.includes('pipe') || specLower.includes('water');
            case 'gardening':
              return specLower.includes('garden') || specLower.includes('landscape') || specLower.includes('lawn');
            case 'repair':
              return specLower.includes('repair') || specLower.includes('fix') || specLower.includes('maintenance') || specLower.includes('painting') || specLower.includes('oil') || specLower.includes('service');
            default:
              return specLower.includes(categoryLower);
          }
        });
      });
    }

    // Apply text search if query provided
    if (query && query.trim() !== '') {
      const queryLower = query.toLowerCase();
      technicians = technicians.filter(technician => {
        const name = (technician.name || '').toLowerCase();
        const description = (technician.serviceDescription || '').toLowerCase();
        const specializations = (technician.specializations || []).join(' ').toLowerCase();
        
        return name.includes(queryLower) || 
               description.includes(queryLower) || 
               specializations.includes(queryLower);
      });
    }

    // Apply additional filters
    technicians = applyFilters(technicians, filters);
    
    // Apply sorting
    technicians = applySorting(technicians, sort);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedResults = technicians.slice(startIndex, startIndex + parseInt(limit));

    res.json({
      success: true,
      data: paginatedResults,
      total: technicians.length,
      page: parseInt(page),
      totalPages: Math.ceil(technicians.length / limit),
      filters: generateFilterSummary(technicians)
    });

  } catch (error) {
    console.error('Search technicians error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search technicians'
    });
  }
};

// Search service centers with filters
const searchServiceCenters = async (req, res) => {
  try {
    const {
      query,
      category,
      filters = {},
      location,
      page = 1,
      limit = 10,
      sort = 'rating'
    } = req.query;

    let serviceCenterQuery = serviceCentersCollection;
    
    // Get all service centers first
    const snapshot = await serviceCenterQuery.get();
    let serviceCenters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filter by category if provided (search in availableServices array)
    if (category && category !== '') {
      const categoryMapping = getServiceCenterCategoryMapping(category);
      if (categoryMapping.length > 0) {
        serviceCenters = serviceCenters.filter(center => {
          const availableServices = center.availableServices || [];
          return categoryMapping.some(mappedService =>
            availableServices.some(service => 
              service.toLowerCase().includes(mappedService.toLowerCase()) ||
              mappedService.toLowerCase().includes(service.toLowerCase())
            )
          );
        });
      }
    }

    // Apply text search if query provided
    if (query && query.trim() !== '') {
      const queryLower = query.toLowerCase();
      serviceCenters = serviceCenters.filter(center => {
        const businessName = (center.businessName || '').toLowerCase();
        const description = (center.description || '').toLowerCase();
        const businessType = (center.businessType || '').toLowerCase();
        
        return businessName.includes(queryLower) || 
               description.includes(queryLower) || 
               businessType.includes(queryLower);
      });
    }

    // Apply filters
    serviceCenters = applyServiceCenterFilters(serviceCenters, filters);
    
    // Apply sorting
    serviceCenters = applyServiceCenterSorting(serviceCenters, sort);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedResults = serviceCenters.slice(startIndex, startIndex + parseInt(limit));

    res.json({
      success: true,
      data: paginatedResults,
      total: serviceCenters.length,
      page: parseInt(page),
      totalPages: Math.ceil(serviceCenters.length / limit),
      filters: generateServiceCenterFilterSummary(serviceCenters)
    });

  } catch (error) {
    console.error('Search service centers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search service centers'
    });
  }
};

// Get service categories for filter dropdown
const getServiceCategories = async (req, res) => {
  try {
    const { type = 'technician' } = req.query;

    if (type === 'technician') {
      // Define the standard service categories
      const standardCategories = [
        'Service', // Special category for service centers
        'Towing',
        'Electricians',
        'Plumbers',
        'Gardening',
        'Repair'
      ];

      const snapshot = await techniciansCollection
        .where('status', '==', 'approved')
        .where('isActive', '==', true)
        .get();

      const categoriesWithCounts = await Promise.all(
        standardCategories.map(async (category) => {
          let count = 0;
          
          if (category === 'Service') {
            // Special handling for service category - this will navigate to service centers
            count = 0; // We don't count technicians for this
          } else {
            // Count technicians whose specializations match the category
            snapshot.docs.forEach(doc => {
              const specializations = doc.data().specializations || [];
              const hasMatchingSpecialization = specializations.some(spec => {
                const specLower = spec.toLowerCase();
                const categoryLower = category.toLowerCase();
                
                // Map category to related specializations
                switch (categoryLower) {
                  case 'towing':
                    return specLower.includes('towing') || specLower.includes('tow');
                  case 'electricians':
                    return specLower.includes('electrical') || specLower.includes('electric') || specLower.includes('wiring') || specLower.includes('battery');
                  case 'plumbers':
                    return specLower.includes('plumb') || specLower.includes('pipe') || specLower.includes('water');
                  case 'gardening':
                    return specLower.includes('garden') || specLower.includes('landscape') || specLower.includes('lawn');
                  case 'repair':
                    return specLower.includes('repair') || specLower.includes('fix') || specLower.includes('maintenance') || specLower.includes('painting') || specLower.includes('oil') || specLower.includes('service');
                  default:
                    return specLower.includes(categoryLower);
                }
              });
              
              if (hasMatchingSpecialization) {
                count++;
              }
            });
          }
          
          return {
            name: category,
            count: count,
            image: getCategoryImage(category)
          };
        })
      );

      res.json({
        success: true,
        data: categoriesWithCounts.sort((a, b) => {
          // Always put 'Service' first, then sort by count
          if (a.name === 'Service') return -1;
          if (b.name === 'Service') return 1;
          return b.count - a.count;
        })
      });
    } else {
      // Service center categories
      const snapshot = await serviceCentersCollection.get();
      const categories = new Set();
      
      snapshot.docs.forEach(doc => {
        const businessType = doc.data().businessType;
        if (businessType) {
          categories.add(businessType);
        }
      });

      const categoriesWithCounts = await Promise.all(
        Array.from(categories).map(async (category) => {
          const categorySnapshot = await serviceCentersCollection
            .where('businessType', '==', category)
            .get();
          
          return {
            name: category,
            count: categorySnapshot.size,
            image: getServiceCenterCategoryImage(category)
          };
        })
      );

      res.json({
        success: true,
        data: categoriesWithCounts.sort((a, b) => b.count - a.count)
      });
    }

  } catch (error) {
    console.error('Get service categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service categories'
    });
  }
};

// Get featured technicians/services
const getFeaturedResults = async (req, res) => {
  try {
    const { type = 'technician', section = 'featured' } = req.query;

    if (type === 'technician') {
      let query = techniciansCollection
        .where('status', '==', 'approved')
        .where('isActive', '==', true);

      switch (section) {
        case 'featured':
          query = query.where('rating', '>=', 4.5).orderBy('rating', 'desc').limit(10);
          break;
        case 'top':
          query = query.where('totalJobs', '>=', 50).orderBy('totalJobs', 'desc').limit(10);
          break;
        case 'nearby':
          // For nearby, we'd need location-based filtering
          query = query.orderBy('rating', 'desc').limit(10);
          break;
        case 'offers':
          // For offers, we'd filter by technicians with special offers
          query = query.orderBy('rating', 'desc').limit(10);
          break;
        default:
          query = query.orderBy('rating', 'desc').limit(10);
      }

      const snapshot = await query.get();
      const results = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          serviceCategory: data.serviceCategory,
          rating: data.rating || 0, // Use actual rating or 0 if not set
          totalJobs: data.totalJobs || 0, // Use actual job count or 0
          visitingFee: data.visitingFee || 0, // Use actual fee or 0
          profilePictureUrl: data.profilePictureUrl,
          specializations: data.specializations || [],
          isAvailable: data.isActive,
          distance: data.distance || 0, // Use actual distance or 0
          responseTime: data.responseTime || 0, // Use actual response time or 0
          languages: data.languages || ['English'],
          hasOffer: section === 'offers'
        };
      });

      res.json({
        success: true,
        section: section,
        data: results
      });
    } else {
      // Service centers
      const snapshot = await serviceCentersCollection
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

      const results = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          businessName: data.businessName,
          businessType: data.businessType,
          rating: data.rating || 0, // Use actual rating or 0
          address: data.address,
          city: data.city,
          phone: data.phone,
          description: data.description,
          distance: data.distance || 0, // Use actual distance or 0
          hasOffer: section === 'offers'
        };
      });

      res.json({
        success: true,
        section: section,
        data: results
      });
    }

  } catch (error) {
    console.error('Get featured results error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch featured results'
    });
  }
};

// Get search suggestions
const getSearchSuggestions = async (req, res) => {
  try {
    const { query, type = 'technician' } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const queryLower = query.toLowerCase();
    const suggestions = new Set();

    if (type === 'technician') {
      // Get suggestions from service categories and specializations
      const snapshot = await techniciansCollection
        .where('status', '==', 'approved')
        .where('isActive', '==', true)
        .get();

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Add service category if it matches
        if (data.serviceCategory && data.serviceCategory.toLowerCase().includes(queryLower)) {
          suggestions.add(data.serviceCategory);
        }
        
        // Add specializations that match
        if (data.specializations) {
          data.specializations.forEach(spec => {
            if (spec.toLowerCase().includes(queryLower)) {
              suggestions.add(spec);
            }
          });
        }
      });
    } else {
      // Service center suggestions
      const snapshot = await serviceCentersCollection.get();

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        if (data.businessType && data.businessType.toLowerCase().includes(queryLower)) {
          suggestions.add(data.businessType);
        }
        
        if (data.businessName && data.businessName.toLowerCase().includes(queryLower)) {
          suggestions.add(data.businessName);
        }
      });
    }

    res.json({
      success: true,
      data: Array.from(suggestions).slice(0, 10)
    });

  } catch (error) {
    console.error('Get search suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch search suggestions'
    });
  }
};

// Helper functions for filtering and sorting
const applyFilters = (technicians, filters) => {
  let filtered = [...technicians];

  // Price range filter
  if (filters.priceRange) {
    const maxPrice = parseInt(filters.priceRange.replace(/\D/g, '')) || 1000;
    filtered = filtered.filter(tech => {
      const visitingFee = tech.visitingFee || 0; // Use actual fee or 0
      return visitingFee <= maxPrice;
    });
  }

  // Rating filter
  if (filters.rating) {
    const minRating = parseFloat(filters.rating.replace(/\D/g, '')) / 10 || 4.5;
    filtered = filtered.filter(tech => {
      const rating = tech.rating || 0; // Use actual rating or 0
      return rating >= minRating;
    });
  }

  // Distance filter
  if (filters.distance) {
    const maxDistance = parseInt(filters.distance.replace(/\D/g, '')) || 10;
    filtered = filtered.filter(tech => {
      const distance = tech.distance || 0; // Use actual distance or 0
      return distance <= maxDistance;
    });
  }

  // Language filter
  if (filters.language) {
    filtered = filtered.filter(tech => {
      const languages = tech.languages || ['English'];
      return languages.includes(filters.language);
    });
  }

  // Visiting fee range filter
  if (filters.visitingFee) {
    const feeRange = filters.visitingFee;
    filtered = filtered.filter(tech => {
      const visitingFee = tech.visitingFee || 0; // Use actual fee or 0
      
      if (feeRange.includes('Under Rs.59')) {
        return visitingFee < 59;
      } else if (feeRange.includes('Rs.59 - Rs.79')) {
        return visitingFee >= 59 && visitingFee <= 79;
      } else if (feeRange.includes('Rs.79 - Rs.99')) {
        return visitingFee >= 79 && visitingFee <= 99;
      } else if (feeRange.includes('Rs.99+')) {
        return visitingFee >= 99;
      }
      return true;
    });
  }

  // Highly rated filter
  if (filters.highlyRated === 'true') {
    filtered = filtered.filter(tech => {
      const rating = tech.rating || 0; // Use actual rating or 0
      return rating >= 4.5;
    });
  }

  return filtered;
};

const applySorting = (technicians, sort) => {
  switch (sort) {
    case 'rating':
      return technicians.sort((a, b) => {
        const ratingA = a.rating || 0; // Use actual rating or 0
        const ratingB = b.rating || 0; // Use actual rating or 0
        return ratingB - ratingA;
      });
    case 'price':
      return technicians.sort((a, b) => {
        const priceA = a.visitingFee || 0; // Use actual fee or 0
        const priceB = b.visitingFee || 0; // Use actual fee or 0
        return priceA - priceB;
      });
    case 'distance':
      return technicians.sort((a, b) => {
        const distanceA = Math.floor(Math.random() * 20) + 5;
        const distanceB = Math.floor(Math.random() * 20) + 5;
        return distanceA - distanceB;
      });
    case 'recent':
      return technicians.sort((a, b) => {
        // Sort by createdAt date if available, otherwise by ID (newer entries have newer IDs)
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        // Fallback: use document ID for ordering (Firestore IDs are time-based)
        return b.id.localeCompare(a.id);
      });
    default:
      return technicians.sort((a, b) => {
        const ratingA = a.rating || 4.0 + Math.random() * 1;
        const ratingB = b.rating || 4.0 + Math.random() * 1;
        return ratingB - ratingA;
      });
  }
};

const applyServiceCenterFilters = (serviceCenters, filters) => {
  // Similar filtering logic for service centers
  return serviceCenters;
};

const applyServiceCenterSorting = (serviceCenters, sort) => {
  // Similar sorting logic for service centers
  return serviceCenters;
};

const generateFilterSummary = (technicians) => {
  const categories = new Set();
  const languages = new Set();
  let avgRating = 0;
  let priceRange = { min: Infinity, max: 0 };

  technicians.forEach(tech => {
    if (tech.serviceCategory) categories.add(tech.serviceCategory);
    
    const techLanguages = tech.languages || ['English'];
    techLanguages.forEach(lang => languages.add(lang));
    
    const rating = tech.rating || 4.0 + Math.random() * 1;
    avgRating += rating;
    
    const price = tech.visitingFee || Math.floor(Math.random() * 1000) + 300;
    priceRange.min = Math.min(priceRange.min, price);
    priceRange.max = Math.max(priceRange.max, price);
  });

  avgRating = technicians.length ? avgRating / technicians.length : 0;

  return {
    categories: Array.from(categories),
    languages: Array.from(languages),
    avgRating: avgRating.toFixed(1),
    priceRange: {
      min: priceRange.min === Infinity ? 0 : priceRange.min,
      max: priceRange.max
    }
  };
};

const generateServiceCenterFilterSummary = (serviceCenters) => {
  // Similar summary generation for service centers
  return {};
};

// Helper functions for category images (these would normally be stored in database)
const getCategoryImage = (category) => {
  const categoryImages = {
    'Plumbers': 'assets/images/plumbing.png',
    'Plumbing': 'assets/images/plumbing.png',
    'Electricians': 'assets/images/electrician.png',
    'Electrical': 'assets/images/electrician.png',
    'Towing': 'assets/images/towing1.png',
    'Tow Service': 'assets/images/towing1.png',
    'Gardening': 'assets/images/gardening.png',
    'Garden': 'assets/images/gardening.png',
    'Landscaping': 'assets/images/gardening.png',
    'Repair': 'assets/images/plumbing.png',
    'Repairs': 'assets/images/plumbing.png',
    'Service': 'assets/images/service_center.png',
    'Maintenance': 'assets/images/service_center.png',
    'Installation': 'assets/images/service_center.png',
    'HVAC': 'assets/images/electrician.png',
    'Air Conditioning': 'assets/images/electrician.png',
    'Painting': 'assets/images/service_center.png',
    'Cleaning': 'assets/images/service_center.png',
    'Handyman': 'assets/images/plumbing.png',
    'Carpentry': 'assets/images/plumbing.png',
    'Roofing': 'assets/images/service_center.png',
    'Flooring': 'assets/images/service_center.png'
  };
  
  // Try exact match first
  if (categoryImages[category]) {
    return categoryImages[category];
  }
  
  // Try case-insensitive match
  const lowerCategory = category.toLowerCase();
  for (const [key, value] of Object.entries(categoryImages)) {
    if (key.toLowerCase() === lowerCategory) {
      return value;
    }
  }
  
  // Default fallback
  return 'assets/images/service_center.png';
};

const getServiceCenterCategoryImage = (category) => {
  const categoryImages = {
    'Car Wash': 'assets/images/service_center/car_wash.png',
    'Car Repair': 'assets/images/service_center/service.png',
    'Electronics': 'assets/images/service_center/electronics.png',
    'Pest Control': 'assets/images/service_center/pest.png',
    'AC Service': 'assets/images/service_center/ac.png',
    'Phone Repair': 'assets/images/service_center/phone.png',
    'Appliances': 'assets/images/service_center/appliances.png',
    'Computers': 'assets/images/service_center/computers.png'
  };
  return categoryImages[category] || 'assets/images/service_center/service.png';
};

// Maps frontend service category names to backend availableServices values
const getServiceCenterCategoryMapping = (category) => {
  const categoryMappings = {
    'Car Wash': ['car wash', 'vehicle wash', 'auto wash'],
    'Car Repair': ['car repair', 'auto repair', 'vehicle repair', 'automotive'],
    'Electronics': ['electronics', 'electronics repair', 'electronic'],
    'Pest Control': ['pest control', 'pest', 'extermination'],
    'AC Service': ['ac service', 'air conditioning', 'hvac', 'cooling'],
    'Phone Repair': ['phone repair', 'mobile repair', 'smartphone repair', 'cell phone'],
    'Appliances': ['appliances', 'appliance repair', 'home appliances'],
    'Computers': ['computers', 'computer repair', 'pc repair', 'laptop repair']
  };
  
  return categoryMappings[category] || [category.toLowerCase()];
};

// Unified search across all categories
const searchAll = async (req, res) => {
  try {
    const {
      query,
      filters = {},
      location,
      page = 1,
      limit = 10,
      sort = 'rating',
      userId
    } = req.query;

    // Allow empty query for browsing mode - return all results
    const isEmptyQuery = !query || query.trim() === '';
    
    // Save search to history if userId is provided and query is not empty
    if (userId && !isEmptyQuery) {
      await saveSearchHistory(userId, query, 'All');
    }

    const queryLower = isEmptyQuery ? '' : query.toLowerCase();
    let allResults = [];

    // Search Technicians
    try {
      const techSnapshot = await techniciansCollection
        .where('status', '==', 'approved')
        .where('isActive', '==', true)
        .get();

      const technicians = techSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(tech => {
          const name = (tech.name || '').toLowerCase();
          const description = (tech.serviceDescription || '').toLowerCase();
          const specializations = (tech.specializations || []).join(' ').toLowerCase();
          
          return name.includes(queryLower) || 
                 description.includes(queryLower) || 
                 specializations.includes(queryLower);
        })
        .map(tech => ({
          ...tech,
          type: 'technician',
          category: 'Technicians',
          rating: tech.rating || 0, // Use actual rating or 0 if not set
          matchScore: isEmptyQuery ? 1.0 : calculateMatchScore(query, tech.name, tech.serviceDescription, tech.specializations)
        }));

      allResults.push(...technicians);
    } catch (error) {
      console.error('Error searching technicians:', error);
    }

    // Search Service Centers
    try {
      const scSnapshot = await serviceCentersCollection.get();
      
      const serviceCenters = scSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(center => {
          const businessName = (center.businessName || '').toLowerCase();
          const description = (center.description || '').toLowerCase();
          const businessType = (center.businessType || '').toLowerCase();
          
          return businessName.includes(queryLower) || 
                 description.includes(queryLower) || 
                 businessType.includes(queryLower);
        })
        .map(center => ({
          ...center,
          type: 'serviceCenter',
          category: 'Service Centers',
          name: center.businessName,
          rating: center.rating || 0, // Use actual rating or 0 if not set
          matchScore: isEmptyQuery ? 1.0 : calculateMatchScore(query, center.businessName, center.description, [center.businessType])
        }));

      allResults.push(...serviceCenters);
    } catch (error) {
      console.error('Error searching service centers:', error);
    }

    // Search Towing Services
    try {
      const towingSnapshot = await towingServicesCollection
        .where('isActive', '==', true)
        .get();
      
      const towingServices = towingSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(towing => {
          const businessName = (towing.businessName || '').toLowerCase();
          const description = (towing.description || '').toLowerCase();
          const serviceTypes = (towing.serviceTypes || []).join(' ').toLowerCase();
          
          return businessName.includes(queryLower) || 
                 description.includes(queryLower) || 
                 serviceTypes.includes(queryLower);
        })
        .map(towing => ({
          ...towing,
          type: 'towing',
          category: 'Towing',
          name: towing.businessName,
          rating: towing.rating || 0, // Use actual rating or 0 if not set
          matchScore: isEmptyQuery ? 1.0 : calculateMatchScore(query, towing.businessName, towing.description, towing.serviceTypes)
        }));

      allResults.push(...towingServices);
    } catch (error) {
      console.error('Error searching towing services:', error);
    }

    // Sort by match score and rating
    allResults.sort((a, b) => {
      if (sort === 'relevance') {
        return b.matchScore - a.matchScore;
      }
      return b.rating - a.rating;
    });

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedResults = allResults.slice(startIndex, startIndex + parseInt(limit));

    res.json({
      success: true,
      data: paginatedResults,
      total: allResults.length,
      page: parseInt(page),
      totalPages: Math.ceil(allResults.length / limit),
      searchQuery: query || '',
      category: 'All'
    });

  } catch (error) {
    console.error('Search all error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform search'
    });
  }
};

// Search towing services
const searchTowingServices = async (req, res) => {
  try {
    const {
      query,
      filters = {},
      location,
      page = 1,
      limit = 10,
      sort = 'rating',
      userId
    } = req.query;

    // Save search to history if userId is provided
    if (userId && query) {
      await saveSearchHistory(userId, query, 'Towing');
    }

    let towingQuery = towingServicesCollection.where('isActive', '==', true);

    const snapshot = await towingQuery.get();
    let towingServices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Apply text search if query provided
    if (query && query.trim() !== '') {
      const queryLower = query.toLowerCase();
      towingServices = towingServices.filter(service => {
        const businessName = (service.businessName || '').toLowerCase();
        const description = (service.description || '').toLowerCase();
        const serviceTypes = (service.serviceTypes || []).join(' ').toLowerCase();
        const vehicleTypes = (service.vehicleTypes || []).join(' ').toLowerCase();
        
        return businessName.includes(queryLower) || 
               description.includes(queryLower) || 
               serviceTypes.includes(queryLower) ||
               vehicleTypes.includes(queryLower);
      });
    }

    // Apply filters
    towingServices = applyTowingFilters(towingServices, filters);
    
    // Apply sorting
    towingServices = applyTowingSorting(towingServices, sort);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedResults = towingServices.slice(startIndex, startIndex + parseInt(limit));

    res.json({
      success: true,
      data: paginatedResults,
      total: towingServices.length,
      page: parseInt(page),
      totalPages: Math.ceil(towingServices.length / limit),
      searchQuery: query,
      category: 'Towing'
    });

  } catch (error) {
    console.error('Search towing services error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search towing services'
    });
  }
};

// Add search to user's history
const saveSearchHistory = async (userId, query, category) => {
  try {
    const searchHistoryPath = getCollectionPath(userId);
    const searchHistoryRef = db.collection(searchHistoryPath);
    
    // Create new search entry
    const searchEntry = {
      query: query.trim(),
      category,
      searchedAt: admin.firestore.Timestamp.now(),
      userId
    };
    
    await searchHistoryRef.add(searchEntry);
    
    // Clean up old entries (keep only MAX_HISTORY_ITEMS)
    const oldEntries = await searchHistoryRef
      .orderBy('searchedAt', 'desc')
      .offset(MAX_HISTORY_ITEMS)
      .get();
    
    const batch = db.batch();
    oldEntries.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    if (!oldEntries.empty) {
      await batch.commit();
    }
    
  } catch (error) {
    console.error('Error saving search history:', error);
    // Don't throw error as search history is not critical
  }
};

// Get user's recent searches
const getRecentSearches = async (req, res) => {
  try {
    const { userId } = req.params;
    const { category = 'All', limit = RECENT_SEARCHES_LIMIT } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }
    
    const searchHistoryPath = getCollectionPath(userId);
    let query = db.collection(searchHistoryPath)
      .orderBy('searchedAt', 'desc')
      .limit(parseInt(limit));
    
    // Filter by category if not 'All'
    if (category !== 'All') {
      query = query.where('category', '==', category);
    }
    
    const snapshot = await query.get();
    
    const recentSearches = [];
    const seenQueries = new Set();
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      // Avoid duplicate queries
      if (!seenQueries.has(data.query.toLowerCase())) {
        seenQueries.add(data.query.toLowerCase());
        recentSearches.push({
          id: doc.id,
          query: data.query,
          category: data.category,
          searchedAt: data.searchedAt
        });
      }
    });
    
    res.json({
      success: true,
      data: recentSearches.slice(0, parseInt(limit))
    });
    
  } catch (error) {
    console.error('Get recent searches error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent searches'
    });
  }
};

// Delete search history item
const deleteSearchHistory = async (req, res) => {
  try {
    const { userId, searchId } = req.params;
    
    if (!userId || !searchId) {
      return res.status(400).json({
        success: false,
        error: 'User ID and Search ID are required'
      });
    }
    
    const searchHistoryPath = getCollectionPath(userId);
    await db.collection(searchHistoryPath).doc(searchId).delete();
    
    res.json({
      success: true,
      message: 'Search history item deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete search history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete search history item'
    });
  }
};

// Clear all search history for user
const clearSearchHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }
    
    const searchHistoryPath = getCollectionPath(userId);
    const snapshot = await db.collection(searchHistoryPath).get();
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    if (!snapshot.empty) {
      await batch.commit();
    }
    
    res.json({
      success: true,
      message: 'Search history cleared successfully'
    });
    
  } catch (error) {
    console.error('Clear search history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear search history'
    });
  }
};

// Helper function to calculate match score for search relevance
const calculateMatchScore = (query, name, description, tags = []) => {
  let score = 0;
  const queryLower = query.toLowerCase();
  const nameLower = (name || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  const tagsStr = (tags || []).join(' ').toLowerCase();
  
  // Exact name match gets highest score
  if (nameLower === queryLower) {
    score += 100;
  } else if (nameLower.includes(queryLower)) {
    score += 50;
  }
  
  // Description match
  if (descLower.includes(queryLower)) {
    score += 30;
  }
  
  // Tags match
  if (tagsStr.includes(queryLower)) {
    score += 20;
  }
  
  // Word matches
  const queryWords = queryLower.split(' ');
  queryWords.forEach(word => {
    if (word.length > 2) { // Skip very short words
      if (nameLower.includes(word)) score += 10;
      if (descLower.includes(word)) score += 5;
      if (tagsStr.includes(word)) score += 5;
    }
  });
  
  return score;
};

// Helper functions for towing service filtering and sorting
const applyTowingFilters = (towingServices, filters) => {
  let filtered = [...towingServices];

  // Service type filter
  if (filters.serviceType) {
    filtered = filtered.filter(service => {
      const serviceTypes = service.serviceTypes || [];
      return serviceTypes.includes(filters.serviceType);
    });
  }

  // Vehicle type filter
  if (filters.vehicleType) {
    filtered = filtered.filter(service => {
      const vehicleTypes = service.vehicleTypes || [];
      return vehicleTypes.includes(filters.vehicleType);
    });
  }

  // 24/7 service filter
  if (filters.is24Hour === 'true') {
    filtered = filtered.filter(service => service.is24HourService === true);
  }

  // Price range filter
  if (filters.maxPrice) {
    const maxPrice = parseFloat(filters.maxPrice);
    filtered = filtered.filter(service => {
      const baseFee = service.baseTowingFee || 0;
      return baseFee <= maxPrice;
    });
  }

  // Rating filter
  if (filters.minRating) {
    const minRating = parseFloat(filters.minRating);
    filtered = filtered.filter(service => {
      const rating = service.rating || 4.0;
      return rating >= minRating;
    });
  }

  return filtered;
};

const applyTowingSorting = (towingServices, sort) => {
  switch (sort) {
    case 'rating':
      return towingServices.sort((a, b) => {
        const ratingA = a.rating || 4.0;
        const ratingB = b.rating || 4.0;
        return ratingB - ratingA;
      });
    case 'price':
      return towingServices.sort((a, b) => {
        const priceA = a.baseTowingFee || 999999;
        const priceB = b.baseTowingFee || 999999;
        return priceA - priceB;
      });
    case 'responseTime':
      return towingServices.sort((a, b) => {
        const timeA = a.averageResponseTime || 999;
        const timeB = b.averageResponseTime || 999;
        return timeA - timeB;
      });
    case 'totalTows':
      return towingServices.sort((a, b) => {
        const towsA = a.totalTows || 0;
        const towsB = b.totalTows || 0;
        return towsB - towsA;
      });
    default:
      return towingServices.sort((a, b) => {
        const ratingA = a.rating || 4.0;
        const ratingB = b.rating || 4.0;
        return ratingB - ratingA;
      });
  }
};

module.exports = {
  searchTechnicians,
  searchServiceCenters,
  searchAll,
  searchTowingServices,
  getServiceCategories,
  getFeaturedResults,
  getSearchSuggestions,
  getRecentSearches,
  deleteSearchHistory,
  clearSearchHistory
};