const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const unitRoutes = require('./routes/unitRoutes');
const roomRoutes = require('./routes/roomRoutes');
const consumptionRoutes = require('./routes/consumptionRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/units', unitRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/consumptions', consumptionRoutes);
app.use('/api/bookings', bookingRoutes);

// Base route for health check
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Backend is healthy and running' });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
