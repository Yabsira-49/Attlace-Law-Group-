

/**
 * ADMIN DASHBOARD JAVASCRIPT
 * Connects to Backend API and displays statistics
 * Path: C:\Users\49\uscis-multi-role-app\frontend\js\dashboard.js
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Admin Dashboard Initializing...');
    
    // Auth check
    const token = localStorage.getItem('authToken');
    const userInfo = localStorage.getItem('userInfo');
    
    console.log('🔐 Auth Check:', { 
        hasToken: !!token, 
        hasUserInfo: !!userInfo 
    });

    if (!token || !userInfo) {
        console.warn('⚠️ No auth credentials found');
        window.location.href = '../public/login.html';
        return;
    }

    let user;
    try {
        user = JSON.parse(userInfo);
        console.log('👤 User Info:', { 
            id: user.userId || user.id, 
            role: user.role,
            email: user.email 
        });
        
        if (user.role !== 'admin') {
            console.warn('⚠️ User is not admin, redirecting...');
            window.location.href = '../public/login.html';
            return;
        }
    } catch (error) {
        console.error('❌ Failed to parse user info:', error);
        window.location.href = '../public/login.html';
        return;
    }

    // Display user name
    displayUserInfo(user);

    // Load dashboard statistics
    await loadDashboardStats();

    // Setup event listeners
    setupEventListeners();
});

/**
 * Display user information in header
 */
function displayUserInfo(user) {
    const userName = user.fullName || user.full_name || user.email.split('@')[0];
    const userAvatar = document.getElementById('userAvatar');
    const userNameElement = document.getElementById('userName');

    if (userNameElement) {
        userNameElement.textContent = userName;
    }

    if (userAvatar) {
        // Create initials
        const nameParts = userName.split(' ');
        let initials = 'AD';
        if (nameParts.length >= 2) {
            initials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
        } else if (nameParts[0].length >= 2) {
            initials = nameParts[0].substring(0, 2).toUpperCase();
        }
        userAvatar.textContent = initials;
    }

    console.log('✅ User info displayed:', userName);
}

/**
 * Load dashboard statistics from backend
 */
async function loadDashboardStats() {
    console.log('📊 Loading dashboard statistics...');
    
    try {
        // Show loading state
        setLoadingState(true);

        // Call backend API
        const response = await fetch('http://localhost:5000/api/admin/forms/stats', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        console.log('📡 API Response Status:', response.status);

        if (!response.ok) {
            if (response.status === 401) {
                console.error('❌ Unauthorized - token may be expired');
                localStorage.removeItem('authToken');
                localStorage.removeItem('userInfo');
                window.location.href = '../public/login.html';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Stats received:', data);

        // Update UI with statistics
        updateStatsDisplay(data);

    } catch (error) {
        console.error('❌ Failed to load statistics:', error);
        showError('Failed to load statistics. Please refresh the page.');
        
        // Set default values
        updateStatsDisplay({
            totalForms: 0,
            approved: 0,
            pending: 0,
            rejected: 0
        });
    } finally {
        setLoadingState(false);
    }
}

/**
 * Update statistics display
 */
function updateStatsDisplay(stats) {
    const totalElement = document.getElementById('totalSubmissions');
    const approvedElement = document.getElementById('approvedCount');
    const pendingElement = document.getElementById('pendingCount');
    const rejectedElement = document.getElementById('rejectedCount');

    if (totalElement) {
        totalElement.textContent = stats.totalForms ?? 0;
    }
    if (approvedElement) {
        approvedElement.textContent = stats.approved ?? 0;
    }
    if (pendingElement) {
        pendingElement.textContent = stats.pending ?? 0;
    }
    if (rejectedElement) {
        rejectedElement.textContent = stats.rejected ?? 0;
    }

    console.log('✅ Stats display updated');
}

/**
 * Set loading state
 */
function setLoadingState(isLoading) {
    const statValues = document.querySelectorAll('.stat-value');
    statValues.forEach(element => {
        if (isLoading) {
            element.innerHTML = '<span class="loading"></span>';
        }
    });
}

/**
 * Show error notification
 */
function showError(message) {
    // Create error notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(239, 68, 68, 0.3);
        z-index: 9999;
        font-weight: 500;
    `;
    notification.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    document.body.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    console.log('✅ Event listeners setup complete');
}

/**
 * Handle logout
 */
function handleLogout() {
    console.log('👋 Logging out...');
    
    // Clear local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    
    // Show notification
    showNotification('Logged out successfully', 'success');
    
    // Redirect to login page
    setTimeout(() => {
        window.location.href = '../public/login.html';
    }, 1000);
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
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 9999;
        font-weight: 500;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Export functions for testing
window.DashboardUtils = {
    loadDashboardStats,
    updateStatsDisplay,
    handleLogout
};

console.log('✅ Dashboard script loaded successfully');