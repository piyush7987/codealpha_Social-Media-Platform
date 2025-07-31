// Authentication JavaScript
let isLoginMode = true;

// Configuration - Update these URLs to match your backend
const API_BASE_URL = 'http://localhost:3000/api';
const AUTH_ENDPOINTS = {
    login: `${API_BASE_URL}/auth/login`,
    register: `${API_BASE_URL}/auth/register`,
    forgotPassword: `${API_BASE_URL}/auth/forgot-password`
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeFormInteractions();
    checkExistingAuth();
});

// Tab switching functionality
function switchTab(mode) {
    const loginTab = document.querySelector('.tab-btn:first-child');
    const registerTab = document.querySelector('.tab-btn:last-child');
    const registerFields = document.getElementById('registerFields');
    const submitBtn = document.getElementById('submitBtn');
    const formTitle = document.querySelector('.form-title');
    const formSubtitle = document.querySelector('.form-subtitle');

    if (mode === 'login') {
        isLoginMode = true;
        loginTab?.classList.add('active');
        registerTab?.classList.remove('active');
        registerFields?.classList.remove('active');
        if (submitBtn) submitBtn.textContent = 'Sign In';
        if (formTitle) formTitle.textContent = 'Welcome Back';
        if (formSubtitle) formSubtitle.textContent = 'Sign in to continue your journey';
        
        // Clear register-only field requirements
        clearFieldValidation();
    } else {
        isLoginMode = false;
        registerTab?.classList.add('active');
        loginTab?.classList.remove('active');
        registerFields?.classList.add('active');
        if (submitBtn) submitBtn.textContent = 'Create Account';
        if (formTitle) formTitle.textContent = 'Join SocialApp';
        if (formSubtitle) formSubtitle.textContent = 'Create your account and start connecting';
        
        // Clear all validations when switching
        clearFieldValidation();
    }
}

// Password visibility toggle
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.querySelector('.password-toggle');
    
    if (passwordInput && toggleBtn) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleBtn.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            toggleBtn.textContent = '👁️';
        }
    }
}

// Form submission handler
async function handleSubmit(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');
    
    if (!emailField || !passwordField) {
        showMessage('Required form fields not found', 'error');
        return;
    }
    
    const email = emailField.value.trim();
    const password = passwordField.value;
    
    // Validate form before submission
    if (!validateForm()) {
        return;
    }
    
    // Add loading state
    setLoadingState(submitBtn, true);
    
    try {
        if (isLoginMode) {
            await handleLogin(email, password);
        } else {
            const fullNameField = document.getElementById('fullName');
            const usernameField = document.getElementById('username');
            const confirmPasswordField = document.getElementById('confirmPassword');
            
            const fullName = fullNameField ? fullNameField.value.trim() : '';
            const username = usernameField ? usernameField.value.trim() : '';
            const confirmPassword = confirmPasswordField ? confirmPasswordField.value : '';
            
            await handleRegister(email, password, fullName, username, confirmPassword);
        }
    } catch (error) {
        console.error('Authentication error:', error);
        showMessage(error.message || 'An error occurred. Please try again.', 'error');
    } finally {
        setLoadingState(submitBtn, false);
    }
}

// Handle login
async function handleLogin(email, password) {
    try {
        const response = await fetch(AUTH_ENDPOINTS.login, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store authentication token (in a real app, use secure storage)
            setAuthToken(data.token);
            setCurrentUser(data.user);
            
            showMessage('Login successful! Welcome back!', 'success');
            
            // Redirect to dashboard after short delay
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1500);
        } else {
            throw new Error(data.message || 'Login failed');
        }
    } catch (error) {
        if (error.name === 'TypeError') {
            // Network error or server not running - fallback to local auth
            handleLocalLogin(email, password);
        } else {
            throw error;
        }
    }
}

// Handle registration
async function handleRegister(email, password, fullName, username, confirmPassword) {
    // Additional validation for registration
    if (password !== confirmPassword) {
        showMessage('Passwords do not match!', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters long!', 'error');
        return;
    }
    
    try {
        const response = await fetch(AUTH_ENDPOINTS.register, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password,
                fullName,
                username
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Account created successfully! Please sign in.', 'success');
            
            // Switch to login mode after successful registration
            setTimeout(() => {
                switchTab('login');
                // Pre-fill email for convenience
                const emailField = document.getElementById('email');
                if (emailField) emailField.value = email;
            }, 1500);
        } else {
            throw new Error(data.message || 'Registration failed');
        }
    } catch (error) {
        if (error.name === 'TypeError') {
            // Network error or server not running - fallback to local auth
            handleLocalRegister(email, password, fullName, username, confirmPassword);
        } else {
            throw error;
        }
    }
}

// Local authentication fallback (for demo purposes)
function handleLocalLogin(email, password) {
    const users = getLocalUsers();
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        setCurrentUser(user);
        showMessage('Login successful! (Local mode)', 'success');
        
        // Trigger app to show main interface if function exists
        if (typeof showApp === 'function') {
            setTimeout(showApp, 1000);
        }
    } else {
        showMessage('Invalid email or password', 'error');
    }
}

function handleLocalRegister(email, password, fullName, username, confirmPassword) {
    const users = getLocalUsers();
    
    // Check if user already exists
    if (users.find(u => u.email === email)) {
        showMessage('Email already registered', 'error');
        return;
    }
    
    if (users.find(u => u.username === username)) {
        showMessage('Username already taken', 'error');
        return;
    }
    
    // Create new user
    const newUser = {
        id: users.length + 1,
        email,
        password,
        fullName: fullName || username,
        username: username || email.split('@')[0],
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    setLocalUsers(users);
    
    showMessage('Account created successfully! Please sign in.', 'success');
    
    setTimeout(() => {
        switchTab('login');
        const emailField = document.getElementById('email');
        if (emailField) emailField.value = email;
    }, 1500);
}

// Form validation
function validateForm() {
    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');
    
    if (!emailField || !passwordField) {
        showMessage('Required form fields not found', 'error');
        return false;
    }
    
    const email = emailField.value.trim();
    const password = passwordField.value;
    let isValid = true;
    
    // Email validation
    if (!email || !isValidEmail(email)) {
        setFieldError('email', 'Please enter a valid email address');
        isValid = false;
    } else {
        clearFieldError('email');
    }
    
    // Password validation
    if (!password || password.length < 6) {
        setFieldError('password', 'Password must be at least 6 characters long');
        isValid = false;
    } else {
        clearFieldError('password');
    }
    
    // Additional validation for registration
    if (!isLoginMode) {
        const fullNameField = document.getElementById('fullName');
        const usernameField = document.getElementById('username');
        const confirmPasswordField = document.getElementById('confirmPassword');
        
        if (fullNameField) {
            const fullName = fullNameField.value.trim();
            if (!fullName || fullName.length < 2) {
                setFieldError('fullName', 'Please enter your full name');
                isValid = false;
            } else {
                clearFieldError('fullName');
            }
        }
        
        if (usernameField) {
            const username = usernameField.value.trim();
            if (!username || username.length < 3) {
                setFieldError('username', 'Username must be at least 3 characters long');
                isValid = false;
            } else {
                clearFieldError('username');
            }
        }
        
        if (confirmPasswordField) {
            const confirmPassword = confirmPasswordField.value;
            if (password !== confirmPassword) {
                setFieldError('confirmPassword', 'Passwords do not match');
                isValid = false;
            } else {
                clearFieldError('confirmPassword');
            }
        }
    }
    
    return isValid;
}

// Email validation helper
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Field error handling
function setFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    const fieldGroup = field.parentElement;
    
    field.classList.add('error');
    field.classList.remove('success');
    
    // Remove existing error message
    const existingError = fieldGroup.querySelector('.validation-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Add new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'validation-message error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = 'color: #e74c3c; font-size: 12px; margin-top: 5px;';
    fieldGroup.appendChild(errorDiv);
}

function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    const fieldGroup = field.parentElement;
    
    field.classList.remove('error');
    field.classList.add('success');
    
    const errorMessage = fieldGroup.querySelector('.validation-message');
    if (errorMessage) {
        errorMessage.remove();
    }
}

function clearFieldValidation() {
    const fields = document.querySelectorAll('.form-input, input, textarea');
    fields.forEach(field => {
        field.classList.remove('error', 'success');
    });
    
    const messages = document.querySelectorAll('.validation-message');
    messages.forEach(message => message.remove());
}

// Loading state management
function setLoadingState(button, isLoading) {
    if (!button) return;
    
    if (isLoading) {
        button.classList.add('loading');
        button.textContent = isLoginMode ? 'Signing In...' : 'Creating Account...';
        button.disabled = true;
        button.style.opacity = '0.7';
    } else {
        button.classList.remove('loading');
        button.textContent = isLoginMode ? 'Sign In' : 'Create Account';
        button.disabled = false;
        button.style.opacity = '1';
    }
}

// Message display system
function showMessage(text, type = 'info') {
    // Try to use existing notification system first
    if (typeof showNotification === 'function') {
        showNotification(text, type);
        return;
    }
    
    // Fallback to custom message display
    let messageContainer = document.getElementById('messageContainer');
    
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'messageContainer';
        messageContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
        `;
        document.body.appendChild(messageContainer);
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    messageDiv.style.cssText = `
        padding: 12px 20px;
        margin-bottom: 10px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        animation: slideIn 0.3s ease;
        background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    messageContainer.appendChild(messageDiv);
    
    // Auto-remove message after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentElement) {
            messageDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => messageDiv.remove(), 300);
        }
    }, 5000);
}

// Social login handlers
function socialLogin(provider) {
    showMessage(`${provider} login integration coming soon!`, 'warning');
    
    // In a real app, you would redirect to OAuth provider
    // window.location.href = `/auth/${provider}`;
}

// Forgot password handler
function showForgotPassword() {
    const emailField = document.getElementById('email');
    const email = emailField ? emailField.value.trim() : '';
    
    if (!email) {
        showMessage('Please enter your email address first', 'warning');
        if (emailField) emailField.focus();
        return;
    }
    
    if (!isValidEmail(email)) {
        showMessage('Please enter a valid email address', 'error');
        return;
    }
    
    // Here you would typically send a password reset email
    showMessage('Password reset link sent to your email!', 'success');
    
    // In a real app:
    // fetch(AUTH_ENDPOINTS.forgotPassword, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ email })
    // });
}

// Initialize form interactions
function initializeFormInteractions() {
    // Add interactive effects to form inputs
    document.querySelectorAll('.form-input, input, textarea').forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'scale(1.02)';
            this.parentElement.style.transition = 'transform 0.2s ease';
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'scale(1)';
        });
        
        // Real-time validation
        input.addEventListener('input', function() {
            // Clear previous error state when user starts typing
            if (this.classList.contains('error')) {
                this.classList.remove('error');
                const errorMessage = this.parentElement.querySelector('.validation-message');
                if (errorMessage) {
                    errorMessage.remove();
                }
            }
        });
    });
    
    // Password strength indicator (for registration)
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            if (!isLoginMode) {
                updatePasswordStrength(this.value);
            }
        });
    }
}

// Password strength indicator
function updatePasswordStrength(password) {
    // Create strength indicator if it doesn't exist
    let strengthIndicator = document.querySelector('.password-strength');
    const passwordField = document.getElementById('password');
    
    if (!strengthIndicator && !isLoginMode && passwordField) {
        strengthIndicator = document.createElement('div');
        strengthIndicator.className = 'password-strength';
        strengthIndicator.innerHTML = '<div class="password-strength-bar"></div>';
        strengthIndicator.style.cssText = `
            margin-top: 8px;
            height: 4px;
            background: #eee;
            border-radius: 2px;
            overflow: hidden;
        `;
        passwordField.parentElement.appendChild(strengthIndicator);
    }
    
    if (!strengthIndicator) return;
    
    const strengthBar = strengthIndicator.querySelector('.password-strength-bar');
    if (!strengthBar) return;
    
    let strength = 0;
    
    // Check password criteria
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    // Update strength bar
    strengthBar.className = 'password-strength-bar';
    strengthBar.style.cssText = `
        height: 100%;
        transition: all 0.3s ease;
        width: ${(strength / 6) * 100}%;
    `;
    
    if (strength < 3) {
        strengthBar.style.background = '#e74c3c';
        strengthIndicator.setAttribute('data-strength', 'weak');
    } else if (strength < 5) {
        strengthBar.style.background = '#f39c12';
        strengthIndicator.setAttribute('data-strength', 'medium');
    } else {
        strengthBar.style.background = '#27ae60';
        strengthIndicator.setAttribute('data-strength', 'strong');
    }
}

// Check existing authentication
function checkExistingAuth() {
    const token = getAuthToken();
    const user = getCurrentUser();
    
    if (token && user) {
        // User is already authenticated
        if (typeof showApp === 'function') {
            showApp();
        }
    }
}

// Authentication token management (using variables instead of localStorage)
function setAuthToken(token) {
    window.authToken = token;
}

function getAuthToken() {
    return window.authToken || null;
}

function clearAuthToken() {
    window.authToken = null;
}

// User management (using variables instead of localStorage)
function setCurrentUser(user) {
    window.currentUserAuth = user;
}

function getCurrentUser() {
    return window.currentUserAuth || null;
}

function clearCurrentUser() {
    window.currentUserAuth = null;
}

// Local users management (for demo purposes)
function getLocalUsers() {
    return window.localUsers || [
        { id: 1, username: 'demo', email: 'demo@example.com', password: 'demo123', fullName: 'Demo User' }
    ];
}

function setLocalUsers(users) {
    window.localUsers = users;
}

// Logout functionality
function logout() {
    clearAuthToken();
    clearCurrentUser();
    
    // Clear password strength indicator
    const strengthIndicator = document.querySelector('.password-strength');
    if (strengthIndicator) {
        strengthIndicator.remove();
    }
    
    showMessage('Logged out successfully', 'success');
    
    // Redirect to login or refresh page
    setTimeout(() => {
        if (typeof showAuth === 'function') {
            showAuth();
        } else {
            window.location.reload();
        }
    }, 1000);
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        switchTab,
        togglePassword,
        handleSubmit,
        socialLogin,
        showForgotPassword,
        logout,
        getCurrentUser,
        setCurrentUser,
        getAuthToken,
        setAuthToken
    };
}