const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use((req, res, next) => {
  console.log(`[>>] ${req.method} ${req.url}`);
  next();
});
app.use(cors());
// Built-in middleware to handle huge files/BinData parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

// Basic route
app.get('/', (req, res) => {
    res.send('AquaInsure API is running...');
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, console.log(`Server running on port ${PORT}` ));
