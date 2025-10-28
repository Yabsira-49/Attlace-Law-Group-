const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// NO AUTH for testing
router.post('/create-checkout-session', paymentController.createCheckoutSession);
router.post('/webhook', paymentController.handleWebhook);
router.get('/status/:formSubmissionId', paymentController.getPaymentStatus);
router.get('/verify/:formSubmissionId', paymentController.verifyPayment);

module.exports = router;
