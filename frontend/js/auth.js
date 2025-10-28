/**
 * ATTLES LAW GROUP - AUTHENTICATION HANDLER
 * Handles login, registration, password reset, etc.
 * Integrates with backend API
 */

class LoginHandler {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.rememberMeCheckbox = document.getElementById('rememberMe');
        this.loginBtn = document.getElementById('loginBtn');
        this.togglePasswordBtn = document.getElementById('togglePassword');
        this.init();
    }

    init() {
        // Setup form validation
        this.setupFormValidation();
        // Setup form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        // Setup password toggle
        if (this.togglePasswordBtn) {
            this.togglePasswordBtn.addEventListener('click', () => this.togglePasswordVisibility());
        }
        // Auto-fill email if remembered
        this.autoFillEmail();
    }

    setupFormValidation() {
        // Real-time email validation
        this.emailInput.addEventListener('blur', () => {
            this.validateEmail(this.emailInput.value);
        });
        // Real-time password validation
        this.passwordInput.addEventListener('blur', () => {
            this.validatePassword(this.passwordInput.value);
        });
        // Clear errors on input
        this.emailInput.addEventListener('input', () => {
            this.clearError('emailError');
        });
        this.passwordInput.addEventListener('input', () => {
            this.clearError('passwordError');
        });
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const errorElement = document.getElementById('emailError');
        if (!email) {
            this.showError('emailError', 'Email is required');
            return false;
        }
        if (!emailRegex.test(email)) {
            this.showError('emailError', 'Please enter a valid email address');
            return false;
        }
        this.clearError('emailError');
        return true;
    }

    validatePassword(password) {
        const errorElement = document.getElementById('passwordError');
        if (!password) {
            this.showError('passwordError', 'Password is required');
            return false;
        }
        if (password.length < 8) {
            this.showError('passwordError', 'Password must be at least 8 characters');
            return false;
        }
        this.clearError('passwordError');
        return true;
    }

    showError(errorId, message) {
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('visible');
            // Add error class to input
            const inputId = errorId.replace('Error', '');
            const inputElement = document.getElementById(inputId);
            if (inputElement) {
                inputElement.classList.add('error');
            }
        }
    }

    clearError(errorId) {
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('visible');
            // Remove error class from input
            const inputId = errorId.replace('Error', '');
            const inputElement = document.getElementById(inputId);
            if (inputElement) {
                inputElement.classList.remove('error');
            }
        }
    }

    togglePasswordVisibility() {
        const type = this.passwordInput.type === 'password' ? 'text' : 'password';
        this.passwordInput.type = type;
        // Toggle icon
        const icon = this.togglePasswordBtn.querySelector('i');
        if (type === 'password') {
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        } else {
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;
        const rememberMe = this.rememberMeCheckbox.checked;

        // Validate inputs
        const emailValid = this.validateEmail(email);
        const passwordValid = this.validatePassword(password);
        if (!emailValid || !passwordValid) {
            return;
        }

        // Show loading state
        this.setLoadingState(true);
        try {
            // Call login API
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (response.ok) {
                // Login successful
                this.handleLoginSuccess(data, rememberMe);
            } else {
                // Login failed
                this.handleLoginError(data.error || 'Invalid email or password');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.handleLoginError('Network error. Please check your connection and try again.');
        } finally {
            this.setLoadingState(false);
        }
    }

    handleLoginSuccess(data, rememberMe) {
        // Store JWT token
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('token', data.token); // Backup token storage
        
        // Store user info
        localStorage.setItem('userInfo', JSON.stringify({
            id: data.user.id,
            fullName: data.user.full_name,
            full_name: data.user.full_name,
            email: data.user.email,
            role: data.user.role
        }));
        
        // Store username for dashboard
        localStorage.setItem('userName', data.user.full_name);

        // Remember email if checkbox is checked
        if (rememberMe) {
            localStorage.setItem('rememberedEmail', data.user.email);
        } else {
            localStorage.removeItem('rememberedEmail');
        }

        // Show success notification
        if (window.AppUtils && window.AppUtils.NotificationManager) {
            window.AppUtils.NotificationManager.show(
                'Login successful! Redirecting...',
                'success',
                2000
            );
        }

        // Redirect based on role
        setTimeout(() => {
            this.redirectByRole(data.user.role);
        }, 1500);
    }

    handleLoginError(errorMessage) {
        // Show error notification
        if (window.AppUtils && window.AppUtils.NotificationManager) {
            window.AppUtils.NotificationManager.show(
                errorMessage,
                'error',
                5000
            );
        } else {
            // Fallback alert
            alert(errorMessage);
        }

        // Clear password field
        this.passwordInput.value = '';
        this.passwordInput.focus();
    }

    redirectByRole(role) {
        // ✅ FIX: Use absolute URLs that work from any location
        console.log('Redirecting user with role:', role);
        
        switch (role) {
            case 'admin':
                window.location.href = 'http://127.0.0.1:5501/frontend/pages/admin/dashboard.html';
                break;
            case 'subadmin':
                window.location.href = 'http://127.0.0.1:5501/frontend/pages/subadmin/dashboard.html';
                break;
            case 'user':
                // ✅ THIS IS THE FIX - Correct path to user dashboard
                window.location.href = 'http://127.0.0.1:5501/frontend/pages/user/dashboard.html';
                break;
            default:
                window.location.href = 'http://127.0.0.1:5501/index.html';
        }
    }

    setLoadingState(isLoading) {
        const btnText = this.loginBtn.querySelector('.btn-text');
        const btnSpinner = this.loginBtn.querySelector('.btn-spinner');
        if (isLoading) {
            this.loginBtn.disabled = true;
            if (btnText) btnText.style.display = 'none';
            if (btnSpinner) btnSpinner.style.display = 'inline-flex';
        } else {
            this.loginBtn.disabled = false;
            if (btnText) btnText.style.display = 'inline';
            if (btnSpinner) btnSpinner.style.display = 'none';
        }
    }

    checkExistingAuth() {
        const token = localStorage.getItem('authToken');
        const userInfo = localStorage.getItem('userInfo');
        if (token && userInfo) {
            try {
                const user = JSON.parse(userInfo);
                // If already logged in, redirect to appropriate dashboard
                this.redirectByRole(user.role);
            } catch (error) {
                // Invalid stored data, clear it
                localStorage.removeItem('authToken');
                localStorage.removeItem('userInfo');
            }
        }
    }

    autoFillEmail() {
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        if (rememberedEmail) {
            this.emailInput.value = rememberedEmail;
            this.rememberMeCheckbox.checked = true;
        }
    }
}

// ==========================================
// AUTHENTICATION UTILITIES
// ==========================================

class AuthUtils {
    static isAuthenticated() {
        const token = localStorage.getItem('authToken');
        return !!token;
    }

    static getToken() {
        return localStorage.getItem('authToken');
    }

    static getUserInfo() {
        const userInfo = localStorage.getItem('userInfo');
        try {
            return userInfo ? JSON.parse(userInfo) : null;
        } catch {
            return null;
        }
    }

    static logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('token');
        window.location.href = 'http://127.0.0.1:5501/frontend/pages/public/login.html';
    }

    static requireAuth(allowedRoles = []) {
        if (!this.isAuthenticated()) {
            window.location.href = 'http://127.0.0.1:5501/frontend/pages/public/login.html';
            return false;
        }

        if (allowedRoles.length > 0) {
            const userInfo = this.getUserInfo();
            if (!userInfo || !allowedRoles.includes(userInfo.role)) {
                window.location.href = 'http://127.0.0.1:5501/index.html';
                return false;
            }
        }

        return true;
    }

    static getAuthHeaders() {
        const token = this.getToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }
}

// ==========================================
// REGISTER HANDLER
// ==========================================

class RegisterHandler {
    constructor() {
        this.form = document.getElementById('registerForm');
        this.fullName = document.getElementById('fullName');
        this.email = document.getElementById('email');
        this.password = document.getElementById('password');
        this.confirmPassword = document.getElementById('confirmPassword');
        this.terms = document.getElementById('terms');
        this.registerBtn = document.getElementById('registerBtn');
        this.init();
    }

    init() {
        this.setupValidation();
        this.form.addEventListener('submit', e => this.handleSubmit(e));
    }

    setupValidation() {
        this.fullName.addEventListener('blur', () => this.validateFullName());
        this.email.addEventListener('blur', () => this.validateEmail());
        this.password.addEventListener('blur', () => this.validatePassword());
        this.confirmPassword.addEventListener('blur', () => this.validateConfirmPassword());
        this.terms.addEventListener('change', () => this.clearError('termsError'));
    }

    validateFullName() {
        const value = this.fullName.value.trim();
        if (!value) return this.showError('fullNameError', 'Full name is required');
        this.clearError('fullNameError');
        return true;
    }

    validateEmail() {
        const val = this.email.value.trim();
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!val) return this.showError('emailError', 'Email is required');
        if (!regex.test(val)) return this.showError('emailError', 'Invalid email');
        this.clearError('emailError');
        return true;
    }

    validatePassword() {
        const val = this.password.value;
        if (!val) return this.showError('passwordError', 'Password is required');
        if (val.length < 8) return this.showError('passwordError', 'Min 8 characters');
        this.clearError('passwordError');
        return true;
    }

    validateConfirmPassword() {
        const val = this.confirmPassword.value;
        if (val !== this.password.value) return this.showError('confirmPasswordError', 'Passwords do not match');
        this.clearError('confirmPasswordError');
        return true;
    }

    showError(id, msg) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = msg;
            el.classList.add('visible');
        }
    }

    clearError(id) {
        const e = document.getElementById(id);
        if (e) {
            e.textContent = '';
            e.classList.remove('visible');
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        if (!this.validateFullName() || !this.validateEmail() || !this.validatePassword() || !this.validateConfirmPassword() || !this.terms.checked) {
            if (!this.terms.checked) this.showError('termsError', 'You must accept terms');
            return;
        }

        this.setLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    full_name: this.fullName.value.trim(),
                    email: this.email.value.trim(),
                    password: this.password.value,
                    role: 'user'
                })
            });

            const data = await response.json();
            if (response.ok) {
                window.location.href = './verify-email.html?email=' + encodeURIComponent(data.user.email);
            } else {
                alert(data.error || 'Registration failed');
            }
        } catch (err) {
            alert(err.message || 'Registration failed');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(is) {
        this.registerBtn.disabled = is;
        this.registerBtn.textContent = is ? 'Registering...' : 'Register';
    }
}

// Export for global use
window.AuthUtils = AuthUtils;
window.LoginHandler = LoginHandler;

// Initialize login handler if form exists
if (document.getElementById('loginForm')) {
    document.addEventListener('DOMContentLoaded', () => new LoginHandler());
}

// Initialize register handler if form exists
if (document.getElementById('registerForm')) {
    document.addEventListener('DOMContentLoaded', () => new RegisterHandler());
}
