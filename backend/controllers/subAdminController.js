const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

exports.createSubAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const created_by = req.user.userId; // pulled from JWT middleware
        // Check if admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "Only admin can create sub-admins" });
        }
        const existing = await pool.query('SELECT * FROM subadmins WHERE email=$1', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: "Sub-admin email already exists" });
        }
        const hash = bcrypt.hashSync(password, 10);
        const newSubAdmin = await pool.query(
            'INSERT INTO subadmins (name, email, password_hash, created_by) VALUES ($1, $2, $3, $4) RETURNING id, name, email',
            [name, email, hash, created_by]
        );
        res.status(201).json({ subAdmin: newSubAdmin.rows[0] });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Sub-admin creation failed" });
    }
};


exports.listSubAdmins = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "Only admin can view sub-admins" });
        }
        const subs = await pool.query('SELECT id, name, email, created_at FROM subadmins ORDER BY created_at DESC');
        res.json({ subAdmins: subs.rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to list sub-admins" });
    }
};
 
exports.deleteSubAdmin = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "Only admin can delete sub-admins" });
        }
        const subAdminId = req.params.id;
        const result = await pool.query('DELETE FROM subadmins WHERE id=$1 RETURNING id', [subAdminId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Sub-admin not found" });
        }
        res.json({ message: "Sub-admin deleted successfully" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to delete sub-admin" });
    }
};
