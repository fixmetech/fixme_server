const express = require('express');
const router = express.Router();

const { createBooking } = require('../controllers/booking.controller');
// const { authenticate } =  require('../utils/middleware/auth.middleware');


// Create a new booking
router.post('/createbooking', /*authenticate*/  createBooking);



module.exports = router;
