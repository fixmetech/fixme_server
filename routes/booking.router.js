const express = require('express');
const router = express.Router();

const { createBooking, getBookingsByTechnician, getAvailableTimeSlots } = require('../controllers/booking.controller');
// const { authenticate } =  require('../utils/middleware/auth.middleware');


// Create a new booking
router.post('/createbooking', /*authenticate,*/ createBooking);

// Get bookings for a specific technician
router.get('/technician/:technicianId/bookings', getBookingsByTechnician);

// Get available time slots for a technician on a specific date
router.get('/technician/:technicianId/timeslots', getAvailableTimeSlots);

module.exports = router;
