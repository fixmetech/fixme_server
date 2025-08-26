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
const jobRoutes = require('./routes/job.route');

app.use('/api/services', serviceRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/moderators', moderatorRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/utility', utilityRoutes);
app.use('/api/jobs', jobRoutes);

// server start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});