const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const emailUtil = require('../utils/email');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');


/**
 * REGISTER - UPDATED TO ACCEPT BOTH fullName AND full_name
 */
exports.register = async (req, res) => {
  try {
    // ✅ Accept both camelCase and snake_case
    const fullName = req.body.fullName || req.body.full_name;
    const { email, password, role } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ 
        success: false,
        error: 'All fields are required (fullName/full_name, email, password, role)' 
      });
    }


    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ 
        success: false,
        error: 'Email already exists' 
      });
    }


    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);


    const newUser = await pool.query(
      'INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, full_name, email, role',
      [fullName, email, password_hash, role]
    );


    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60000); // 15 minutes from now


    await pool.query(
      'INSERT INTO email_verifications (user_id, code, expires_at) VALUES ($1, $2, $3)',
      [newUser.rows[0].id, code, expiresAt]
    );


    try {
      await emailUtil.sendVerification(email, code);
      console.log('✅ Verification email sent to:', email);
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError.message);
      // Continue registration even if email fails
    }


    res.status(201).json({
      success: true,
      user: newUser.rows[0],
      message: 'Verification code sent to your email'
    });
  } catch (e) {
    console.error('❌ Registration error:', e);
    res.status(500).json({ 
      success: false,
      error: 'Registration failed: ' + e.message 
    });
  }
};


/**
 * VERIFY EMAIL
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;


    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }


    const userId = userRes.rows[0].id;


    const codeRes = await pool.query(
      'SELECT * FROM email_verifications WHERE user_id = $1 AND code = $2 AND expires_at > NOW()',
      [userId, code]
    );


    if (codeRes.rows.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid or expired code' 
      });
    }


    await pool.query('UPDATE users SET email_verified = TRUE WHERE id = $1', [userId]);
    await pool.query('DELETE FROM email_verifications WHERE user_id = $1', [userId]);


    res.json({ 
      success: true,
      message: 'Email verified successfully' 
    });
  } catch (e) {
    console.error('❌ Email verification error:', e);
    res.status(500).json({ 
      success: false,
      error: 'Verification failed: ' + e.message 
    });
  }
};


/**
 * LOGIN - SUPPORTS USERS, SUBADMINS, AND ADMIN
 */
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;


    console.log('🔐 Login attempt:', email, 'Role:', role);


    // Step 1: Try to find user in users table
    let userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = null;
    let userType = null;


    if (userRes.rows.length > 0) {
      user = userRes.rows[0];
      userType = 'user';
      console.log('✅ Found in users table:', user.role);
    } else {
      // Step 2: Try to find in subadmins table
      const subAdminRes = await pool.query('SELECT * FROM subadmins WHERE email = $1', [email]);

      if (subAdminRes.rows.length > 0) {
        user = subAdminRes.rows[0];
        userType = 'subadmin';
        console.log('✅ Found in subadmins table');

        // Normalize subadmin fields to match user fields
        user.full_name = user.name;
        user.role = 'subadmin';
        user.email_verified = true;
        user.password_hash = user.passwordhash || user.password_hash;
      }
    }


    // Step 3: If user not found in either table
    if (!user) {
      console.log('❌ User not found in any table');
      return res.status(401).json({ 
        success: false,
        error: 'Invalid email or password' 
      });
    }


    // Step 4: Check if role matches (if role specified)
    if (role && user.role !== role) {
      console.log('❌ Role mismatch:', user.role, '!==', role);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid email or password' 
      });
    }


    // Step 5: Check email verification (only for regular users)
    if (userType === 'user' && !user.email_verified && user.role !== 'admin') {
      console.log('⚠️ Email not verified');
      return res.status(403).json({ 
        success: false,
        error: 'Email not verified. Please check your inbox.' 
      });
    }


    // Step 6: Check password
    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      console.log('❌ Password mismatch');
      return res.status(401).json({ 
        success: false,
        error: 'Invalid email or password' 
      });
    }


    // Step 7: Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        userId: user.id,
        email: user.email,
        role: user.role,
        userType: userType
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );


    console.log('✅ Login successful:', { email: user.email, role: user.role, userType });


    // Step 8: Return success
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        userType: userType
      }
    });


  } catch (e) {
    console.error('❌ Login error:', e);
    res.status(500).json({ 
      success: false,
      error: 'Login failed: ' + e.message 
    });
  }
};


/**
 * REQUEST PASSWORD RESET
 */
exports.requestReset = async (req, res) => {
  try {
    const { email } = req.body;
    const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    if (userRes.rows.length === 0) {
      // Don't reveal if email exists
      return res.json({ 
        success: true,
        message: 'If an account exists, a reset code will be sent to your email' 
      });
    }


    const code = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 15 * 60000); // 15 min expiry


    await pool.query(
      'UPDATE users SET reset_code = $1, reset_code_expires = $2 WHERE email = $3',
      [code, expires, email]
    );


    try {
      await emailUtil.sendMail(email, 'Your reset code', `Your password reset code is ${code}. It expires in 15 minutes.`);
      console.log('✅ Reset code sent to:', email);
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError.message);
    }


    res.json({ 
      success: true,
      message: 'If an account exists, a reset code will be sent to your email' 
    });
  } catch (e) {
    console.error('❌ Request reset error:', e);
    res.status(500).json({ 
      success: false,
      error: 'Failed to send reset code: ' + e.message 
    });
  }
};


/**
 * VERIFY RESET CODE
 */
exports.verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await pool.query(
      'SELECT reset_code, reset_code_expires FROM users WHERE email = $1',
      [email]
    );


    if (user.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Email not found' 
      });
    }


    const valid = user.rows[0].reset_code === code && new Date() < new Date(user.rows[0].reset_code_expires);
    res.json({ 
      success: true,
      valid 
    });
  } catch (e) {
    console.error('❌ Verify reset code error:', e);
    res.status(500).json({ 
      success: false,
      error: 'Verification failed: ' + e.message 
    });
  }
};


/**
 * RESET PASSWORD
 */
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const user = await pool.query(
      'SELECT reset_code, reset_code_expires FROM users WHERE email = $1',
      [email]
    );


    if (user.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Email not found' 
      });
    }


    const valid = user.rows[0].reset_code === code && new Date() < new Date(user.rows[0].reset_code_expires);
    if (!valid) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid or expired code' 
      });
    }


    const hash = bcrypt.hashSync(newPassword, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_code = NULL, reset_code_expires = NULL WHERE email = $2',
      [hash, email]
    );


    res.json({ 
      success: true,
      message: 'Password reset successful' 
    });
  } catch (e) {
    console.error('❌ Reset password error:', e);
    res.status(500).json({ 
      success: false,
      error: 'Password reset failed: ' + e.message 
    });
  }
};
