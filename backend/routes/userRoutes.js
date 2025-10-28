/**
 * USER ROUTES - COMPLETE FIXED VERSION
 * All routes for regular users including PDF generation
 * Path: C:\Users\49\uscis-multi-role-app\backend\routes\userRoutes.js
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const pdfController = require('../controllers/pdfController');
const { authenticateToken } = require('../middleware/authMiddleware');

// ========================================
// FORM ROUTES (All require authentication)
// ========================================

// GET /api/user/forms - Get available forms
router.get('/forms', authenticateToken, userController.getAvailableForms);

// GET /api/user/forms/pricing - Get form pricing
router.get('/forms/pricing', authenticateToken, userController.getFormPricing);

// POST /api/user/forms/submit - Submit a form
router.post('/forms/submit', authenticateToken, userController.submitForm);

// GET /api/user/forms/history - Get user's submitted forms
router.get('/forms/history', authenticateToken, userController.getFormHistory);

// GET /api/user/forms/:id - Get specific form details
router.get('/forms/:id', authenticateToken, userController.getFormDetails);

// ========================================
// PDF ROUTES
// ========================================

// POST /api/user/forms/:id/generate-pdf - Generate PDF for form
router.post('/forms/:id/generate-pdf', authenticateToken, pdfController.generatePdf);

// GET /api/user/forms/:id/download - Download filled PDF
router.get('/forms/:id/download', authenticateToken, pdfController.downloadPdf);

// ========================================
// PROFILE ROUTES
// ========================================

// GET /api/user/profile - Get user profile
router.get('/profile', authenticateToken, userController.getProfile);

// PATCH /api/user/profile - Update user profile
router.patch('/profile', authenticateToken, userController.updateProfile);

// PATCH /api/user/password - Change password
router.patch('/password', authenticateToken, userController.changePassword);

// POST /api/user/forms/:id/generate-pdf-test - Generate PDF without payment (TEST ONLY)
router.post('/forms/:id/generate-pdf-test', authenticateToken, pdfController.generatePdfTest);

// GET /api/user/forms/:id/download-test - Download PDF (TEST ONLY)
router.get('/forms/:id/download-test', authenticateToken, pdfController.downloadPdfTest);


module.exports = router;
