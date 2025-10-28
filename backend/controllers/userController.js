/**
 * USER CONTROLLER
 * Handles all user operations
 * Path: C:\Users\49\uscis-multi-role-app\backend\controllers\userController.js
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// ========================================
// FORM OPERATIONS
// ========================================

/**
 * Get available forms
 * GET /api/user/forms
 */
exports.getAvailableForms = async (req, res) => {
    try {
        const forms = [
            {
                type: 'I-130',
                name: 'Petition for Alien Relative',
                description: 'Used by a U.S. citizen or lawful permanent resident to establish a relationship to certain foreign national relatives who wish to immigrate to the United States.',
                category: 'Family-Based Immigration'
            },
            {
                type: 'I-485',
                name: 'Application to Register Permanent Residence',
                description: 'Used to apply for lawful permanent resident status (green card) while in the United States.',
                category: 'Adjustment of Status'
            },
            {
                type: 'N-400',
                name: 'Application for Naturalization',
                description: 'Used to apply for U.S. citizenship if you meet certain eligibility requirements.',
                category: 'Citizenship'
            },
            {
                type: 'I-765',
                name: 'Application for Employment Authorization',
                description: 'Used to request permission to work in the United States.',
                category: 'Employment Authorization'
            },
            {
                type: 'I-90',
                name: 'Application to Replace Permanent Resident Card',
                description: 'Used to replace, renew, or update your green card.',
                category: 'Green Card Replacement'
            },
            {
                type: 'I-131',
                name: 'Application for Travel Document',
                description: 'Used to apply for a travel document if you are a permanent resident or in another immigration status.',
                category: 'Travel Document'
            }
        ];

        res.json({
            success: true,
            forms
        });

    } catch (error) {
        console.error('❌ Error getting forms:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve forms'
        });
    }
};

/**
 * Get form pricing
 * GET /api/user/forms/pricing
 */
exports.getFormPricing = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT form_type, price FROM form_pricing ORDER BY form_type'
        );

        const pricing = {};
        result.rows.forEach(row => {
            pricing[row.form_type] = parseFloat(row.price);
        });

        res.json({
            success: true,
            pricing
        });

    } catch (error) {
        console.error('❌ Error getting pricing:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve pricing'
        });
    }
};

/**
 * Submit a form
 * POST /api/user/forms/submit
 */
exports.submitForm = async (req, res) => {
    try {
        const { form_type, form_data } = req.body;
        const user_id = req.user.id;

        // Validate input
        if (!form_type || !form_data) {
            return res.status(400).json({
                success: false,
                error: 'Form type and data are required'
            });
        }

        // Get form price
        const priceResult = await pool.query(
            'SELECT price FROM form_pricing WHERE form_type = $1',
            [form_type]
        );

        if (priceResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Form type not found'
            });
        }

        const amount = parseFloat(priceResult.rows[0].price);

        // Insert form submission
        const insertResult = await pool.query(
            `INSERT INTO form_submissions 
            (user_id, form_type, form_data, status, payment_status, amount, created_at) 
            VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
            RETURNING *`,
            [user_id, form_type, JSON.stringify(form_data), 'pending', 'pending', amount]
        );

        const submission = insertResult.rows[0];

        res.status(201).json({
            success: true,
            message: 'Form submitted successfully',
            submission: {
                id: submission.id,
                form_type: submission.form_type,
                status: submission.status,
                payment_status: submission.payment_status,
                amount: submission.amount,
                created_at: submission.created_at
            }
        });

    } catch (error) {
        console.error('❌ Error submitting form:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit form'
        });
    }
};

/**
 * Get user's form history
 * GET /api/user/forms/history
 */
exports.getFormHistory = async (req, res) => {
    try {
        const user_id = req.user.id;

        const result = await pool.query(
            `SELECT 
                id, 
                form_type, 
                status, 
                payment_status, 
                amount, 
                pdf_path,
                created_at,
                updated_at
            FROM form_submissions 
            WHERE user_id = $1 
            ORDER BY created_at DESC`,
            [user_id]
        );

        res.json({
            success: true,
            submissions: result.rows
        });

    } catch (error) {
        console.error('❌ Error getting form history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve form history'
        });
    }
};

/**
 * Get specific form details
 * GET /api/user/forms/:id
 */
exports.getFormDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        const result = await pool.query(
            `SELECT * FROM form_submissions 
            WHERE id = $1 AND user_id = $2`,
            [id, user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Form submission not found'
            });
        }

        res.json({
            success: true,
            submission: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error getting form details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve form details'
        });
    }
};

// ========================================
// PROFILE OPERATIONS
// ========================================

/**
 * Get user profile
 * GET /api/user/profile
 */
exports.getProfile = async (req, res) => {
    try {
        const user_id = req.user.id;

        const result = await pool.query(
            `SELECT 
                id, 
                full_name, 
                email, 
                role, 
                status, 
                email_verified, 
                created_at 
            FROM users 
            WHERE id = $1`,
            [user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error getting profile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve profile'
        });
    }
};

/**
 * Update user profile
 * PATCH /api/user/profile
 */
exports.updateProfile = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { full_name } = req.body;

        if (!full_name) {
            return res.status(400).json({
                success: false,
                error: 'Full name is required'
            });
        }

        const result = await pool.query(
            `UPDATE users 
            SET full_name = $1 
            WHERE id = $2 
            RETURNING id, full_name, email, role, status, email_verified, created_at`,
            [full_name, user_id]
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error updating profile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile'
        });
    }
};

/**
 * Change password
 * PATCH /api/user/password
 */
exports.changePassword = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { current_password, new_password } = req.body;

        // Validate input
        if (!current_password || !new_password) {
            return res.status(400).json({
                success: false,
                error: 'Current password and new password are required'
            });
        }

        if (new_password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 6 characters'
            });
        }

        // Get current password hash
        const userResult = await pool.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [user_id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(
            current_password, 
            userResult.rows[0].password_hash
        );

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }

        // Hash new password
        const saltRounds = 10;
        const new_password_hash = await bcrypt.hash(new_password, saltRounds);

        // Update password
        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [new_password_hash, user_id]
        );

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('❌ Error changing password:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to change password'
        });
    }
};
