/**
 * USERS OVERVIEW JAVASCRIPT - FIXED VERSION
 * Save to: C:\Users\49\uscis-multi-role-app\frontend\js\users-overview.js
 */

// Global variables
let currentToken = null;
let usersCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    console.log('👥 Users Overview Initializing...');

    // Auth check
    const token = localStorage.getItem('authToken');
    const userInfo = localStorage.getItem('userInfo');

    if (!token || !userInfo) {
        console.warn('⚠️ No auth credentials');
        window.location.href = '../public/login.html';
        return;
    }

    currentToken = token;

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

    console.log('✅ Auth check passed - Loading users');

    // Get DOM elements
    const refreshBtn = document.getElementById('refreshBtn');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');

    // Initial load
    await loadUsers();

    // Event listeners
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            console.log('🔄 Refreshing users list');
            loadUsers();
        });
    }

    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = e.target.value.trim();
                if (query) {
                    searchUsers(query);
                } else {
                    loadUsers();
                }
            }, 500);
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            const status = statusFilter.value;
            const query = searchInput ? searchInput.value.trim() : '';
            if (query || status) {
                searchUsers(query, status);
            } else {
                loadUsers();
            }
        });
    }
});

/**
 * Load all users from API
 */
async function loadUsers() {
    try {
        showLoading();
        console.log('📡 Fetching users from API...');

        const response = await fetch('http://localhost:5000/api/admin/users', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                handleUnauthorized();
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Users loaded:', data);

        const users = data.users || [];
        usersCache = users;
        renderUsers(users);

    } catch (error) {
        console.error('❌ Failed to load users:', error);
        showError('Failed to load users. Please try again.');
        showEmptyState('Error loading users');
    }
}

/**
 * Search users
 */
async function searchUsers(query = '', status = '') {
    try {
        showLoading();
        console.log('🔍 Searching users:', query, status);

        const params = new URLSearchParams();
        if (query) params.append('query', query);
        if (status) params.append('status', status);

        const response = await fetch(`http://localhost:5000/api/admin/users/search?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                handleUnauthorized();
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Search results:', data);

        const users = data.users || [];
        usersCache = users;
        renderUsers(users);

    } catch (error) {
        console.error('❌ Search failed:', error);
        showError('Search failed. Please try again.');
        showEmptyState('Search failed');
    }
}

/**
 * Render users in table
 */
function renderUsers(users) {
    if (!users || users.length === 0) {
        showEmptyState('No users found');
        return;
    }

    const tbody = document.getElementById('usersTbody');
    if (!tbody) {
        console.error('❌ usersTbody not found');
        return;
    }

    tbody.innerHTML = users.map(user => {
        const escapedName = escapeHtml(user.full_name || 'Unknown');
        const escapedEmail = escapeHtml(user.email || 'No email');

        return `
            <tr data-user-id="${user.id}">
                <td>
                    <div class="user-info-cell">
                        <div class="user-avatar">${getInitials(user.full_name)}</div>
                        <div class="user-details">
                            <div class="user-name">${escapedName}</div>
                            <div class="user-email-small">${escapedEmail}</div>
                        </div>
                    </div>
                </td>
                <td>${escapedEmail}</td>
                <td>
                    <span class="status-badge ${user.status || 'inactive'}">
                        <i class="fas fa-circle"></i> ${user.status || 'inactive'}
                    </span>
                </td>
                <td>
                    ${user.email_verified ? 
                        '<span class="verify-badge verified"><i class="fas fa-check-circle"></i> Verified</span>' : 
                        '<span class="verify-badge pending"><i class="fas fa-clock"></i> Unverified</span>'
                    }
                </td>
                <td>${formatDate(user.created_at)}</td>
                <td>
                    <div class="action-buttons">
                        <button 
                            class="action-btn view" 
                            data-action="view" 
                            data-user-id="${user.id}"
                            title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button 
                            class="action-btn edit" 
                            data-action="toggle" 
                            data-user-id="${user.id}"
                            data-status="${user.status || 'inactive'}"
                            title="Toggle Status">
                            <i class="fas fa-toggle-${(user.status === 'active') ? 'on' : 'off'}"></i>
                        </button>
                        <button 
                            class="action-btn delete" 
                            data-action="delete" 
                            data-user-id="${user.id}"
                            data-user-name="${escapedName}"
                            data-user-email="${escapedEmail}"
                            title="Delete User">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    attachActionListeners();
    console.log(`✅ Rendered ${users.length} users`);
}

/**
 * Attach event listeners to action buttons
 */
function attachActionListeners() {
    const actionButtons = document.querySelectorAll('.action-btn');

    actionButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const action = button.getAttribute('data-action');
            const userId = button.getAttribute('data-user-id');

            console.log('🔘 Action clicked:', action, userId);

            if (action === 'view') {
                await viewUserDetails(userId);
            } else if (action === 'toggle') {
                const currentStatus = button.getAttribute('data-status');
                await toggleUserStatus(userId, currentStatus);
            } else if (action === 'delete') {
                const userName = button.getAttribute('data-user-name');
                const userEmail = button.getAttribute('data-user-email');
                await deleteUserAction(userId, userName, userEmail);
            }
        });
    });
}

/**
 * View user details
 */
async function viewUserDetails(userId) {
    console.log('👁️ View user:', userId);

    try {
        const response = await fetch(`http://localhost:5000/api/admin/users/${userId}/forms`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user forms');
        }

        const data = await response.json();
        console.log('✅ User forms:', data);

        const forms = data.forms || [];
        const user = usersCache.find(u => u.id === userId);

        const userDetails = user ? `
<strong>Name:</strong> ${user.full_name || 'NA'}
<strong>Email:</strong> ${user.email || 'NA'}
<strong>Status:</strong> ${user.status || 'inactive'}
<strong>Email Verified:</strong> ${user.email_verified ? 'Yes' : 'No'}
<strong>Joined:</strong> ${formatDate(user.created_at)}
---
<strong>Submitted Forms:</strong> ${forms.length}
        ` : 'User not found';

        if (forms.length === 0) {
            showModal('User Details', userDetails + '\n\n<em>No forms submitted yet.</em>');
        } else {
            const formsText = forms.map((f, idx) => 
                `${idx + 1}. ${f.form_type} - ${f.status} (${formatDate(f.created_at)})`
            ).join('\n');
            showModal('User Details', userDetails + '\n\n' + formsText);
        }

    } catch (error) {
        console.error('❌ Failed to view user:', error);
        showError('Failed to load user details');
    }
}

/**
 * ✅ Toggle user status (active/inactive) - CORRECT VERSION
 */
async function toggleUserStatus(userId, currentStatus) {
    const newStatus = (currentStatus === 'active') ? 'inactive' : 'active';

    if (!confirm(`Change user status to "${newStatus}"?`)) {
        return;
    }

    try {
        console.log('🔄 Toggling user status:', userId, newStatus);

        const response = await fetch(`http://localhost:5000/api/admin/users/status/${userId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ status: newStatus })  // ✅ CORRECT field name
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update status');
        }

        console.log('✅ Status updated successfully');
        showNotification(`User status changed to "${newStatus}"`, 'success');

        // Reload users
        await loadUsers();

    } catch (error) {
        console.error('❌ Failed to toggle status:', error);
        showError(error.message || 'Failed to update user status');
    }
}

/**
 * ✅ Delete user - CORRECT VERSION
 */
async function deleteUserAction(userId, userName, userEmail) {
    if (!confirm(`DELETE USER: ${userName} (${userEmail})?\n\nThis will permanently delete this user and ALL their forms.\nThis action CANNOT be undone.\n\nAre you sure?`)) {
        return;
    }

    try {
        console.log('🗑️ Deleting user:', userId, userName);

        const response = await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete user');
        }

        console.log('✅ User deleted successfully');
        showNotification(`User "${userName}" deleted successfully!`, 'success');

        // Remove from cache
        usersCache = usersCache.filter(u => u.id !== userId);

        // Reload users
        await loadUsers();

    } catch (error) {
        console.error('❌ Failed to delete user:', error);
        showError(error.message || 'Failed to delete user');
    }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Show loading state
 */
function showLoading() {
    const tbody = document.getElementById('usersTbody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="loading-overlay">
                <div class="spinner"></div>
                <p style="margin-top: 15px; color: #6b7280;">Loading users...</p>
            </td>
        </tr>
    `;
}

/**
 * Show empty state
 */
function showEmptyState(message = 'No users found') {
    const tbody = document.getElementById('usersTbody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="6">
                <div class="empty-state">
                    <i class="fas fa-users-slash" style="font-size: 3rem; color: #d1d5db;"></i>
                    <h3 style="margin: 15px 0 10px 0; color: #6b7280;">${message}</h3>
                    <p style="color: #9ca3af; margin: 0;">Try adjusting your search or filters</p>
                </div>
            </td>
        </tr>
    `;
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
 * Get user initials
 */
function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

/**
 * Format date
 */
function formatDate(dateString) {
    if (!dateString) return 'NA';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show modal dialog
 */
function showModal(title, content) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.2s ease;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 15px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        animation: slideUp 0.3s ease;
    `;

    modalContent.innerHTML = `
        <h2 style="margin: 0 0 20px 0; color: #1a3a52; font-family: 'Playfair Display', serif; font-size: 1.75rem;">
            ${escapeHtml(title)}
        </h2>
        <div style="white-space: pre-line; color: #374151; line-height: 1.8; margin-bottom: 20px; font-size: 0.95rem;">
            ${content}
        </div>
        <button 
            onclick="this.closest('div[style*=fixed]').remove()" 
            style="background: #1a3a52; color: white; border: none; padding: 12px 25px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s ease;"
            onmouseover="this.style.background='#0f2a3f'"
            onmouseout="this.style.background='#1a3a52'">
            Close
        </button>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
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
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Show error notification
 */
function showError(message) {
    showNotification(message, 'error');
}

// ========================================
// CSS ANIMATIONS
// ========================================

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }

    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes slideUp {
        from { transform: translateY(50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }

    .verify-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 600;
    }

    .verify-badge.verified {
        background: #d1fae5;
        color: #065f46;
    }

    .verify-badge.pending {
        background: #fef3c7;
        color: #92400e;
    }

    .user-email-small {
        font-size: 0.85rem;
        color: #6b7280;
    }

    .empty-state {
        text-align: center;
        padding: 60px 20px;
    }

    .loading-overlay {
        text-align: center;
        padding: 60px 20px;
    }

    .spinner {
        border: 4px solid #f3f4f6;
        border-top: 4px solid #1a3a52;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        animation: spin 1s linear infinite;
        margin: 0 auto;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

console.log('✅ Users management script loaded');
