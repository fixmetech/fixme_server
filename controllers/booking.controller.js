const { db } = require('../firebase');
const {bookingSchema} = require('../validators/booking.validator');
const bookingModel = require('../models/booking.model');

// Create booking
const createBooking  =  async (req,res) => {
    try {
        const {error,value} = bookingSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        const bookingData = {
            ...value,
            bookingId: db.collection('bookings').doc().id, // Generate unique booking ID
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const docRef = await db.collection('bookings').add(bookingData);
        res.status(201).json({ id: docRef.id, ...bookingData });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// Get all bookings for a technician 
const getBookingsByTechnician = async (req, res) => {
    try {
        const {technicianId} =req.params;
        const snapshot = await db.collection("bookings").where("technicianId","==",technicianId).get();
        const bookings = [];
        snapshot.forEach(doc => {
            bookings.push({ id: doc.id, ...doc.data() });
        }
        );
        res.status(200).json(bookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

  

module.exports ={
    createBooking,
    getBookingsByTechnician
}