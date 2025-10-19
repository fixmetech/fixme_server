const express = require("express");
const router = express.Router();

const {
  createBooking,
  getBookingsByTechnician,
  getAvailableTimeSlots,
  getScheduledBookingsByCustomerId,
  getCompletedBookingsByCustomerAndTechnician,
} = require("../controllers/booking.controller");
// const { authenticate } =  require('../utils/middleware/auth.middleware');

// Create a new booking
router.post("/createbooking", /*authenticate,*/ createBooking);

// Get bookings for a specific technician
router.get("/technician/:technicianId/bookings", getBookingsByTechnician);

// Get available time slots for a technician on a specific date
router.get("/technician/:technicianId/timeslots", getAvailableTimeSlots);

router.get(
  "/my-bookings/:customerId",
  /* verifyAuth, */ getScheduledBookingsByCustomerId
);

// Get completed bookings for customer-technician pair (for complaint filing)
router.get(
  "/completed/:customerId/:technicianId",
  getCompletedBookingsByCustomerAndTechnician
);

module.exports = router;
