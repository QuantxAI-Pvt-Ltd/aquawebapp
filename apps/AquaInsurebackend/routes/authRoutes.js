const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Farmer = require('../models/Farmer');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme-secret';
const JWT_EXPIRES = '30d';

// @route   POST /api/auth/register
// @desc    Register a new user with phone, optional email, and password
router.post('/register', async (req, res) => {
    try {
        console.log('[Register] start body:', req.body.phone);
        const { phone, email, password } = req.body;

        if (!phone || !password) {
            return res.status(400).json({ success: false, error: 'Phone and password are required' });
        }
        if (!/^[0-9]{10}$/.test(phone)) {
            return res.status(400).json({ success: false, error: 'Phone must be a 10-digit number' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
        }

        console.log('[Register] checking existing user');
        const existing = await User.findOne({ phone });
        if (existing) {
            console.log('[Register] user exists!');
            return res.status(409).json({ success: false, error: 'Phone number already registered' });
        }

        console.log('[Register] handling Farmer profile');
        // Legacy farmers might exist without a User doc.
        let farmer = await Farmer.findOne({ phone });
        if (!farmer) {
            farmer = await Farmer.create({
                phone,
                name: 'New Farmer',
                fatherName: 'N/A',
                address: { village: '-', taluk: '-', district: '-', state: '-', pinCode: '000000' }
            });
        }

        console.log('[Register] creating and saving User model');
        const user = new User({ phone, email: email || undefined, passwordHash: password, farmerId: farmer._id });
        await user.save(); // passwordHash is hashed in pre-save hook

        console.log('[Register] signing token');
        const token = jwt.sign({ userId: user._id, farmerId: farmer._id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

        console.log('[Register] sending response');
        res.status(201).json({
            success: true,
            token,
            farmerId: farmer._id,
            isNewFarmer: true
        });
    } catch (err) {
        console.error('Error in POST /api/auth/register:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// @route   POST /api/auth/login
// @desc    Login with phone or email + password, returns JWT
router.post('/login', async (req, res) => {
    try {
        const { phone, email, password } = req.body;

        if (!password || (!phone && !email)) {
            return res.status(400).json({ success: false, error: 'Phone (or email) and password are required' });
        }

        const query = phone ? { phone } : { email: email.toLowerCase() };
        const user = await User.findOne(query);

        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const valid = await user.comparePassword(password);
        if (!valid) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // Check if farmer profile is complete
        let isNewFarmer = false;
        let farmerName = null;
        if (user.farmerId) {
            const farmer = await Farmer.findById(user.farmerId).select('name').lean();
            isNewFarmer = !farmer || farmer.name === 'New Farmer';
            farmerName = farmer && farmer.name !== 'New Farmer' ? farmer.name : null;
        } else {
            isNewFarmer = true;
        }

        const token = jwt.sign({ userId: user._id, farmerId: user.farmerId, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

        res.status(200).json({
            success: true,
            token,
            farmerId: user.farmerId,
            isNewFarmer,
            name: farmerName
        });
    } catch (err) {
        console.error('Error in POST /api/auth/login:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
