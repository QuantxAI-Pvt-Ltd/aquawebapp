const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Comprehensive HTTP Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow media to load across origins
    crossOriginEmbedderPolicy: false,
    frameguard: { action: "sameorigin" },
    noSniff: true,
    hsts: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

// Rate Limiting: General API limiter (300 requests per 15 minutes)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    error: 'Too many requests from this IP, please try again later.',
  },
});
app.use('/api', globalLimiter);

// Rate Limiting: Strict Auth limiter for login & registration (15 attempts in prod, 200 in dev)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 15 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    error: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Request Logger
app.use((req, res, next) => {
  console.log(`[>>] ${req.method} ${req.url}`);
  next();
});

// Dynamic CORS configuration from environment
const rawOrigins = process.env.CORS_ALLOWED_ORIGINS || '';
const allowedOrigins = rawOrigins ? rawOrigins.split(',').map(o => o.trim()) : ['*'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Allow during dev, logs if origin not explicitly listed
  },
  credentials: true,
}));

// Built-in middleware with configurable limit
const bodyLimit = process.env.BODY_PARSER_LIMIT || '150mb';
app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

// Import Routes
const authRoutes = require('./routes/authRoutes');
const farmerRoutes = require('./routes/farmerRoutes');
const farmRoutes = require('./routes/farmRoutes');
const insuranceRoutes = require('./routes/insuranceRoutes');
const entryRoutes = require('./routes/entryRoutes');
const exportRoutes = require('./routes/exportRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const mediaRoutes = require('./routes/mediaRoutes');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/farmers', farmerRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/insurances', insuranceRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/media', mediaRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Basic root route
app.get('/', (req, res) => {
  res.send('AquaInsure API is running...');
});

// 404 Fallback Handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    code: 'ERR_NOT_FOUND',
  });
});

// Centralized Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled API Error:', err);

  // Handle Payload Too Large (413)
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      success: false,
      statusCode: 413,
      error: 'Upload payload too large. Please upload smaller images or compress your files.',
      code: 'ERR_PAYLOAD_TOO_LARGE',
    });
  }

  // Handle MongoDB / Cast Errors (400)
  if (err.name === 'CastError' || err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      error: err.message || 'Invalid data format submitted',
      code: 'ERR_VALIDATION',
    });
  }

  // Handle JWT / Auth Errors (401)
  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      error: 'Invalid or expired session token',
      code: 'ERR_UNAUTHORIZED',
    });
  }

  // Generic 500
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    statusCode,
    error: process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred. Please try again later.'
      : err.message || 'Internal Server Error',
    code: err.code || 'ERR_INTERNAL_SERVER',
  });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
