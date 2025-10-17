const { db } = require('../firebase');
const admin = require('firebase-admin');

// Collections
const techniciansCollection = db.collection('technicians');
const serviceCentersCollection = db.collection('serviceCenters');
const servicesCollection = db.collection('services');

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

    // Filter by business type if provided
    if (category && category !== '') {
      serviceCenterQuery = serviceCenterQuery.where('businessType', '==', category);
    }

    const snapshot = await serviceCenterQuery.get();
    let serviceCenters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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
          rating: data.rating || 4.0 + Math.random() * 1, // Simulate rating if not present
          totalJobs: data.totalJobs || Math.floor(Math.random() * 200) + 50,
          visitingFee: data.visitingFee || Math.floor(Math.random() * 1000) + 300,
          profilePictureUrl: data.profilePictureUrl,
          specializations: data.specializations || [],
          isAvailable: data.isActive,
          distance: Math.floor(Math.random() * 20) + 5, // Simulate distance
          responseTime: Math.floor(Math.random() * 30) + 15, // Simulate response time
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
          rating: 4.0 + Math.random() * 1, // Simulate rating
          address: data.address,
          city: data.city,
          phone: data.phone,
          description: data.description,
          distance: Math.floor(Math.random() * 20) + 5,
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
      const visitingFee = tech.visitingFee || Math.floor(Math.random() * 1000) + 300;
      return visitingFee <= maxPrice;
    });
  }

  // Rating filter
  if (filters.rating) {
    const minRating = parseFloat(filters.rating.replace(/\D/g, '')) / 10 || 4.5;
    filtered = filtered.filter(tech => {
      const rating = tech.rating || 4.0 + Math.random() * 1;
      return rating >= minRating;
    });
  }

  // Distance filter
  if (filters.distance) {
    const maxDistance = parseInt(filters.distance.replace(/\D/g, '')) || 10;
    filtered = filtered.filter(tech => {
      const distance = Math.floor(Math.random() * 20) + 5; // Simulate distance
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
      const visitingFee = tech.visitingFee || Math.floor(Math.random() * 1000) + 300;
      
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
      const rating = tech.rating || 4.0 + Math.random() * 1;
      return rating >= 4.5;
    });
  }

  return filtered;
};

const applySorting = (technicians, sort) => {
  switch (sort) {
    case 'rating':
      return technicians.sort((a, b) => {
        const ratingA = a.rating || 4.0 + Math.random() * 1;
        const ratingB = b.rating || 4.0 + Math.random() * 1;
        return ratingB - ratingA;
      });
    case 'price':
      return technicians.sort((a, b) => {
        const priceA = a.visitingFee || Math.floor(Math.random() * 1000) + 300;
        const priceB = b.visitingFee || Math.floor(Math.random() * 1000) + 300;
        return priceA - priceB;
      });
    case 'distance':
      return technicians.sort((a, b) => {
        const distanceA = Math.floor(Math.random() * 20) + 5;
        const distanceB = Math.floor(Math.random() * 20) + 5;
        return distanceA - distanceB;
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

module.exports = {
  searchTechnicians,
  searchServiceCenters,
  getServiceCategories,
  getFeaturedResults,
  getSearchSuggestions
};