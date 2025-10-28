

/**
 * SUBADMINS MANAGEMENT JAVASCRIPT
 * Full backend integration for SubAdmin CRUD
 * Path: C:\Users\49\uscis-multi-role-app\frontend\js\subadmins.js
 */

// Global variables
let currentToken = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('👥 SubAdmins Management Initializing...');
    
    // Auth check
    const token = localStorage.getItem('authToken');
    const userInfo = localStorage.getItem('userInfo');
    
    if (!token || !userInfo) {
        console.warn('⚠️ No auth credentials');
        window.location.href = '../public/login.html';
        return;
    }

    // Store token globally
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

    console.log('✅ Auth check passed - Loading subadmins');

    // Get DOM elements
    const tbody = document.getElementById('subAdminsTbody');
    const createForm = document.getElementById('createSubAdminForm');

    // Initial load
    await loadSubAdmins();

    // Form submission
    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await createSubAdmin();
        });
    }

    /**
     * Load all subadmins from API
     */
    async function loadSubAdmins() {
        try {
            showLoading();
            console.log('📡 Fetching subadmins from API');

            const response = await fetch('http://localhost:5000/api/subadmin/list', {
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
            console.log('✅ SubAdmins loaded:', data);

            const subAdmins = data.subAdmins || [];
            renderSubAdmins(subAdmins);

        } catch (error) {
            console.error('❌ Failed to load subadmins:', error);
            showError('Failed to load subadmins. Please try again.');
            showEmptyState('Error loading subadmins');
        }
    }

    /**
     * Create new subadmin
     */
    async function createSubAdmin() {
        const name = document.getElementById('subAdminName').value.trim();
        const email = document.getElementById('subAdminEmail').value.trim();
        const password = document.getElementById('subAdminPassword').value;

        if (!name || !email || !password) {
            showError('All fields are required');
            return;
        }

        if (password.length < 6) {
            showError('Password must be at least 6 characters');
            return;
        }

        try {
            console.log('➕ Creating subadmin:', { name, email });

            const response = await fetch('http://localhost:5000/api/subadmin/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify({ name, email, password })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create subadmin');
            }

            const data = await response.json();
            console.log('✅ SubAdmin created:', data);

            showNotification('SubAdmin created successfully!', 'success');
            
            // Clear form
            document.getElementById('createSubAdminForm').reset();
            
            // Reload list
            await loadSubAdmins();

        } catch (error) {
            console.error('❌ Failed to create subadmin:', error);
            showError(error.message || 'Failed to create subadmin');
        }
    }

    /**
     * Render subadmins in table
     */
    function renderSubAdmins(subAdmins) {
        if (!subAdmins || subAdmins.length === 0) {
            showEmptyState('No subadmins found');
            return;
        }

        tbody.innerHTML = subAdmins.map(subAdmin => {
            const escapedName = escapeHtml(subAdmin.name || 'Unknown');
            const escapedEmail = escapeHtml(subAdmin.email || 'No email');
            
            return `
            <tr data-subadmin-id="${subAdmin.id}">
                <td>
                    <div class="subadmin-info-cell">
                        <div class="subadmin-avatar">${getInitials(subAdmin.name)}</div>
                        <div class="subadmin-details">
                            <div class="subadmin-name">${escapedName}</div>
                            <div class="subadmin-email">${escapedEmail}</div>
                        </div>
                    </div>
                </td>
                <td>${escapedEmail}</td>
                <td>${formatDate(subAdmin.created_at || subAdmin.createdat)}</td>
                <td>
                    <button 
                        class="action-btn delete" 
                        data-action="delete"
                        data-subadmin-id="${subAdmin.id}"
                        data-subadmin-name="${escapedName}"
                        title="Delete SubAdmin"
                    >
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        }).join('');

        // Attach event listeners
        attachActionListeners();

        console.log(`✅ Rendered ${subAdmins.length} subadmins`);
    }

    /**
     * Attach event listeners to action buttons
     */
    function attachActionListeners() {
        const deleteButtons = document.querySelectorAll('.action-btn.delete');
        
        deleteButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const subAdminId = button.getAttribute('data-subadmin-id');
                const subAdminName = button.getAttribute('data-subadmin-name');
                
                console.log(`🎯 Delete clicked:`, { subAdminId, subAdminName });
                
                await deleteSubAdmin(subAdminId, subAdminName);
            });
        });
    }

    /**
     * Delete subadmin
     */
    async function deleteSubAdmin(subAdminId, subAdminName) {
        if (!confirm(`⚠️ Delete subadmin "${subAdminName}"?\n\nThis action cannot be undone.`)) {
            return;
        }

        try {
            console.log('🗑️ Deleting subadmin:', subAdminId);
            
            const response = await fetch(
                `http://localhost:5000/api/subadmin/delete/${subAdminId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentToken}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to delete subadmin');
            }

            console.log('✅ SubAdmin deleted successfully');
            showNotification('SubAdmin deleted successfully', 'success');
            
            // Reload list
            await loadSubAdmins();

        } catch (error) {
            console.error('❌ Failed to delete subadmin:', error);
            showError('Failed to delete subadmin');
        }
    }

    /**
     * Show loading state
     */
    function showLoading() {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="loading-overlay">
                    <div class="spinner"></div>
                    <p style="margin-top: 15px; color: #6b7280;">Loading subadmins...</p>
                </td>
            </tr>
        `;
    }

    /**
     * Show empty state
     */
    function showEmptyState(message = 'No subadmins found') {
        tbody.innerHTML = `
            <tr>
                <td colspan="4">
                    <div class="empty-state">
                        <i class="fas fa-user-shield"></i>
                        <h3>${message}</h3>
                        <p>Create your first subadmin using the form above</p>
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
     * Get initials
     */
    function getInitials(name) {
        if (!name) return 'SA';
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
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    /**
     * Escape HTML
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
     * Show error
     */
    function showError(message) {
        showNotification(message, 'error');
    }

    // Export for external access
    window.SubAdminsManagement = { 
        loadSubAdmins, 
        createSubAdmin,
        deleteSubAdmin
    };
});

console.log('✅ SubAdmins management script loaded');