require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/authRoutes');
const subAdminRoutes = require('./routes/subAdminRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// PostgreSQL setup
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test DB connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Failed to connect to DB:', err);
  } else {
    console.log('✅ Connected to PostgreSQL database!');
    release();
  }
});

const app = express();

// ========================================
// IMPORTANT: WEBHOOK ROUTE FIRST (needs raw body)
// ========================================
// This MUST come before bodyParser.json() middleware
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

// ========================================
// MIDDLEWARE
// ========================================
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploaded PDFs)
app.use('/uploads', express.static('uploads'));

// ========================================
// API ROUTES
// ========================================
// Authentication routes
app.use('/api/auth', authRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// SubAdmin routes
app.use('/api/subadmin', subAdminRoutes);

// User routes
app.use('/api/user', userRoutes);

// Payment routes ✅
app.use('/api/payment', paymentRoutes);

// ========================================
// BASIC TEST ROUTE
// ========================================
app.get('/', (req, res) => {
  res.json({
    message: "USCIS Forms Application Backend Server",
    status: "running ✅",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      admin: "/api/admin",
      subadmin: "/api/subadmin",
      user: "/api/user",
      payment: "/api/payment"
    }
  });
});

// ========================================
// ERROR HANDLING
// ========================================
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// ========================================
// START SERVER
// ========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🚀 USCIS Forms Backend Server`);
  console.log(`📡 Running on: http://localhost:${PORT}`);
  console.log(`✅ Database: Connected`);
  console.log(`💳 Payments: Stripe Enabled`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

module.exports = app;
