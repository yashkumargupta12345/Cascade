// Function to check if user is logged in
async function checkAuth() {
    const token = localStorage.getItem('token');
    const currentUser = JSON.parse(localStorage.getItem('user'));
    
    if (!token || !currentUser) {
        return null;
    }
    
    try {
        const response = await fetch('http://localhost:3000/api/users/' + currentUser.id + '/todos', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                logout();
                return null;
            }
            throw new Error('Failed to verify authentication');
        }
        
        return currentUser;
    } catch (error) {
        console.error('Auth check failed:', error);
        return null;
    }
}

const API_URL = 'http://localhost:3000';

// Function to handle login
async function login(event) {
    event.preventDefault();
    
    // Disable form submission while processing
    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    
    try {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Store the token and user data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showNotification('Login successful!');
            
            // Redirect to main page after a short delay
            setTimeout(() => {
                window.location.href = '/';
            }, 500);
        } else {
            showNotification(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('An error occurred. Please try again.', 'error');
    } finally {
        submitButton.disabled = false;
    }
}

// Function to handle signup
async function signup(event) {
    event.preventDefault();
    
    // Disable form submission while processing
    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    
    try {
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        if (!name || !email || !password) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        if (password.length < 6) {
            showNotification('Password must be at least 6 characters long', 'error');
            return;
        }

        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Account created successfully!');
            
            // Redirect to login page after a short delay
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 1000);
        } else {
            showNotification(data.message || 'Signup failed', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showNotification('An error occurred. Please try again.', 'error');
    } finally {
        submitButton.disabled = false;
    }
}

// Function to check authentication status
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// Function to parse JWT token
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(window.atob(base64));
    } catch (e) {
        return null;
    }
}

// Function to check if token is expired
function isTokenExpired(token) {
    const decodedToken = parseJwt(token);
    if (!decodedToken) return true;
    
    const currentTime = Date.now() / 1000;
    return decodedToken.exp < currentTime;
}

// Function to handle logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// Check for registration success message
document.addEventListener('DOMContentLoaded', function() {
    const errorMessage = document.getElementById('errorMessage');
    if (!errorMessage) return;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('registered') === 'true') {
        errorMessage.textContent = 'Registration successful! Please login.';
        errorMessage.style.display = 'block';
        errorMessage.style.backgroundColor = '#00b894';
    }

    // Clear registration parameter from URL
    if (urlParams.has('registered')) {
        window.history.replaceState({}, '', '/login.html');
    }

    // If we're on index.html, check for token
    if (window.location.pathname.includes('index.html')) {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
        }
    }
});
