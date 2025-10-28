const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ==========================================
// USER MANAGEMENT
// ==========================================

exports.listUsers = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "Only admin can view users" });
        }
        const users = await pool.query(
            "SELECT id, full_name, email, role, status, email_verified, created_at FROM users WHERE role='user' ORDER BY created_at DESC"
        );
        res.json({ users: users.rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to list users" });
    }
};

exports.searchUsers = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "Only admin can search users" });
        }
        let { query, status, from, to } = req.query;
        let sql = "SELECT id, full_name, email, role, status, email_verified, created_at FROM users WHERE role='user'";
        let values = [];
        let conditions = [];

        if (query) {
            values.push(`%${query.toLowerCase()}%`);
            conditions.push(`(LOWER(full_name) LIKE $${values.length} OR LOWER(email) LIKE $${values.length})`);
        }
        if (status) {
            values.push(status);
            conditions.push(`status = $${values.length}`);
        }
        if (from) {
            values.push(from);
            conditions.push(`created_at >= $${values.length}`);
        }
        if (to) {
            values.push(to);
            conditions.push(`created_at <= $${values.length}`);
        }
        if (conditions.length) sql += ' AND ' + conditions.join(' AND ');
        sql += ' ORDER BY created_at DESC';

        const users = await pool.query(sql, values);
        res.json({ users: users.rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "User search failed" });
    }
};

exports.setUserStatus = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "Only admin can change user status" });
        }
        const { id } = req.params;
        const { status } = req.body;
        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({ error: "Status must be 'active' or 'inactive'" });
        }
        const result = await pool.query(
            "UPDATE users SET status=$1 WHERE id=$2 AND role='user' RETURNING id, status", 
            [status, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({ message: `User status set to ${status}`, user: result.rows[0] });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to change user status" });
    }
};

exports.getUserForms = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "Only admin can view user forms" });
        }
        const { id } = req.params;
        const user = await pool.query("SELECT id, full_name, email FROM users WHERE id=$1", [id]);
        if (user.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        const forms = await pool.query(
            "SELECT id, form_type, status, created_at, exported_pdf_path FROM forms WHERE user_id=$1 ORDER BY created_at DESC",
            [id]
        );
        res.json({ user: user.rows[0], forms: forms.rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to get user forms" });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admin can delete users' });
        }

        const { id } = req.params;

        const userCheck = await pool.query(
            'SELECT id, full_name, email, role, email_verified FROM users WHERE id = $1',
            [id]
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userCheck.rows[0];

        if (user.role === 'admin' || user.role === 'subadmin') {
            return res.status(403).json({ error: 'Cannot delete admin or subadmin accounts' });
        }

        console.log(`🗑️ Deleting user: ${user.email}`);

        await pool.query('DELETE FROM forms WHERE user_id = $1', [id]);
        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 AND role = $2 RETURNING id, full_name, email',
            [id, 'user']
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found or cannot be deleted' });
        }

        console.log(`✅ User deleted: ${result.rows[0].email}`);
        res.json({ 
            message: 'User deleted successfully',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

exports.deleteUnverifiedUsers = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admin can perform this action' });
        }

        const unverifiedUsers = await pool.query(
            'SELECT id FROM users WHERE email_verified = false AND role = $1',
            ['user']
        );

        console.log(`🗑️ Found ${unverifiedUsers.rows.length} unverified users`);

        let deletedCount = 0;

        for (const user of unverifiedUsers.rows) {
            await pool.query('DELETE FROM forms WHERE user_id = $1', [user.id]);
            await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
            deletedCount++;
        }

        console.log(`✅ Deleted ${deletedCount} unverified users`);

        res.json({
            message: `Successfully deleted ${deletedCount} unverified users`,
            count: deletedCount
        });

    } catch (error) {
        console.error('❌ Bulk delete error:', error);
        res.status(500).json({ error: 'Failed to delete unverified users' });
    }
};

// ==========================================
// ANALYTICS
// ==========================================

exports.getAnalytics = async (req, res) => {
    try {
        console.log('📊 Fetching analytics data...');

        const totalUsersRes = await pool.query(
            'SELECT COUNT(*) FROM users WHERE role = $1',
            ['user']
        );
        const totalUsers = parseInt(totalUsersRes.rows[0].count);

        const totalFormsRes = await pool.query('SELECT COUNT(*) FROM forms');
        const totalForms = parseInt(totalFormsRes.rows[0].count);

        const approvedFormsRes = await pool.query(
            'SELECT COUNT(*) FROM forms WHERE status = $1',
            ['approved']
        );
        const approvedForms = parseInt(approvedFormsRes.rows[0].count);

        const pendingFormsRes = await pool.query(
            'SELECT COUNT(*) FROM forms WHERE status = $1',
            ['pending']
        );
        const pendingForms = parseInt(pendingFormsRes.rows[0].count);

        const userRegistrationsRes = await pool.query(`
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM users
            WHERE created_at >= NOW() - INTERVAL '7 days'
              AND role = 'user'
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at)
        `);
        const userRegistrations = userRegistrationsRes.rows;

        const formsByTypeRes = await pool.query(`
            SELECT form_type as type, COUNT(*) as count
            FROM forms
            GROUP BY form_type
            ORDER BY count DESC
        `);
        const formsByType = formsByTypeRes.rows;

        const formsByStatusRes = await pool.query(`
            SELECT status, COUNT(*) as count
            FROM forms
            GROUP BY status
            ORDER BY 
              CASE status
                WHEN 'approved' THEN 1
                WHEN 'pending' THEN 2
                WHEN 'rejected' THEN 3
                ELSE 4
              END
        `);
        const formsByStatus = formsByStatusRes.rows;

        const monthlyFormsRes = await pool.query(`
            SELECT 
              TO_CHAR(created_at, 'Mon YYYY') as month,
              COUNT(*) as count
            FROM forms
            WHERE created_at >= NOW() - INTERVAL '6 months'
            GROUP BY 
              TO_CHAR(created_at, 'Mon YYYY'),
              DATE_TRUNC('month', created_at)
            ORDER BY DATE_TRUNC('month', created_at)
        `);
        const monthlyForms = monthlyFormsRes.rows;

        console.log('✅ Analytics data prepared');

        res.json({
            totalUsers,
            totalForms,
            approvedForms,
            pendingForms,
            userRegistrations,
            formsByType,
            formsByStatus,
            monthlyForms
        });

    } catch (e) {
        console.error('❌ Analytics error:', e);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
};

exports.formStats = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "Only admin can view form stats" });
        }
        
        const totalRes = await pool.query("SELECT COUNT(*) AS total FROM forms");
        const total = parseInt(totalRes.rows[0].total, 10);

        const approvedRes = await pool.query("SELECT COUNT(*) AS count FROM forms WHERE status='approved'");
        const pendingRes = await pool.query("SELECT COUNT(*) AS count FROM forms WHERE status='pending'");
        const rejectedRes = await pool.query("SELECT COUNT(*) AS count FROM forms WHERE status='rejected'");

        res.json({
            totalForms: total,
            approved: parseInt(approvedRes.rows[0].count, 10),
            pending: parseInt(pendingRes.rows[0].count, 10),
            rejected: parseInt(rejectedRes.rows[0].count, 10)
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to get form stats" });
    }
};

exports.formsPerUser = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "Only admin can view form counts per user" });
        }
        const result = await pool.query(`
            SELECT u.id, u.full_name, u.email, COUNT(f.id) AS form_count
            FROM users u
            LEFT JOIN forms f ON u.id = f.user_id
            WHERE u.role = 'user'
            GROUP BY u.id, u.full_name, u.email
            ORDER BY form_count DESC
        `);
        res.json({ users: result.rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to get forms per user" });
    }
};

// ==========================================
// FORM PRICING
// ==========================================

exports.setFormPrice = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "Only admin can set prices" });
        }
        const { form_type, price } = req.body;
        if (!form_type || isNaN(price)) {
            return res.status(400).json({ error: "Invalid form type or price" });
        }
        const result = await pool.query(
            `INSERT INTO form_pricing (form_type, price) VALUES ($1, $2)
             ON CONFLICT (form_type) DO UPDATE SET price=$2, updated_at=NOW()
             RETURNING form_type, price, updated_at`,
            [form_type, price]
        );
        res.json({ message: "Price updated", pricing: result.rows[0] });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to set price" });
    }
};

exports.listFormPrices = async (req, res) => {
    try {
        const prices = await pool.query("SELECT form_type, price, updated_at FROM form_pricing ORDER BY form_type");
        res.json({ prices: prices.rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to get form prices" });
    }
};

// ==========================================
// FORM HISTORY
// ==========================================

exports.formHistory = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "Only admin can view form history" });
        }
        const { form_type, user_id, from, to } = req.query;
        let sql = "SELECT f.id, f.form_type, f.status, f.created_at, f.exported_pdf_path, u.full_name, u.email FROM forms f JOIN users u ON f.user_id = u.id WHERE 1=1";
        let values = [];
        let c = 1;
        if (form_type) {
            sql += ` AND f.form_type = $${c++}`;
            values.push(form_type);
        }
        if (user_id) {
            sql += ` AND f.user_id = $${c++}`;
            values.push(user_id);
        }
        if (from) {
            sql += ` AND f.created_at >= $${c++}`;
            values.push(from);
        }
        if (to) {
            sql += ` AND f.created_at <= $${c++}`;
            values.push(to);
        }
        sql += ' ORDER BY f.created_at DESC';
        const result = await pool.query(sql, values);
        res.json({ forms: result.rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to load form history" });
    }
};

// ==========================================
// PROFILE & SETTINGS
// ==========================================

exports.updateProfile = async (req, res) => {
    try {
        const { fullName, email } = req.body;
        const userId = req.user.userId;

        if (!fullName || !email) {
            return res.status(400).json({ error: 'Full name and email required' });
        }

        const currentUser = await pool.query(
            'SELECT email FROM users WHERE id = $1',
            [userId]
        );

        if (currentUser.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (email !== currentUser.rows[0].email) {
            const emailExists = await pool.query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email, userId]
            );

            if (emailExists.rows.length > 0) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }

        const result = await pool.query(
            'UPDATE users SET full_name = $1, email = $2 WHERE id = $3 RETURNING id, full_name, email, role',
            [fullName, email, userId]
        );

        res.json({
            message: 'Profile updated successfully',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

exports.changePassword = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "Only admin can change own password" });
        }
        const { old_password, new_password } = req.body;
        if (!old_password || !new_password) {
            return res.status(400).json({ error: "Both old and new password required" });
        }
        const adminId = req.user.userId;
        const query = await pool.query("SELECT password_hash FROM users WHERE id=$1 AND role='admin'", [adminId]);
        if (query.rows.length === 0) {
            return res.status(404).json({ error: "Admin not found" });
        }
        const valid = bcrypt.compareSync(old_password, query.rows[0].password_hash);
        if (!valid) {
            return res.status(401).json({ error: "Current password is incorrect" });
        }
        const newHash = bcrypt.hashSync(new_password, 10);
        await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2 AND role='admin'", [newHash, adminId]);
        res.json({ message: "Password changed successfully" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to change password" });
    }
};

exports.updateStripeKey = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "Only admin can update Stripe key" });
        }
        const { stripe_key, password } = req.body;
        if (!stripe_key || !password) {
            return res.status(400).json({ error: "Both stripe_key and password required" });
        }
        const adminId = req.user.userId;
        const query = await pool.query("SELECT password_hash FROM users WHERE id=$1 AND role='admin'", [adminId]);
        if (query.rows.length === 0) {
            return res.status(404).json({ error: "Admin not found" });
        }
        const valid = bcrypt.compareSync(password, query.rows[0].password_hash);
        if (!valid) {
            return res.status(401).json({ error: "Password is incorrect" });
        }
        await pool.query("UPDATE users SET stripe_key=$1 WHERE id=$2", [stripe_key, adminId]);
        res.json({ message: "Stripe key updated successfully" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to update Stripe key" });
    }
};

// ==========================================
// SYSTEM LOGS
// ==========================================

exports.viewLogs = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "Only admin can view logs" });
        }
        const logs = await pool.query(
            "SELECT actor_id, actor_role, activity_type, details, created_at FROM system_logs ORDER BY created_at DESC LIMIT 100"
        );
        res.json({ logs: logs.rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to retrieve logs" });
    }
};

// ========================================
// ADD THESE FUNCTIONS TO adminController.js
// ========================================

/**
 * Get Stripe settings
 * GET /api/admin/settings/stripe
 */
exports.getStripeSettings = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT stripe_publishable_key FROM admin_settings LIMIT 1'
        );

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                stripe_publishable_key: null
            });
        }

        res.json({
            success: true,
            stripe_publishable_key: result.rows[0].stripe_publishable_key
        });

    } catch (error) {
        console.error('❌ Error getting Stripe settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve Stripe settings'
        });
    }
};

/**
 * Update Stripe settings
 * POST /api/admin/settings/stripe
 */
exports.updateStripeSettings = async (req, res) => {
    try {
        const { stripe_secret_key, stripe_publishable_key } = req.body;

        if (!stripe_secret_key || !stripe_publishable_key) {
            return res.status(400).json({
                success: false,
                error: 'Both Stripe keys are required'
            });
        }

        // Validate secret key format
        if (!stripe_secret_key.startsWith('sk_')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Stripe secret key format'
            });
        }

        // Validate publishable key format
        if (!stripe_publishable_key.startsWith('pk_')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Stripe publishable key format'
            });
        }

        // Update or insert settings
        await pool.query(
            `INSERT INTO admin_settings (id, stripe_secret_key, stripe_publishable_key, updated_at)
            VALUES (1, $1, $2, NOW())
            ON CONFLICT (id) 
            DO UPDATE SET 
                stripe_secret_key = $1,
                stripe_publishable_key = $2,
                updated_at = NOW()`,
            [stripe_secret_key, stripe_publishable_key]
        );

        res.json({
            success: true,
            message: 'Stripe settings updated successfully'
        });

    } catch (error) {
        console.error('❌ Error updating Stripe settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update Stripe settings'
        });
    }
};
