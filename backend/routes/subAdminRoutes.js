const express = require('express');
const router = express.Router();
const { authenticateJWT, requireRole } = require('../middleware/authMiddleware');
const subAdminController = require('../controllers/subAdminController');

router.post('/create', authenticateJWT, requireRole('admin'), subAdminController.createSubAdmin);
router.get('/list', authenticateJWT, requireRole('admin'), subAdminController.listSubAdmins);
router.delete('/delete/:id', authenticateJWT, requireRole('admin'), subAdminController.deleteSubAdmin);

module.exports = router;
