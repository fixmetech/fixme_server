const geofire = require('geofire-common');
const { geoDb } = require('../firebase');

const findNearbyTechnicians = async (lat, lng, radiusInM) => {
  try {
    const center = [lat, lng];

    // Get geohash queries for this circle (radiusInM is already in meters)
    const bounds = geofire.geohashQueryBounds(center, radiusInM);
    const techniciansRef = geoDb.ref('technicians');

    const matchingTechs = [];
    // Process each geohash bound
    for (const b of bounds) {
      const query = techniciansRef
        .orderByChild('geohash')
        .startAt(b[0])
        .endAt(b[1]);
      
      const snapshot = await query.once('value');
      snapshot.forEach(child => {
        const val = child.val();
        if (val && val.location && val.location.lat && val.location.lng) {
          const dist = geofire.distanceBetween([val.location.lat, val.location.lng], center) * 1000;
          if (dist <= radiusInM) {
            matchingTechs.push({ 
              id: child.key, 
              ...val, 
              distance: Math.round(dist * 100) / 100 // Round to 2 decimal places
            });
          }
        }
      });
    }

    // Remove duplicates (technicians might appear in multiple geohash ranges)
    const uniqueTechs = matchingTechs.filter((tech, index, self) => 
      index === self.findIndex(t => t.id === tech.id)
    );
    return uniqueTechs.sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error('Error finding nearby technicians:', error);
    throw new Error('Failed to find nearby technicians: ' + error.message);
  }
};

module.exports = {
  findNearbyTechnicians,
};
