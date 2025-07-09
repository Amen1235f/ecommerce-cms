const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Security middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Static files
app.use('/uploads', express.static('uploads'));

// Test route first
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working' });
});

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Add product routes with error handling
try {
  const productRoutes = require('./routes/product');
  app.use('/api/products', productRoutes);
  console.log('Product routes loaded successfully');
} catch (error) {
  console.error('Error loading product routes:', error);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Example route
app.get('/', (req, res) => {
  res.json({ 
    message: 'E-commerce CMS API',
    version: '1.0.0',
    status: 'Running'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ 
    success: false,
    msg: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
