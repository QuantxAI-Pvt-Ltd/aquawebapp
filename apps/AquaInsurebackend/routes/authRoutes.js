const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Farmer = require('../models/Farmer');
const Farm = require('../models/Farm');
const Pond = require('../models/Pond');
const Insurance = require('../models/Insurance');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme-secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '30d';

// Helper to determine exact onboarding progress across models
const getFarmerOnboardingStatus = async (farmerId) => {
    if (!farmerId) {
        return { onboardingStep: 'farmer_registration', isProfileComplete: false, farmerName: null, farmData: null };
    }

    const farmer = await Farmer.findById(farmerId).lean();
    if (!farmer || !farmer.name || farmer.name === 'New Farmer') {
        return { onboardingStep: 'farmer_registration', isProfileComplete: false, farmerName: null, farmData: null };
    }

    const farm = await Farm.findOne({ farmerId }).lean();
    const ponds = farm ? await Pond.find({ $or: [{ farmerId }, { farmId: farm._id }] }).sort({ pondNumber: 1 }).lean() : [];
    const insurance = await Insurance.findOne({
        $or: [
            { farmerId },
            ...(farm ? [{ farmId: farm._id }] : [])
        ]
    }).lean();

    const farmData = farm ? {
        farmId: farm._id,
        ponds
    } : null;

    // 1. If insurance policy is already active/registered with farm and ponds, the profile is 100% complete!
    if (insurance && insurance.stockingDate && farm && ponds.length > 0) {
        return { onboardingStep: 'completed', isProfileComplete: true, farmerName: farmer.name, farmData };
    }

    // 2. Step 2: Farmer Address
    const hasAddress = farmer.address && (
        (farmer.address.state && farmer.address.state !== '-') ||
        (farmer.address.district && farmer.address.district !== '-') ||
        (farmer.address.taluk && farmer.address.taluk !== '-') ||
        (farmer.address.village && farmer.address.village !== '-')
    );
    if (!hasAddress) {
        return { onboardingStep: 'farmer_address', isProfileComplete: false, farmerName: farmer.name, farmData: null };
    }

    // 3. Step 3: Farmer KYC
    const hasKyc = farmer.bankDetails?.accountNumber ||
                   farmer.registration?.regNumber ||
                   farmer.identity?.aadharNumber ||
                   farmer.identity?.panNumber;
    if (!hasKyc) {
        return { onboardingStep: 'farmer_kyc', isProfileComplete: false, farmerName: farmer.name, farmData: null };
    }

    // 4. Step 4: Farm Location
    if (!farm) {
        return { onboardingStep: 'farm_registration', isProfileComplete: false, farmerName: farmer.name, farmData: null };
    }
    const hasFarmLocation = farm.location && (
        (farm.location.district && farm.location.district !== '-') ||
        (farm.location.taluk && farm.location.taluk !== '-') ||
        (farm.location.place && farm.location.place !== '-')
    );
    if (!hasFarmLocation) {
        return { onboardingStep: 'farm_registration', isProfileComplete: false, farmerName: farmer.name, farmData: null };
    }

    // 5. Step 5: Farm Setup (ownership, patta, totalPonds)
    const hasPatta = farm.ownership?.patta || farm.patta;
    if (!hasPatta || !farm.totalPonds) {
        return { onboardingStep: 'farm_setup', isProfileComplete: false, farmerName: farmer.name, farmData };
    }

    // 6. Step 6: Insured Ponds
    if (ponds.length === 0) {
        return { onboardingStep: 'insured_ponds', isProfileComplete: false, farmerName: farmer.name, farmData };
    }

    // 7. Step 7: Insurance Registration
    if (!insurance || !insurance.stockingDate) {
        return { onboardingStep: 'insurance_registration', isProfileComplete: false, farmerName: farmer.name, farmData };
    }

    return { onboardingStep: 'completed', isProfileComplete: true, farmerName: farmer.name, farmData };
};

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
            isNewFarmer: true,
            onboardingStep: 'farmer_registration',
            isProfileComplete: false
        });
    } catch (err) {
        console.error('Error in POST /api/auth/register:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// @route   POST /api/auth/login
// @desc    Login with phone or email + password, returns JWT and onboarding step
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

        // Comprehensive onboarding check across Farmer, Farm, Pond, Insurance
        const onboarding = await getFarmerOnboardingStatus(user.farmerId);
        const token = jwt.sign({ userId: user._id, farmerId: user.farmerId, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

        res.status(200).json({
            success: true,
            token,
            farmerId: user.farmerId,
            isNewFarmer: !onboarding.isProfileComplete,
            onboardingStep: onboarding.onboardingStep,
            isProfileComplete: onboarding.isProfileComplete,
            name: onboarding.farmerName,
            farmData: onboarding.farmData
        });
    } catch (err) {
        console.error('Error in POST /api/auth/login:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// @route   GET /api/auth/status
// @desc    Get current authenticated farmer onboarding status and progress
router.get('/status', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'Authorization token required' });
        }

        const token = authHeader.split(' ')[1];
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ success: false, error: 'Invalid or expired token' });
        }

        const onboarding = await getFarmerOnboardingStatus(decoded.farmerId);

        res.json({
            success: true,
            farmerId: decoded.farmerId,
            userId: decoded.userId,
            isNewFarmer: !onboarding.isProfileComplete,
            onboardingStep: onboarding.onboardingStep,
            isProfileComplete: onboarding.isProfileComplete,
            name: onboarding.farmerName,
            farmData: onboarding.farmData
        });
    } catch (err) {
        console.error('Error in GET /api/auth/status:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
