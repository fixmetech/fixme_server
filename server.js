const express = require('express');
const cors = require('cors');
require('dotenv').config();


const app = express();

app.use(cors());
app.use(express.json());

const serviceRoutes = require('./routes/service.route');
app.use('/api/services', serviceRoutes);

// server start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});