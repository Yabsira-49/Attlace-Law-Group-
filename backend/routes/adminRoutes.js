/**
 * ADMIN ROUTES - CLEAN & COMPLETE
 */

const express = require('express');
const router = express.Router();
const { authenticateJWT, requireRole } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

// ========= Middleware for all routes =========
router.use(authenticateJWT);
router.use(requireRole('admin'));

// ========= User Management =========
router.get('/users', adminController.listUsers);
router.get('/users/search', adminController.searchUsers);
router.patch('/users/status/:id', adminController.setUserStatus);
router.get('/users/:id/forms', adminController.getUserForms);
router.delete('/users/:id', adminController.deleteUser);
router.delete('/users/unverified', adminController.deleteUnverifiedUsers);

// ========= Analytics =========
router.get('/analytics', adminController.getAnalytics);
router.get('/forms/stats', adminController.formStats);
router.get('/forms/per-user', adminController.formsPerUser);

// ========= Form Pricing =========
router.post('/forms/pricing', adminController.setFormPrice);
router.get('/forms/pricing', adminController.listFormPrices);

// ========= Form History =========
router.get('/forms/history', adminController.formHistory);

// ========= Profile & Settings =========
router.patch('/profile', adminController.updateProfile);
router.patch('/profile/password', adminController.changePassword);
router.patch('/profile/stripe-key', adminController.updateStripeKey);

// ========= System Logs =========
router.get('/logs', adminController.viewLogs);


// Stripe Settings
router.get('/settings/stripe', adminController.getStripeSettings);
router.post('/settings/stripe', adminController.updateStripeSettings);



module.exports = router;
