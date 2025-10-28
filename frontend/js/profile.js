/**
 * PROFILE JAVASCRIPT - FIXED VERSION
 * Admin profile management
 * Save to: C:\Users\49\uscis-multi-role-app\frontend\js\profile.js
 */

// Global token variable (unique name to avoid conflicts)
let profileToken = null;
let profileUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('👤 Profile Initializing...');
    
    // Auth check
    const token = localStorage.getItem('authToken');
    const userInfo = localStorage.getItem('userInfo');
    
    if (!token || !userInfo) {
        console.warn('⚠️ No auth credentials');
        window.location.href = '../public/login.html';
        return;
    }

    // Store token globally
    profileToken = token;

    try {
        profileUser = JSON.parse(userInfo);
        if (profileUser.role !== 'admin') {
            console.warn('⚠️ User is not admin');
            window.location.href = '../public/login.html';
            return;
        }

        // Pre-fill form with current user data
        document.getElementById('fullName').value = profileUser.fullName || profileUser.full_name || '';
        document.getElementById('email').value = profileUser.email || '';

    } catch (error) {
        console.error('❌ Parse error:', error);
        window.location.href = '../public/login.html';
        return;
    }

    console.log('✅ Auth check passed');

    // Form handlers
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateProfile();
    });

    document.getElementById('passwordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await changePassword();
    });
});

/**
 * Update Profile (Name and Email)
 */
async function updateProfile() {
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();

    // Validation
    if (!fullName || !email) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }

    try {
        console.log('💾 Updating profile...');

        const response = await fetch('http://localhost:5000/api/admin/profile', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${profileToken}`
            },
            body: JSON.stringify({ fullName, email })
        });

        if (!response.ok) {
            if (response.status === 401) {
                handleUnauthorized();
                return;
            }
            const error = await response.json();
            throw new Error(error.error || 'Failed to update profile');
        }

        const data = await response.json();
        console.log('✅ Profile updated:', data);

        // Update localStorage with new data
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        userInfo.fullName = fullName;
        userInfo.full_name = fullName;
        userInfo.email = email;
        localStorage.setItem('userInfo', JSON.stringify(userInfo));

        showNotification('Profile updated successfully!', 'success');

    } catch (error) {
        console.error('❌ Failed to update profile:', error);
        showNotification(error.message || 'Failed to update profile', 'error');
    }
}

/**
 * Change Password
 * FIXED: Now sends old_password and new_password to match backend
 */
async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('Please fill in all password fields', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showNotification('New passwords do not match', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showNotification('Password must be at least 6 characters long', 'error');
        return;
    }

    if (currentPassword === newPassword) {
        showNotification('New password must be different from current password', 'error');
        return;
    }

    try {
        console.log('🔒 Changing password...');

        // FIXED: Backend expects old_password and new_password
        const response = await fetch('http://localhost:5000/api/admin/profile/password', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${profileToken}`
            },
            body: JSON.stringify({ 
                old_password: currentPassword,
                new_password: newPassword 
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                handleUnauthorized();
                return;
            }
            const error = await response.json();
            throw new Error(error.error || 'Failed to change password');
        }

        const data = await response.json();
        console.log('✅ Password changed:', data);

        showNotification('Password changed successfully!', 'success');
        
        // Clear password form
        document.getElementById('passwordForm').reset();

    } catch (error) {
        console.error('❌ Failed to change password:', error);
        showNotification(error.message || 'Failed to change password', 'error');
    }
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Handle unauthorized access
 */
function handleUnauthorized() {
    console.error('❌ Unauthorized - token may be expired');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    showNotification('Session expired. Please login again.', 'error');
    setTimeout(() => {
        window.location.href = '../public/login.html';
    }, 2000);
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#1a3a52',
        warning: '#f59e0b'
    };

    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 9999;
        font-weight: 500;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

console.log('✅ Profile script loaded');
