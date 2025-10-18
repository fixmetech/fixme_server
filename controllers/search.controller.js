const { db } = require('../firebase');
const admin = require('firebase-admin');
const { getCollectionPath, MAX_HISTORY_ITEMS, RECENT_SEARCHES_LIMIT } = require('../models/searchHistory.model');
const { COLLECTION_NAME: TOWING_COLLECTION } = require('../models/towingService.model');

// Collections
const techniciansCollection = db.collection('technicians');
const serviceCentersCollection = db.collection('serviceCenters');
const servicesCollection = db.collection('services');
const towingServicesCollection = db.collection(TOWING_COLLECTION);
const technicianFeedbackCollection = db.collection('technicianFeedback');

// Search technicians with filters
const searchTechnicians = async (req, res) => {
  try {
    const {
      query,
      category,
      location,
      page = 1,
      limit = 10,
      sort = 'rating',
      // Filter parameters
      rating,
      ratingRange,
      priceRange,
      price,
      distance,
      language,
      languages,
      visitingFee,
      feeRange,
      serviceArea,
      highlyRated,
      availability,
      experience
    } = req.query;



    // Build filters object from query parameters
    const filters = {};
    if (rating) filters.rating = rating;
    if (ratingRange) filters.ratingRange = ratingRange;
    if (priceRange) filters.priceRange = priceRange;
    if (price) filters.price = price;
    if (distance) filters.distance = distance;
    if (language) filters.language = language;
    if (languages) filters.languages = Array.isArray(languages) ? languages : [languages];
    if (visitingFee) filters.visitingFee = visitingFee;
    if (feeRange) filters.feeRange = feeRange;
    if (serviceArea) filters.serviceArea = serviceArea;
    if (highlyRated) filters.highlyRated = highlyRated;
    if (availability) filters.availability = availability;
    if (experience) filters.experience = experience;

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

    // Calculate real ratings for all technicians BEFORE filtering
    const techniciansWithRealRatings = await Promise.all(
      technicians.map(async (technician) => {
        const realRating = await getTechnicianAverageRating(technician.id);
        const feedbackCount = await getTechnicianFeedbackCount(technician.id);
        return {
          ...technician,
          rating: realRating,
          totalFeedback: feedbackCount
        };
      })
    );
    
    // Apply additional filters AFTER calculating real ratings
    const filteredTechnicians = applyFilters(techniciansWithRealRatings, filters);
    
    // Parse user location if provided
    const userLocation = location ? JSON.parse(location) : null;
    
    // Apply sorting with real ratings and user location
    const sortedTechnicians = applySorting(filteredTechnicians, sort, userLocation);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedResults = sortedTechnicians.slice(startIndex, startIndex + parseInt(limit));

    res.json({
      success: true,
      data: paginatedResults,
      total: sortedTechnicians.length,
      page: parseInt(page),
      totalPages: Math.ceil(sortedTechnicians.length / limit),
      filters: generateFilterSummary(sortedTechnicians)
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
          rating: data.rating || 0,
          totalJobs: data.totalJobs || 0,
          visitingFee: data.visitingFee || 0,
          profilePictureUrl: data.profilePictureUrl,
          specializations: data.specializations || [],
          isAvailable: data.isActive,
          distance: data.distance || 0,
          responseTime: data.responseTime || 0,
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
          rating: data.rating || 0,
          address: data.address,
          city: data.city,
          phone: data.phone,
          description: data.description,
          distance: data.distance || 0,
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

// Get technician average rating
const getTechnicianRating = async (req, res) => {
  try {
    const { technicianId } = req.params;

    if (!technicianId) {
      return res.status(400).json({
        success: false,
        error: 'Technician ID is required'
      });
    }

    const averageRating = await getTechnicianAverageRating(technicianId);

    res.json({
      success: true,
      data: {
        technicianId,
        averageRating,
        totalFeedback: await getTechnicianFeedbackCount(technicianId)
      }
    });

  } catch (error) {
    console.error('Get technician rating error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch technician rating'
    });
  }
};

// Helper functions for filtering and sorting
const applyFilters = (technicians, filters) => {
  if (!filters) return technicians;
  
  let filtered = [...technicians];

  // Price range filter - using real visitingFee data
  if (filters.priceRange) {
    const [min, max] = filters.priceRange.split('-').map(Number);
    filtered = filtered.filter(tech => {
      const price = parseFloat(tech.visitingFee) || parseFloat(tech.price) || 0;
      if (price === 0) return true;
      return price >= min && price <= max;
    });
  }

  // Simple price filter (for backward compatibility)
  if (filters.price && !filters.priceRange) {
    const maxPrice = parseInt(filters.price.replace(/\D/g, '')) || 1000;
    filtered = filtered.filter(tech => {
      const visitingFee = parseFloat(tech.visitingFee) || parseFloat(tech.price) || 0;
      if (visitingFee === 0) return true;
      return visitingFee <= maxPrice;
    });
  }

  // Rating filter - 2-5 range with 0.5 intervals
  if (filters.rating) {
    let minRating;
    if (typeof filters.rating === 'string') {
      minRating = parseFloat(filters.rating.replace(/\D/g, '')) / 10 || parseFloat(filters.rating) || 2.0;
    } else {
      minRating = parseFloat(filters.rating) || 2.0;
    }
    
    minRating = Math.max(2.0, Math.min(5.0, minRating));
    
    filtered = filtered.filter(tech => {
      const rating = tech.rating || 0;
      return rating >= minRating && rating <= 5.0;
    });
  }

  // Rating range filter (for slider with min/max)
  if (filters.ratingRange) {
    const [min, max] = filters.ratingRange.split('-').map(Number);
    filtered = filtered.filter(tech => {
      const rating = tech.rating || 2.0;
      return rating >= Math.max(2.0, min) && rating <= Math.min(5.0, max);
    });
  }

  // Distance filter - using real serviceRadius data
  if (filters.distance) {
    let maxDistance;
    if (typeof filters.distance === 'string') {
      maxDistance = parseInt(filters.distance.replace(/\D/g, '')) || 10;
    } else {
      maxDistance = parseFloat(filters.distance) || 10;
    }
    
    filtered = filtered.filter(tech => {
      const serviceRadius = parseFloat(tech.serviceRadius) || 10;
      return serviceRadius >= maxDistance;
    });
  }

  // Language filter - array-based filtering
  if (filters.language) {
    filtered = filtered.filter(tech => {
      const techLanguages = tech.languages || tech.language || ['English'];
      if (Array.isArray(techLanguages)) {
        return techLanguages.some(lang => 
          lang.toLowerCase().includes(filters.language.toLowerCase())
        );
      }
      return techLanguages.toLowerCase().includes(filters.language.toLowerCase());
    });
  }

  // Multiple languages filter
  if (filters.languages && Array.isArray(filters.languages)) {
    filtered = filtered.filter(tech => {
      const techLanguages = tech.languages || tech.language || ['English'];
      if (!Array.isArray(techLanguages)) return false;
      
      return filters.languages.some(filterLang =>
        techLanguages.some(techLang =>
          techLang.toLowerCase().includes(filterLang.toLowerCase())
        )
      );
    });
  }

  // Visiting fee range filter with proper ranges
  if (filters.visitingFee) {
    if (typeof filters.visitingFee === 'string') {
      const feeRange = filters.visitingFee;
      filtered = filtered.filter(tech => {
        const visitingFee = parseFloat(tech.visitingFee) || 0;
        
        if (feeRange.includes('Under Rs.59') || feeRange.includes('under-59')) {
          return visitingFee < 59;
        } else if (feeRange.includes('Rs.59 - Rs.79') || feeRange.includes('59-79')) {
          return visitingFee >= 59 && visitingFee <= 79;
        } else if (feeRange.includes('Rs.79 - Rs.99') || feeRange.includes('79-99')) {
          return visitingFee >= 79 && visitingFee <= 99;
        } else if (feeRange.includes('Rs.99+') || feeRange.includes('99+')) {
          return visitingFee >= 99;
        }
        return true;
      });
    } else {
      // Numeric filter
      const maxFee = parseFloat(filters.visitingFee);
      filtered = filtered.filter(tech => {
        const fee = parseFloat(tech.visitingFee) || 0;
        return fee <= maxFee;
      });
    }
  }

  // Fee range filter (for slider)
  if (filters.feeRange) {
    const [min, max] = filters.feeRange.split('-').map(Number);
    filtered = filtered.filter(tech => {
      const fee = parseFloat(tech.visitingFee) || 0;
      return fee >= min && fee <= max;
    });
  }

  // Service area filter
  if (filters.serviceArea) {
    const minServiceArea = parseFloat(filters.serviceArea);
    filtered = filtered.filter(tech => {
      const serviceRadius = parseFloat(tech.serviceRadius) || 10;
      return serviceRadius >= minServiceArea;
    });
  }

  // Highly rated filter (4.5+ rating)
  if (filters.highlyRated === 'true' || filters.highlyRated === true) {
    filtered = filtered.filter(tech => {
      const rating = tech.rating || 2.0;
      return rating >= 4.5;
    });
  }

  // Availability filter
  if (filters.availability === 'true' || filters.availability === true) {
    filtered = filtered.filter(tech => {
      return tech.isAvailable === true || tech.status === 'available';
    });
  }

  // Experience filter
  if (filters.experience) {
    const minExperience = parseInt(filters.experience);
    filtered = filtered.filter(tech => {
      const experience = parseInt(tech.experience) || 0;
      return experience >= minExperience;
    });
  }

  return filtered;
};

const applySorting = (technicians, sort, userLocation = null) => {
  switch (sort) {
    case 'rating':
      return technicians.sort((a, b) => {
        const ratingA = a.rating || 2.0;
        const ratingB = b.rating || 2.0;
        return ratingB - ratingA;
      });
      
    case 'price':
    case 'visitingFee':
      return technicians.sort((a, b) => {
        const priceA = parseFloat(a.visitingFee) || 0;
        const priceB = parseFloat(b.visitingFee) || 0;
        return priceA - priceB;
      });
      
    case 'distance':
      return technicians.sort((a, b) => {
        const serviceRadiusA = parseFloat(a.serviceRadius) || 10;
        const serviceRadiusB = parseFloat(b.serviceRadius) || 10;
        
        if (userLocation && userLocation.latitude && userLocation.longitude) {
          return serviceRadiusA - serviceRadiusB;
        }
        
        return serviceRadiusA - serviceRadiusB;
      });
      
    case 'serviceRadius':
      return technicians.sort((a, b) => {
        const radiusA = parseFloat(a.serviceRadius) || 10;
        const radiusB = parseFloat(b.serviceRadius) || 10;
        return radiusB - radiusA;
      });
      
    case 'experience':
      return technicians.sort((a, b) => {
        const expA = parseInt(a.experience) || 0;
        const expB = parseInt(b.experience) || 0;
        return expB - expA;
      });
      
    case 'recent':
    case 'newest':
      return technicians.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        return b.id.localeCompare(a.id);
      });
      
    case 'availability':
      return technicians.sort((a, b) => {
        const availableA = a.isAvailable === true || a.status === 'available';
        const availableB = b.isAvailable === true || b.status === 'available';
        
        if (availableA && !availableB) return -1;
        if (!availableA && availableB) return 1;
        
        const ratingA = a.rating || 2.0;
        const ratingB = b.rating || 2.0;
        return ratingB - ratingA;
      });
      
    case 'alphabetical':
    case 'name':
      return technicians.sort((a, b) => {
        const nameA = (a.firstName || '') + ' ' + (a.lastName || '');
        const nameB = (b.firstName || '') + ' ' + (b.lastName || '');
        return nameA.localeCompare(nameB);
      });
      
    default:
      return technicians.sort((a, b) => {
        const ratingA = a.rating || 2.0;
        const ratingB = b.rating || 2.0;
        return ratingB - ratingA;
      });
  }
};

const applyServiceCenterFilters = (serviceCenters, filters) => {
  return serviceCenters;
};

const applyServiceCenterSorting = (serviceCenters, sort) => {
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
    
    const rating = tech.rating || 0;
    avgRating += rating;
    
    const price = tech.visitingFee || 0;
    if (price > 0) {
      priceRange.min = Math.min(priceRange.min, price);
      priceRange.max = Math.max(priceRange.max, price);
    }
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
  return {};
};

// Helper functions for category images
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
          rating: tech.rating || 0,
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
          rating: center.rating || 0,
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
          rating: towing.rating || 0,
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
    if (word.length > 2) {
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

// Helper function to calculate average rating for a technician
const getTechnicianAverageRating = async (technicianId) => {
  try {
    if (!technicianId) {
      return 0;
    }

    // Query all feedback documents for the specific technician
    const feedbackQuery = technicianFeedbackCollection
      .where('technicianId', '==', technicianId);
    
    const feedbackSnapshot = await feedbackQuery.get();
    
    if (feedbackSnapshot.empty) {
      return 0; // No feedback found, return 0 rating
    }

    let totalRating = 0;
    let ratingCount = 0;

    // Calculate sum of all ratings
    feedbackSnapshot.forEach(doc => {
      const feedback = doc.data();
      const rating = feedback.rating;
      
      // Ensure rating is a valid number
      if (typeof rating === 'number' && rating >= 0 && rating <= 5) {
        totalRating += rating;
        ratingCount++;
      }
    });

    // Calculate and return average rating
    if (ratingCount === 0) {
      return 0;
    }

    const averageRating = totalRating / ratingCount;
    
    // Round to 1 decimal place
    return Math.round(averageRating * 10) / 10;

  } catch (error) {
    console.error('Error calculating technician average rating:', error);
    return 0; // Return 0 in case of error
  }
};

// Helper function to get total feedback count for a technician
const getTechnicianFeedbackCount = async (technicianId) => {
  try {
    if (!technicianId) {
      return 0;
    }

    const feedbackQuery = technicianFeedbackCollection
      .where('technicianId', '==', technicianId);
    
    const feedbackSnapshot = await feedbackQuery.get();
    return feedbackSnapshot.size;

  } catch (error) {
    console.error('Error getting technician feedback count:', error);
    return 0;
  }
};

// Get filter options with proper ranges for sliders
const getFilterOptions = async (req, res) => {
  try {
    // Get all technicians to calculate ranges
    const technicianSnapshot = await techniciansCollection.get();
    const technicians = [];
    
    for (const doc of technicianSnapshot.docs) {
      const data = doc.data();
      const technicianData = {
        id: doc.id,
        ...data,
        rating: await getTechnicianAverageRating(doc.id)
      };
      technicians.push(technicianData);
    }

    // Calculate price range
    const visitingFees = technicians
      .map(tech => parseFloat(tech.visitingFee) || 0)
      .filter(fee => fee > 0);
    
    const minPrice = visitingFees.length > 0 ? Math.min(...visitingFees) : 0;
    const maxPrice = visitingFees.length > 0 ? Math.max(...visitingFees) : 200;

    // Calculate service radius range
    const serviceRadii = technicians
      .map(tech => parseFloat(tech.serviceRadius) || 10)
      .filter(radius => radius > 0);
    
    const minRadius = serviceRadii.length > 0 ? Math.min(...serviceRadii) : 5;
    const maxRadius = serviceRadii.length > 0 ? Math.max(...serviceRadii) : 50;

    // Get unique languages
    const allLanguages = new Set();
    technicians.forEach(tech => {
      // Handle both 'languages' and 'language' field names
      const techLanguages = tech.languages || tech.language || [];
      if (Array.isArray(techLanguages)) {
        techLanguages.forEach(lang => allLanguages.add(lang));
      } else if (techLanguages) {
        allLanguages.add(techLanguages);
      }
    });

    // Get experience range
    const experiences = technicians
      .map(tech => parseInt(tech.experience) || 0)
      .filter(exp => exp > 0);
    
    const minExperience = experiences.length > 0 ? Math.min(...experiences) : 0;
    const maxExperience = experiences.length > 0 ? Math.max(...experiences) : 20;

    const filterOptions = {
      price: {
        min: Math.floor(minPrice),
        max: Math.ceil(maxPrice),
        step: 10,
        default: [Math.floor(minPrice), Math.ceil(maxPrice)],
        ranges: [
          { label: 'Under Rs.50', value: 'under-50', min: 0, max: 49 },
          { label: 'Rs.50 - Rs.100', value: '50-100', min: 50, max: 100 },
          { label: 'Rs.100 - Rs.150', value: '100-150', min: 100, max: 150 },
          { label: 'Rs.150+', value: '150+', min: 150, max: maxPrice }
        ]
      },
      rating: {
        min: 2.0,
        max: 5.0,
        step: 0.5,
        default: [2.0, 5.0],
        intervals: [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0],
        ranges: [
          { label: '2.0+', value: '2.0', min: 2.0 },
          { label: '2.5+', value: '2.5', min: 2.5 },
          { label: '3.0+', value: '3.0', min: 3.0 },
          { label: '3.5+', value: '3.5', min: 3.5 },
          { label: '4.0+', value: '4.0', min: 4.0 },
          { label: '4.5+', value: '4.5', min: 4.5 }
        ]
      },
      distance: {
        min: Math.floor(minRadius),
        max: Math.ceil(maxRadius),
        step: 5,
        default: [Math.floor(minRadius), Math.ceil(maxRadius)],
        ranges: [
          { label: 'Within 5km', value: '5', max: 5 },
          { label: 'Within 10km', value: '10', max: 10 },
          { label: 'Within 20km', value: '20', max: 20 },
          { label: 'Within 50km', value: '50', max: 50 }
        ]
      },
      experience: {
        min: minExperience,
        max: maxExperience,
        step: 1,
        default: [minExperience, maxExperience],
        ranges: [
          { label: '1+ years', value: '1', min: 1 },
          { label: '2+ years', value: '2', min: 2 },
          { label: '5+ years', value: '5', min: 5 },
          { label: '10+ years', value: '10', min: 10 }
        ]
      },
      languages: Array.from(allLanguages).sort(),
      availability: [
        { label: 'Available Now', value: 'available' },
        { label: 'All Technicians', value: 'all' }
      ],
      sortOptions: [
        { label: 'Best Rating', value: 'rating' },
        { label: 'Lowest Price', value: 'price' },
        { label: 'Nearest', value: 'distance' },
        { label: 'Most Experienced', value: 'experience' },
        { label: 'Recently Added', value: 'recent' },
        { label: 'Available First', value: 'availability' },
        { label: 'Alphabetical', value: 'name' }
      ]
    };

    res.status(200).json({
      success: true,
      data: filterOptions,
      meta: {
        totalTechnicians: technicians.length,
        priceRange: `Rs.${minPrice} - Rs.${maxPrice}`,
        ratingRange: '2.0 - 5.0',
        serviceRadiusRange: `${minRadius}km - ${maxRadius}km`
      }
    });

  } catch (error) {
    console.error('Error getting filter options:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get filter options',
      error: error.message
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
  getTechnicianRating,
  getRecentSearches,
  deleteSearchHistory,
  clearSearchHistory,
  getTechnicianAverageRating,
  getTechnicianFeedbackCount,
  getFilterOptions
};