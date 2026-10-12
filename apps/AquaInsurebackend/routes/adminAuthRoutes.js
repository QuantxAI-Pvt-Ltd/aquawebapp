const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin-changeme-secret';
const ADMIN_JWT_EXPIRES = process.env.ADMIN_JWT_EXPIRES_IN || '8h';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * POST /api/admin/login
 * Validates admin credentials from .env and returns a signed admin JWT.
 */
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            error: 'Username and password are required.',
        });
    }

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        return res.status(401).json({
            success: false,
            error: 'Invalid admin credentials.',
        });
    }

    const token = jwt.sign(
        { username: ADMIN_USERNAME, role: 'admin' },
        ADMIN_JWT_SECRET,
        { expiresIn: ADMIN_JWT_EXPIRES }
    );

    res.json({
        success: true,
        token,
        username: ADMIN_USERNAME,
        expiresIn: ADMIN_JWT_EXPIRES,
    });
});

/**
 * POST /api/admin/logout
 * Stateless logout — client clears local storage. Kept for completeness.
 */
router.post('/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully.' });
});

module.exports = router;
