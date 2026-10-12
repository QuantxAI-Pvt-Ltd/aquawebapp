const jwt = require('jsonwebtoken');

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin-changeme-secret';

/**
 * Middleware to verify Admin JWT tokens.
 * Protects all /api/dashboard/* and /api/admin/* routes.
 * Token must be signed with the ADMIN_JWT_SECRET and carry role: 'admin'.
 */
function requireAdminAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Admin authentication required. No Bearer token provided.',
            code: 'ERR_ADMIN_UNAUTHORIZED',
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, ADMIN_JWT_SECRET);

        if (decoded.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Admin role required.',
                code: 'ERR_ADMIN_FORBIDDEN',
            });
        }

        req.admin = decoded; // { username, role, iat, exp }
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Admin session has expired. Please log in again.',
                code: 'ERR_ADMIN_TOKEN_EXPIRED',
            });
        }
        return res.status(401).json({
            success: false,
            error: 'Invalid or malformed admin token.',
            code: 'ERR_ADMIN_TOKEN_INVALID',
        });
    }
}

module.exports = { requireAdminAuth };
