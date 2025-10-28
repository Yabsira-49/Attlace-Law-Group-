const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/verify-email', authController.verifyEmail);
router.post('/login', authController.login);
const { authenticateJWT, requireRole } = require('../middleware/authMiddleware');
router.post('/request-reset', authController.requestReset);
router.post('/verify-reset-code', authController.verifyResetCode);
router.post('/reset-password', authController.resetPassword);

router.get('/private', authenticateJWT, (req, res) => {
    res.json({ message: "Success! You have accessed a protected route.", user: req.user });
});

// Example for admin-only:
router.get('/admin-only', authenticateJWT, requireRole('admin'), (req, res) => {
    res.json({ message: "Welcome, admin!" });
});


module.exports = router;
