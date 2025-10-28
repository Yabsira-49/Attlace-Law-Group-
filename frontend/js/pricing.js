/**
 * PRICING JAVASCRIPT - FIXED VERSION
 * Admin pricing management
 * Save to: C:\Users\49\uscis-multi-role-app\frontend\js\pricing.js
 */

// Global token variable (unique name to avoid conflicts)
let pricingToken = null;

// Form types - you can modify this list as needed
const FORM_TYPES = [
    { type: "I-130", description: "Petition for Alien Relative" },
    { type: "I-485", description: "Application to Register Permanent Residence" },
    { type: "N-400", description: "Application for Naturalization" },
    { type: "I-765", description: "Application for Employment Authorization" },
    { type: "I-90", description: "Application to Replace Permanent Resident Card" },
    { type: "I-131", description: "Application for Travel Document" }
];

document.addEventListener('DOMContentLoaded', async () => {
    console.log('💸 Pricing Initializing...');

    // Auth check
    const token = localStorage.getItem('authToken');
    const userInfo = localStorage.getItem('userInfo');

    if (!token || !userInfo) {
        console.warn('⚠️ No auth credentials');
        window.location.href = '../public/login.html';
        return;
    }

    // Store token globally
    pricingToken = token;

    try {
        const user = JSON.parse(userInfo);
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

    // Load prices and render cards
    await loadPrices();
});

/**
 * Load current prices from API & render pricing cards
 */
async function loadPrices() {
    let prices = {};

    // Try loading from API
    try {
        const response = await fetch('http://localhost:5000/api/admin/forms/pricing', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${pricingToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            prices = data;
            console.log('✅ Prices loaded from API:', prices);
        } else {
            console.warn('⚠️ No prices in API, using defaults');
        }
    } catch (error) {
        console.warn('⚠️ API not available, using default prices');
    }

    // Render pricing cards
    const grid = document.getElementById('pricingGrid');
    if (!grid) {
        console.error('❌ pricingGrid element not found in HTML');
        return;
    }

    grid.innerHTML = ''; // Clear existing

    FORM_TYPES.forEach((form) => {
        const price = prices[form.type] || 0;

        const card = document.createElement('div');
        card.className = 'pricing-card';
        card.innerHTML = `
            <h3><i class="fas fa-file-alt"></i> ${form.type}</h3>
            <div class="form-type">${form.description}</div>
            <div class="current-price">
                <div class="label">Current Price</div>
                <div class="price" id="price-display-${form.type}">$${price.toFixed(2)}</div>
            </div>
            <form class="price-form" data-type="${form.type}">
                <div class="form-group">
                    <label for="input-${form.type}">Update Price ($)</label>
                    <input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        id="input-${form.type}" 
                        placeholder="Enter new price..."
                        required
                    >
                </div>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> Update Price
                </button>
            </form>
        `;
        grid.appendChild(card);
    });

    // Add submit handlers to all forms
    document.querySelectorAll('.price-form').forEach(formEl => {
        formEl.addEventListener('submit', async (e) => {
            e.preventDefault();
            const type = formEl.dataset.type;
            const input = formEl.querySelector('input');
            const newPrice = parseFloat(input.value);

            if (isNaN(newPrice) || newPrice < 0) {
                showNotification('Please enter a valid price', 'error');
                return;
            }

            await updatePrice(type, newPrice, formEl);
        });
    });

    console.log('✅ Pricing cards rendered');
}

/**
 * Update single price via API
 * ✅ FIXED: Changed field names to match backend expectations
 */
async function updatePrice(type, price, formEl) {
    try {
        console.log(`💾 Updating price for ${type}: $${price}`);

        const response = await fetch('http://localhost:5000/api/admin/forms/pricing', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${pricingToken}`
            },
            body: JSON.stringify({ 
                form_type: type,           // ✅ FIXED: Changed from "type" to "form_type"
                price: parseFloat(price)   // ✅ FIXED: Ensure it's a number
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                handleUnauthorized();
                return;
            }
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update price');
        }

        const data = await response.json();
        console.log('✅ Price updated:', data);

        showNotification(`Price for ${type} updated to $${price.toFixed(2)}!`, 'success');

        // Update displayed price
        const priceDisplay = document.getElementById(`price-display-${type}`);
        if (priceDisplay) {
            priceDisplay.textContent = `$${price.toFixed(2)}`;
        }

        // Clear form input
        formEl.reset();

    } catch (error) {
        console.error('❌ Failed to update price:', error);
        showNotification(error.message || 'Failed to update price', 'error');
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

console.log('✅ Pricing script loaded');
