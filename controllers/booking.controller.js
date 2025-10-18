const { firestore } = require('firebase-admin');
const { db } = require('../firebase');
const {bookingSchema} = require('../validators/booking.validator');

// Create booking
const createBooking = async (req, res) => {
    try {
        console.log('Creating booking with data:', req.body);
        
        const { error, value } = bookingSchema.validate(req.body);
        if (error) {
            console.log('Validation error:', error.details[0].message);
            return res.status(400).json({ 
                success: false,
                error: error.details[0].message 
            });
        }
        // get only name, email and phone for the userId
        const userDoc = await db.collection('users').doc(value.userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({
            success: false,
            error: 'User not found'
            });
        }
        const { firstName = null ,lastName= null, email = null, phone = null } = userDoc.data() || {};
        const name = firstName && lastName ? `${firstName} ${lastName}` : firstName || 'N/A';
        console.log('Fetched user details:', { name, email, phone });
        const userDetails = { name, email, phone };


        const bookingData = {
            ...value,
            userDetails: userDetails,        
            status: 'pending', // Default status
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // console.log('Saving booking data:', bookingData);
        const docRef = await db.collection('bookings').add(bookingData);
        
        const responseData = { 
            id: docRef.id, 
            ...bookingData,
            success: true,
            message: 'Booking created successfully'
        };

        // console.log('Booking created successfully:', responseData);
        res.status(201).json(responseData);
        
    } catch (err) {
        console.error('Error creating booking:', err);
        res.status(500).json({ 
            success: false,
            error: 'Failed to create booking: ' + err.message 
        });
    }
};

// Get all bookings for a technician from customer side to check the availability of the technicians 
const getBookingsByTechnician = async (req, res) => {
    try {
        const { technicianId } = req.params;
        console.log('Fetching bookings for technician:', technicianId);
        
        if (!technicianId) {
            return res.status(400).json({ 
                success: false,
                error: 'Technician ID is required' 
            });
        }

        const snapshot = await db.collection('bookings')
            .where('technicianId', '==', technicianId)
            .orderBy('scheduledDate', 'desc')
            .get();
            
        const bookings = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            bookings.push({ 
                id: doc.id, 
                ...data,
                // Convert Firestore timestamps to ISO strings for frontend
                createdAt: data.createdAt?.toDate()?.toISOString(),
                updatedAt: data.updatedAt?.toDate()?.toISOString(),
                scheduledDate: data.scheduledDate?.toDate ? data.scheduledDate.toDate().toISOString() : data.scheduledDate,
                bookingDate: data.bookingDate?.toDate ? data.bookingDate.toDate().toISOString() : data.bookingDate
            });
        });
        
        console.log(`Found ${bookings.length} bookings for technician ${technicianId}`);
        res.status(200).json({
            success: true,
            data: bookings,
            total: bookings.length
        });
        
    } catch (err) {
        console.error('Error fetching bookings:', err);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch bookings: ' + err.message 
        });
    }
};

// Get available time slots for a technician on a specific date
const getAvailableTimeSlots = async (req, res) => {
    try {
        const { technicianId } = req.params;
        const { date } = req.query; // Expected format: YYYY-MM-DD
        
        console.log('getAvailableTimeSlots called with:', { technicianId, date });
        
        if (!technicianId || !date) {
            console.log('Missing required parameters:', { technicianId, date });
            return res.status(400).json({
                success: false,
                error: 'Technician ID and date are required'
            });
        }

        // Get existing bookings for the date
        // Try different date formats to handle potential timezone issues
        let startOfDay, endOfDay;
        
        try {
            // First try with UTC
            startOfDay = new Date(date + 'T00:00:00.000Z');
            endOfDay = new Date(date + 'T23:59:59.999Z');
        } catch (dateError) {
            console.log('Date parsing error, using alternative format:', dateError);
            // Fallback to local time
            startOfDay = new Date(date + 'T00:00:00');
            endOfDay = new Date(date + 'T23:59:59');
        }
        
        console.log('Date range for query:', { startOfDay, endOfDay, originalDate: date });
        
        // Use single field query to avoid composite index requirement
        // Then filter by date in JavaScript
        const snapshot = await db.collection('bookings')
            .where('technicianId', '==', technicianId)
            .get();

        console.log('Found total bookings for technician:', snapshot.size);
        
        const bookedTimeSlots = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log('Booking data:', { id: doc.id, scheduledDate: data.scheduledDate, scheduledTime: data.scheduledTime, status: data.status });
            
            // Check if this booking is for the requested date
            let bookingDate = '';
            if (data.scheduledDate) {
                if (data.scheduledDate.toDate) {
                    // Firestore Timestamp
                    bookingDate = data.scheduledDate.toDate().toISOString().split('T')[0];
                } else if (typeof data.scheduledDate === 'string') {
                    // String date
                    bookingDate = data.scheduledDate.split('T')[0];
                } else if (data.scheduledDate instanceof Date) {
                    // Date object
                    bookingDate = data.scheduledDate.toISOString().split('T')[0];
                }
            }
            
            console.log('Comparing dates:', { bookingDate, requestedDate: date, match: bookingDate === date });
            
            // Only consider bookings for the requested date that are not cancelled or rejected
            if (bookingDate === date && 
                data.scheduledTime && 
                data.status !== 'cancelled' && 
                data.status !== 'rejected') {
                bookedTimeSlots.push(data.scheduledTime);
            }
        });

        console.log('Booked time slots (24-hour):', bookedTimeSlots);

        // Standard time slots in 12-hour format (to match frontend)
        const allTimeSlots = [
            '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
            '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
        ];

        // Convert booked slots from 24-hour to 12-hour format for comparison
        const bookedSlotsIn12Hour = bookedTimeSlots.map(slot => {
            return convertTo12HourFormat(slot);
        });

        console.log('Booked time slots (12-hour):', bookedSlotsIn12Hour);

        const availableTimeSlots = allTimeSlots.filter(slot => 
            !bookedSlotsIn12Hour.includes(slot)
        );

        console.log('Available time slots:', availableTimeSlots);

        res.status(200).json({
            success: true,
            data: availableTimeSlots
        });

    } catch (err) {
        console.error('Error fetching time slots:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch time slots: ' + err.message
        });
    }
};

// Helper function to convert 24-hour time to 12-hour format
function convertTo12HourFormat(time24) {
    try {
        const [hours, minutes] = time24.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch (error) {
        console.error('Error converting time format:', error);
        return time24; // Return original if conversion fails
    }
}

module.exports = {
    createBooking,
    getBookingsByTechnician,
    getAvailableTimeSlots
};