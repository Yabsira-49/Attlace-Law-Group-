/**
 * ATTLES LAW GROUP - MAIN JAVASCRIPT
 * Author: Attles Law Group Development Team
 * Description: Core functionality for the immigration law website
 */

// ==========================================
// GLOBAL STATE & CONFIGURATION
// ==========================================
const CONFIG = {
    API_BASE_URL: 'http://localhost:5000/api',
    ANIMATION_DURATION: 300,
    SCROLL_OFFSET: 80
};

// ==========================================
// MOBILE NAVIGATION TOGGLE
// ==========================================
class NavigationManager {
    constructor() {
        this.navToggle = document.getElementById('navToggle');
        this.navMenu = document.getElementById('navMenu');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.header = document.getElementById('header');
        
        this.init();
    }
    
    init() {
        if (this.navToggle && this.navMenu) {
            this.navToggle.addEventListener('click', () => this.toggleMenu());
            
            // Close menu when clicking on a link
            this.navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    if (this.navMenu.classList.contains('active')) {
                        this.toggleMenu();
                    }
                });
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.navbar')) {
                    this.closeMenu();
                }
            });
        }
        
        // Sticky header on scroll
        this.initStickyHeader();
        
        // Active link highlighting
        this.highlightActiveLink();
    }
    
    toggleMenu() {
        this.navMenu.classList.toggle('active');
        this.navToggle.classList.toggle('active');
        document.body.style.overflow = this.navMenu.classList.contains('active') ? 'hidden' : '';
    }
    
    closeMenu() {
        this.navMenu.classList.remove('active');
        this.navToggle.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    initStickyHeader() {
        let lastScroll = 0;
        
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            
            if (currentScroll <= 0) {
                this.header.classList.remove('scroll-up');
                return;
            }
            
            if (currentScroll > lastScroll && !this.header.classList.contains('scroll-down')) {
                // Scrolling down
                this.header.classList.remove('scroll-up');
                this.header.classList.add('scroll-down');
            } else if (currentScroll < lastScroll && this.header.classList.contains('scroll-down')) {
                // Scrolling up
                this.header.classList.remove('scroll-down');
                this.header.classList.add('scroll-up');
            }
            
            lastScroll = currentScroll;
        });
    }
    
    highlightActiveLink() {
        const currentPath = window.location.pathname;
        this.navLinks.forEach(link => {
            const linkPath = new URL(link.href).pathname;
            if (linkPath === currentPath) {
                link.classList.add('active');
            }
        });
    }
}

// ==========================================
// SMOOTH SCROLLING
// ==========================================
class SmoothScroll {
    constructor() {
        this.init();
    }
    
    init() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const href = anchor.getAttribute('href');
                
                if (href === '#' || href === '') return;
                
                e.preventDefault();
                const target = document.querySelector(href);
                
                if (target) {
                    const offsetTop = target.offsetTop - CONFIG.SCROLL_OFFSET;
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }
}

// ==========================================
// ANIMATED COUNTER
// ==========================================
class AnimatedCounter {
    constructor() {
        this.counters = document.querySelectorAll('.stat-number');
        this.animated = false;
        this.init();
    }
    
    init() {
        if (this.counters.length > 0) {
            this.observeCounters();
        }
    }
    
    observeCounters() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.animated) {
                    this.animateCounters();
                    this.animated = true;
                }
            });
        }, { threshold: 0.5 });
        
        this.counters.forEach(counter => observer.observe(counter));
    }
    
    animateCounters() {
        this.counters.forEach(counter => {
            const target = parseFloat(counter.getAttribute('data-target'));
            const duration = 2000; // 2 seconds
            const increment = target / (duration / 16); // 60fps
            let current = 0;
            
            const updateCounter = () => {
                current += increment;
                
                if (current < target) {
                    // Handle decimal numbers
                    if (target % 1 !== 0) {
                        counter.textContent = current.toFixed(1);
                    } else {
                        counter.textContent = Math.floor(current).toLocaleString();
                    }
                    requestAnimationFrame(updateCounter);
                } else {
                    if (target % 1 !== 0) {
                        counter.textContent = target.toFixed(1);
                    } else {
                        counter.textContent = target.toLocaleString();
                    }
                }
            };
            
            updateCounter();
        });
    }
}

// ==========================================
// FADE IN ANIMATION ON SCROLL
// ==========================================
class ScrollAnimations {
    constructor() {
        this.elements = document.querySelectorAll('.service-card, .feature-card, .step-item');
        this.init();
    }
    
    init() {
        if ('IntersectionObserver' in window) {
            this.observeElements();
        } else {
            // Fallback for older browsers
            this.elements.forEach(el => el.classList.add('fade-in'));
        }
    }
    
    observeElements() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '0';
                    entry.target.style.transform = 'translateY(30px)';
                    entry.target.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                    
                    setTimeout(() => {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }, 100);
                    
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        this.elements.forEach(el => observer.observe(el));
    }
}

// ==========================================
// FORM VALIDATION UTILITY
// ==========================================
class FormValidator {
    constructor(formElement) {
        this.form = formElement;
        this.init();
    }
    
    init() {
        if (!this.form) return;
        
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Real-time validation
        const inputs = this.form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearError(input));
        });
    }
    
    handleSubmit(e) {
        e.preventDefault();
        
        const inputs = this.form.querySelectorAll('input[required], textarea[required], select[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });
        
        if (isValid) {
            // Form is valid, proceed with submission
            return true;
        }
        
        return false;
    }
    
    validateField(field) {
        const value = field.value.trim();
        const type = field.type;
        let isValid = true;
        let errorMessage = '';
        
        // Check if required field is empty
        if (field.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = 'This field is required';
        }
        
        // Email validation
        if (type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address';
            }
        }
        
        // Password validation
        if (type === 'password' && value && field.hasAttribute('minlength')) {
            const minLength = parseInt(field.getAttribute('minlength'));
            if (value.length < minLength) {
                isValid = false;
                errorMessage = `Password must be at least ${minLength} characters`;
            }
        }
        
        // Phone validation
        if (type === 'tel' && value) {
            const phoneRegex = /^[\d\s\-\+\(\)]+$/;
            if (!phoneRegex.test(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid phone number';
            }
        }
        
        if (!isValid) {
            this.showError(field, errorMessage);
        } else {
            this.clearError(field);
        }
        
        return isValid;
    }
    
    showError(field, message) {
        this.clearError(field);
        
        field.classList.add('error');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.color = '#dc2626';
        errorDiv.style.fontSize = '0.875rem';
        errorDiv.style.marginTop = '0.25rem';
        
        field.parentElement.appendChild(errorDiv);
    }
    
    clearError(field) {
        field.classList.remove('error');
        const errorMessage = field.parentElement.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }
}

// ==========================================
// ALERT/NOTIFICATION SYSTEM
// ==========================================
class NotificationManager {
    static show(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notification-container') || this.createContainer();
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" aria-label="Close notification">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add styles
        Object.assign(notification.style, {
            padding: '1rem 1.5rem',
            marginBottom: '1rem',
            borderRadius: '0.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            animation: 'slideInRight 0.3s ease-out',
            backgroundColor: this.getBackgroundColor(type),
            color: '#fff'
        });
        
        container.appendChild(notification);
        
        // Close button functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        });
        
        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.style.animation = 'slideOutRight 0.3s ease-out';
                    setTimeout(() => notification.remove(), 300);
                }
            }, duration);
        }
    }
    
    static createContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        Object.assign(container.style, {
            position: 'fixed',
            top: '100px',
            right: '20px',
            zIndex: '9999',
            maxWidth: '400px',
            width: '100%'
        });
        document.body.appendChild(container);
        return container;
    }
    
    static getIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
    
    static getBackgroundColor(type) {
        const colors = {
            success: '#10b981',
            error: '#dc2626',
            warning: '#f59e0b',
            info: '#1e3a8a'
        };
        return colors[type] || '#1e3a8a';
    }
}

// ==========================================
// LOADING SPINNER
// ==========================================
class LoadingSpinner {
    static show(message = 'Loading...') {
        if (document.getElementById('loading-overlay')) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(15, 23, 42, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                backdrop-filter: blur(5px);
            }
            .loading-spinner {
                text-align: center;
                color: #fff;
            }
            .spinner {
                width: 50px;
                height: 50px;
                border: 4px solid rgba(255, 255, 255, 0.3);
                border-top-color: #f59e0b;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 1rem;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(overlay);
    }
    
    static hide() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
        }
    }
}

// ==========================================
// LOCAL STORAGE MANAGER
// ==========================================
class StorageManager {
    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Error saving to localStorage:', e);
            return false;
        }
    }
    
    static get(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('Error reading from localStorage:', e);
            return null;
        }
    }
    
    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Error removing from localStorage:', e);
            return false;
        }
    }
    
    static clear() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.error('Error clearing localStorage:', e);
            return false;
        }
    }
}

// ==========================================
// INITIALIZE ALL COMPONENTS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Attles Law Group Website Initialized');
    
    // Initialize components
    new NavigationManager();
    new SmoothScroll();
    new AnimatedCounter();
    new ScrollAnimations();
    
    // Initialize forms
    const forms = document.querySelectorAll('form');
    forms.forEach(form => new FormValidator(form));
    
    // Add animation classes
    const animateElements = document.querySelectorAll('.hero-text, .hero-card');
    animateElements.forEach((el, index) => {
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            
            setTimeout(() => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, 100);
        }, index * 200);
    });
});

// ==========================================
// EXPORT FOR USE IN OTHER FILES
// ==========================================
window.AppUtils = {
    NotificationManager,
    LoadingSpinner,
    StorageManager,
    FormValidator,
    CONFIG
};

// ==========================================
// SERVICE WORKER REGISTRATION (PWA Support)
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Uncomment when you have a service worker file
        // navigator.serviceWorker.register('/sw.js')
        //     .then(registration => console.log('SW registered:', registration))
        //     .catch(err => console.log('SW registration failed:', err));
    });
}

// Add safe DOM helpers and ensure code runs after DOM is ready to prevent `null` classList errors.
(function() {
    function qs(id){ return document.getElementById(id); }
    function safeAddClass(elOrId, cls){
        const el = typeof elOrId === 'string' ? qs(elOrId) : elOrId;
        if (el && el.classList) el.classList.add(cls);
    }
    function safeRemoveClass(elOrId, cls){
        const el = typeof elOrId === 'string' ? qs(elOrId) : elOrId;
        if (el && el.classList) el.classList.remove(cls);
    }

    function appInit() {
        // Initialize components
        new NavigationManager();
        new SmoothScroll();
        new AnimatedCounter();
        new ScrollAnimations();
        
        // Initialize forms
        const forms = document.querySelectorAll('form');
        forms.forEach(form => new FormValidator(form));
        
        // Add animation classes
        const animateElements = document.querySelectorAll('.hero-text, .hero-card');
        animateElements.forEach((el, index) => {
            setTimeout(() => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(20px)';
                el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                
                setTimeout(() => {
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }, 100);
            }, index * 200);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', appInit);
    } else {
        appInit();
    }
})();