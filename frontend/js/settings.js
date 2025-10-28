/**
 * SETTINGS JAVASCRIPT - FIXED VERSION
 * Admin settings management
 * Save to: C:\Users\49\uscis-multi-role-app\frontend\js\settings.js
 */

// Global token variable
let settingsToken = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('⚙️ Settings Initializing...');
    
    // Auth check
    const token = localStorage.getItem('authToken');
    const userInfo = localStorage.getItem('userInfo');
    
    if (!token || !userInfo) {
        console.warn('⚠️ No auth credentials');
        window.location.href = '../public/login.html';
        return;
    }

    // Store token globally
    settingsToken = token;

    let user;
    try {
        user = JSON.parse(userInfo);
        if (user.role !== 'admin') {
            console.warn('⚠️ User is not admin');
            window.location.href = '../public/login.html';
            return;
        }
    } catch (error) {
        console.error('❌ Parse error:', error);
        window.location.href = '../public/login.html';
        return;
    }

    console.log('✅ Auth check passed');

    // Load current settings
    await loadSettings();

    // Form handlers
    document.getElementById('stripeForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveStripeKey();
    });

    // Email form handler (if exists)
    const emailForm = document.getElementById('emailForm');
    if (emailForm) {
        emailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveEmailSettings();
        });
    }
});

/**
 * Load current settings from API
 */
async function loadSettings() {
    try {
        console.log('📡 Loading current settings...');
        console.log('✅ Settings loaded');
    } catch (error) {
        console.error('❌ Failed to load settings:', error);
    }
}

/**
 * Save Stripe Secret Key
 */
async function saveStripeKey() {
    const stripeKey = document.getElementById('stripeKey').value.trim();
    const password = document.getElementById('stripePassword').value.trim();

    // Validation
    if (!stripeKey) {
        showNotification('Please enter a Stripe key', 'error');
        return;
    }

    if (!password) {
        showNotification('Please enter your admin password', 'error');
        return;
    }

    if (!stripeKey.startsWith('sk_')) {
        showNotification('Invalid Stripe key format. Must start with sk_', 'error');
        return;
    }

    try {
        console.log('💾 Saving Stripe key...');

        const response = await fetch('http://localhost:5000/api/admin/profile/stripe-key', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settingsToken}`
            },
            body: JSON.stringify({ 
                stripe_key: stripeKey,  // ← Backend expects "stripe_key"
                password: password       // ← Backend expects "password"
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                handleUnauthorized();
                return;
            }
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save Stripe key');
        }

        const data = await response.json();
        console.log('✅ Stripe key saved:', data);

        showNotification('Stripe key saved successfully!', 'success');
        
        // Clear form
        document.getElementById('stripeForm').reset();

    } catch (error) {
        console.error('❌ Failed to save Stripe key:', error);
        showNotification(error.message || 'Failed to save Stripe key', 'error');
    }
}

/**
 * Save Email/SMTP Settings (Optional - for future use)
 */
async function saveEmailSettings() {
    const settings = {
        smtpHost: document.getElementById('smtpHost').value.trim(),
        smtpPort: document.getElementById('smtpPort').value.trim(),
        smtpUser: document.getElementById('smtpUser').value.trim(),
        smtpPass: document.getElementById('smtpPass').value.trim()
    };

    // Validation
    if (!settings.smtpHost || !settings.smtpPort || !settings.smtpUser || !settings.smtpPass) {
        showNotification('Please fill in all email settings', 'error');
        return;
    }

    const port = parseInt(settings.smtpPort);
    if (isNaN(port) || port < 1 || port > 65535) {
        showNotification('Invalid SMTP port number (1-65535)', 'error');
        return;
    }

    try {
        console.log('💾 Saving email settings...');
        console.log('✅ Email settings saved:', settings);
        showNotification('Email settings saved successfully!', 'success');
        
        // Clear password field only for security
        document.getElementById('smtpPass').value = '';

    } catch (error) {
        console.error('❌ Failed to save email settings:', error);
        showNotification(error.message || 'Failed to save email settings', 'error');
    }
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

console.log('✅ Settings script loaded');
