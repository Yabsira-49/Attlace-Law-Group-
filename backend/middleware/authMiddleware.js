/**
 * AUTH MIDDLEWARE
 * JWT authentication and authorization
 * Path: C:\Users\49\uscis-multi-role-app\backend\middleware\authMiddleware.js
 */

const jwt = require('jsonwebtoken');

/**
 * Authenticate JWT token
 */
function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ 
            success: false,
            error: "No authorization token provided" 
        });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false,
            error: "Invalid authorization format. Use: Bearer TOKEN" 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false,
                error: "Invalid or expired token" 
            });
        }

        req.user = user;
        next();
    });
}

/**
 * Alias for authenticateJWT (for compatibility with different naming)
 */
const authenticateToken = authenticateJWT;

/**
 * Require specific role middleware
 */
function requireRole(role) {
    return function (req, res, next) {
        if (!req.user) {
            return res.status(401).json({ 
                success: false,
                error: "Authentication required" 
            });
        }

        if (req.user.role !== role) {
            return res.status(403).json({ 
                success: false,
                error: "Forbidden: insufficient permissions" 
            });
        }

        next();
    };
}

/**
 * Require admin role
 */
function requireAdmin(req, res, next) {
    return requireRole('admin')(req, res, next);
}

/**
 * Require subadmin role
 */
function requireSubAdmin(req, res, next) {
    return requireRole('subadmin')(req, res, next);
}

/**
 * Require user role
 */
function requireUser(req, res, next) {
    return requireRole('user')(req, res, next);
}

// Export all functions
module.exports = { 
    authenticateJWT,
    authenticateToken,  // ← CRITICAL: This export was missing!
    requireRole,
    requireAdmin,
    requireSubAdmin,
    requireUser
};
