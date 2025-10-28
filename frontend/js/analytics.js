

/**
 * ANALYTICS JAVASCRIPT
 * Charts and statistics dashboard
 * Path: C:\Users\49\uscis-multi-role-app\frontend\js\analytics.js
 */

let currentToken = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📊 Analytics Initializing...');
    
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
        if (user.role !== 'admin' && user.role !== 'subadmin') {
            console.warn('⚠️ User is not admin or subadmin');
            window.location.href = '../public/login.html';
            return;
        }
    } catch (error) {
        console.error('❌ Parse error:', error);
        window.location.href = '../public/login.html';
        return;
    }

    console.log('✅ Auth check passed - Loading analytics');

    // Load analytics data
    await loadAnalytics();
});

/**
 * Load analytics data from API
 */
async function loadAnalytics() {
    try {
        console.log('📡 Fetching analytics data...');

        const response = await fetch('http://localhost:5000/api/admin/analytics', {
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
        console.log('✅ Analytics data loaded:', data);

        // Update stat cards
        document.getElementById('totalUsers').textContent = data.totalUsers || 0;
        document.getElementById('totalForms').textContent = data.totalForms || 0;
        document.getElementById('approvedForms').textContent = data.approvedForms || 0;
        document.getElementById('pendingForms').textContent = data.pendingForms || 0;

        // Create charts
        createUserRegistrationsChart(data.userRegistrations || []);
        createFormTypesChart(data.formsByType || []);
        createFormStatusChart(data.formsByStatus || []);
        createMonthlyFormsChart(data.monthlyForms || []);

        console.log('✅ Charts rendered successfully');

    } catch (error) {
        console.error('❌ Failed to load analytics:', error);
        showError('Failed to load analytics data. Please try again.');
    }
}

/**
 * Create User Registrations Line Chart
 */
function createUserRegistrationsChart(data) {
    const ctx = document.getElementById('userRegistrationsChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => formatDate(d.date)),
            datasets: [{
                label: 'New Users',
                data: data.map(d => parseInt(d.count)),
                borderColor: '#1e40af',
                backgroundColor: 'rgba(30, 64, 175, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#1e40af',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1a3a52',
                    padding: 12,
                    titleColor: '#fff',
                    bodyColor: '#fff'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

/**
 * Create Form Types Doughnut Chart
 */
function createFormTypesChart(data) {
    const ctx = document.getElementById('formTypesChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.type || d.form_type),
            datasets: [{
                data: data.map(d => parseInt(d.count)),
                backgroundColor: [
                    '#3b82f6',
                    '#10b981',
                    '#f59e0b',
                    '#ef4444',
                    '#8b5cf6',
                    '#ec4899',
                    '#14b8a6'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: '#1a3a52',
                    padding: 12
                }
            }
        }
    });
}

/**
 * Create Form Status Bar Chart
 */
function createFormStatusChart(data) {
    const ctx = document.getElementById('formStatusChart');
    if (!ctx) return;

    // Define colors for each status
    const statusColors = {
        'approved': '#10b981',
        'pending': '#f59e0b',
        'rejected': '#ef4444',
        'processing': '#3b82f6'
    };

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => capitalize(d.status)),
            datasets: [{
                label: 'Forms',
                data: data.map(d => parseInt(d.count)),
                backgroundColor: data.map(d => statusColors[d.status] || '#6b7280'),
                borderRadius: 8,
                barThickness: 50
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1a3a52',
                    padding: 12
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

/**
 * Create Monthly Forms Bar Chart
 */
function createMonthlyFormsChart(data) {
    const ctx = document.getElementById('monthlyFormsChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.month),
            datasets: [{
                label: 'Form Submissions',
                data: data.map(d => parseInt(d.count)),
                backgroundColor: '#8b5cf6',
                borderRadius: 8,
                barThickness: 40
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1a3a52',
                    padding: 12
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
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
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

/**
 * Show error
 */
function showError(message) {
    showNotification(message, 'error');
}

console.log('✅ Analytics script loaded');