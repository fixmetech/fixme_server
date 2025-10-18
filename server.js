const express = require('express');
const cors = require('cors');
require('dotenv').config();


const app = express();

app.use(cors());
app.use(express.json());

const serviceRoutes = require('./routes/service.route');
const technicianRoutes = require('./routes/technician.route');
const moderatorRoutes = require('./routes/moderator.route');
const customerRoutes = require('./routes/customer.route');
const chatRoutes = require('./routes/chat.route');

const utilityRoutes = require('./routes/utility.route');
const searchRoutes = require('./routes/search.route');

const complaintRoutes = require('./routes/complaint.route.simple');

const jobRequestsRoute = require('./routes/job.route');
const bookingRoutes = require('./routes/booking.router');
const appointmentRoutes = require('./routes/appointment.route');
const feedbackRoutes = require('./routes/feedback.route');

app.use('/api/service_center', serviceRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/moderators', moderatorRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/search', searchRoutes);

app.use('/api/complaints', complaintRoutes);

app.use('/api/customers', customerRoutes);

app.use('/api', jobRequestsRoute);
app.use('/api/utility', utilityRoutes);
app.use('/api/jobs', jobRequestsRoute);
app.use('/api/user', bookingRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/feedback', feedbackRoutes);

// server start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});