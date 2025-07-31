// Social Media Platform - Frontend JavaScript
// Main application logic and API interactions

class SocialMediaApp {
    constructor() {
        this.currentUser = null;
        this.posts = [];
        this.users = [];
        this.apiBase = '/api';
        this.init();
    }

    // Initialize the application
    async init() {
        await this.loadCurrentUser();
        await this.loadPosts();
        await this.loadUsers();
        this.setupEventListeners();
        this.updateUI();
    }

    // Setup all event listeners
    setupEventListeners() {
        // Post form submission
        const postForm = document.getElementById('postForm');
        if (postForm) {
            postForm.addEventListener('submit', this.handlePostSubmit.bind(this));
        }

        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', this.handleRegister.bind(this));
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }

        // Profile update form
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', this.handleProfileUpdate.bind(this));
        }

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.handleSearch.bind(this));
        }

        // Modal controls
        this.setupModalControls();

        // Real-time updates (polling)
        setInterval(() => {
            this.loadPosts();
        }, 30000); // Refresh posts every 30 seconds
    }

    // Setup modal controls
    setupModalControls() {
        const modals = document.querySelectorAll('.modal');
        const closeButtons = document.querySelectorAll('.close');

        closeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });

        window.addEventListener('click', (e) => {
            modals.forEach(modal => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }

    // API Methods
    async makeRequest(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.apiBase}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            this.showError('Network error. Please try again.');
            throw error;
        }
    }

    // Load current user
    async loadCurrentUser() {
        try {
            const user = await this.makeRequest('/user/current');
            this.currentUser = user;
        } catch (error) {
            console.log('No current user logged in');
        }
    }

    // Load all posts
    async loadPosts() {
        try {
            this.posts = await this.makeRequest('/posts');
            this.renderPosts();
        } catch (error) {
            this.showError('Failed to load posts');
        }
    }

    // Load all users for suggestions
    async loadUsers() {
        try {
            this.users = await this.makeRequest('/users');
            this.renderUserSuggestions();
        } catch (error) {
            console.error('Failed to load users');
        }
    }

    // Authentication Methods
    async handleLogin(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const loginData = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        try {
            this.showLoading('Logging in...');
            const response = await this.makeRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify(loginData)
            });

            this.currentUser = response.user;
            this.showSuccess('Logged in successfully!');
            this.hideModal('loginModal');
            this.updateUI();
            await this.loadPosts();
        } catch (error) {
            this.showError('Login failed. Please check your credentials.');
        } finally {
            this.hideLoading();
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const registerData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            fullName: formData.get('fullName')
        };

        // Basic validation
        if (registerData.password.length < 6) {
            this.showError('Password must be at least 6 characters long');
            return;
        }

        try {
            this.showLoading('Creating account...');
            const response = await this.makeRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify(registerData)
            });

            this.currentUser = response.user;
            this.showSuccess('Account created successfully!');
            this.hideModal('registerModal');
            this.updateUI();
            await this.loadPosts();
        } catch (error) {
            this.showError('Registration failed. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async handleLogout() {
        try {
            await this.makeRequest('/auth/logout', { method: 'POST' });
            this.currentUser = null;
            this.showSuccess('Logged out successfully!');
            this.updateUI();
            this.loadPosts(); // Load public posts
        } catch (error) {
            this.showError('Logout failed');
        }
    }

    // Post Methods
    async handlePostSubmit(e) {
        e.preventDefault();
        if (!this.currentUser) {
            this.showError('Please log in to create posts');
            return;
        }

        const formData = new FormData(e.target);
        const postData = {
            content: formData.get('content'),
            image: formData.get('image') // Handle file upload if needed
        };

        if (!postData.content.trim()) {
            this.showError('Post content cannot be empty');
            return;
        }

        try {
            this.showLoading('Creating post...');
            const newPost = await this.makeRequest('/posts', {
                method: 'POST',
                body: JSON.stringify(postData)
            });

            this.posts.unshift(newPost);
            this.renderPosts();
            e.target.reset();
            this.showSuccess('Post created successfully!');
        } catch (error) {
            this.showError('Failed to create post');
        } finally {
            this.hideLoading();
        }
    }

    async handleLike(postId) {
        if (!this.currentUser) {
            this.showError('Please log in to like posts');
            return;
        }

        try {
            const response = await this.makeRequest(`/posts/${postId}/like`, {
                method: 'POST'
            });

            // Update the post in local state
            const postIndex = this.posts.findIndex(p => p.id === postId);
            if (postIndex !== -1) {
                this.posts[postIndex] = response.post;
                this.renderPosts();
            }
        } catch (error) {
            this.showError('Failed to like post');
        }
    }

    async handleFollow(userId) {
        if (!this.currentUser) {
            this.showError('Please log in to follow users');
            return;
        }

        try {
            const response = await this.makeRequest(`/users/${userId}/follow`, {
                method: 'POST'
            });

            this.showSuccess(response.message);
            await this.loadUsers(); // Refresh user list
            await this.loadCurrentUser(); // Update current user data
        } catch (error) {
            this.showError('Failed to follow user');
        }
    }

    async handleComment(postId, content) {
        if (!this.currentUser) {
            this.showError('Please log in to comment');
            return;
        }

        if (!content.trim()) {
            this.showError('Comment cannot be empty');
            return;
        }

        try {
            const response = await this.makeRequest(`/posts/${postId}/comments`, {
                method: 'POST',
                body: JSON.stringify({ content })
            });

            // Update the post with new comment
            const postIndex = this.posts.findIndex(p => p.id === postId);
            if (postIndex !== -1) {
                this.posts[postIndex].comments = response.comments;
                this.renderPosts();
            }
        } catch (error) {
            this.showError('Failed to add comment');
        }
    }

    // Profile Methods
    async handleProfileUpdate(e) {
        e.preventDefault();
        if (!this.currentUser) return;

        const formData = new FormData(e.target);
        const profileData = {
            fullName: formData.get('fullName'),
            bio: formData.get('bio'),
            avatar: formData.get('avatar') // Handle file upload if needed
        };

        try {
            this.showLoading('Updating profile...');
            const updatedUser = await this.makeRequest('/user/profile', {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });

            this.currentUser = updatedUser;
            this.showSuccess('Profile updated successfully!');
            this.hideModal('profileModal');
            this.updateUI();
        } catch (error) {
            this.showError('Failed to update profile');
        } finally {
            this.hideLoading();
        }
    }

    // Search functionality
    handleSearch(e) {
        const query = e.target.value.toLowerCase();
        const filteredPosts = this.posts.filter(post => 
            post.content.toLowerCase().includes(query) ||
            post.author.username.toLowerCase().includes(query) ||
            post.author.fullName.toLowerCase().includes(query)
        );
        this.renderPosts(filteredPosts);
    }

    // UI Rendering Methods
    updateUI() {
        this.renderUserProfile();
        this.renderNavigation();
        this.renderPosts();
        this.renderUserSuggestions();
    }

    renderUserProfile() {
        const profileSection = document.querySelector('.user-profile');
        if (!profileSection) return;

        if (this.currentUser) {
            profileSection.innerHTML = `
                <div class="profile-avatar">
                    ${this.getAvatarContent(this.currentUser)}
                </div>
                <div class="profile-name">${this.currentUser.fullName}</div>
                <div class="profile-handle">@${this.currentUser.username}</div>
                <div class="profile-stats">
                    <div class="stat">
                        <span class="stat-number">${this.currentUser.postsCount || 0}</span>
                        <span class="stat-label">Posts</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${this.currentUser.followersCount || 0}</span>
                        <span class="stat-label">Followers</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${this.currentUser.followingCount || 0}</span>
                        <span class="stat-label">Following</span>
                    </div>
                </div>
                <button class="btn btn-secondary btn-small mt-2" onclick="app.showModal('profileModal')">
                    Edit Profile
                </button>
            `;
        } else {
            profileSection.innerHTML = `
                <div class="profile-avatar">?</div>
                <div class="profile-name">Welcome!</div>
                <div class="mt-2">
                    <button class="btn btn-small mb-1" onclick="app.showModal('loginModal')">Login</button>
                    <button class="btn btn-secondary btn-small" onclick="app.showModal('registerModal')">Sign Up</button>
                </div>
            `;
        }
    }

    renderNavigation() {
        const authSection = document.querySelector('.nav-auth');
        if (!authSection) return;

        if (this.currentUser) {
            authSection.innerHTML = `
                <span>Welcome, ${this.currentUser.fullName}!</span>
                <button id="logoutBtn" class="btn btn-secondary">Logout</button>
            `;
            // Re-attach logout event listener
            document.getElementById('logoutBtn').addEventListener('click', this.handleLogout.bind(this));
        } else {
            authSection.innerHTML = `
                <button class="btn" onclick="app.showModal('loginModal')">Login</button>
                <button class="btn btn-secondary" onclick="app.showModal('registerModal')">Sign Up</button>
            `;
        }
    }

    renderPosts(postsToRender = this.posts) {
        const postsContainer = document.querySelector('.posts-container');
        if (!postsContainer) return;

        if (postsToRender.length === 0) {
            postsContainer.innerHTML = `
                <div class="post text-center">
                    <h3>No posts yet!</h3>
                    <p>Be the first to share something amazing.</p>
                </div>
            `;
            return;
        }

        postsContainer.innerHTML = postsToRender.map(post => this.renderPost(post)).join('');
        
        // Add event listeners for post actions
        this.attachPostEventListeners();
    }

    renderPost(post) {
        const isLiked = this.currentUser && post.likes.includes(this.currentUser.id);
        const isFollowing = this.currentUser && this.currentUser.following && 
                           this.currentUser.following.includes(post.author.id);
        
        return `
            <div class="post fade-in" data-post-id="${post.id}">
                <div class="post-header">
                    <div class="post-avatar">
                        ${this.getAvatarContent(post.author)}
                    </div>
                    <div class="post-info">
                        <h3>${post.author.fullName}</h3>
                        <span class="post-time">@${post.author.username} • ${this.formatTime(post.createdAt)}</span>
                    </div>
                    ${this.currentUser && post.author.id !== this.currentUser.id ? `
                        <button class="btn btn-small action-btn follow-btn ${isFollowing ? 'followed' : ''}" 
                                data-user-id="${post.author.id}">
                            ${isFollowing ? 'Following' : 'Follow'}
                        </button>
                    ` : ''}
                </div>
                
                <div class="post-content">
                    ${post.content}
                </div>
                
                ${post.image ? `<img src="${post.image}" alt="Post image" class="post-image">` : ''}
                
                <div class="post-actions">
                    <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post.id}">
                        ❤️ ${post.likes.length} ${post.likes.length === 1 ? 'like' : 'likes'}
                    </button>
                    <button class="action-btn comment-btn" data-post-id="${post.id}">
                        💬 ${post.comments.length} ${post.comments.length === 1 ? 'comment' : 'comments'}
                    </button>
                    <button class="action-btn share-btn" data-post-id="${post.id}">
                        🔗 Share
                    </button>
                </div>
                
                <div class="comments-section">
                    ${post.comments.map(comment => this.renderComment(comment)).join('')}
                    
                    ${this.currentUser ? `
                        <div class="comment-form">
                            <input type="text" class="comment-input" placeholder="Write a comment..." 
                                   data-post-id="${post.id}">
                            <button class="btn btn-small comment-submit" data-post-id="${post.id}">Post</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderComment(comment) {
        return `
            <div class="comment">
                <div class="comment-header">
                    <span class="comment-author">${comment.author.fullName}</span>
                    <span class="comment-time">${this.formatTime(comment.createdAt)}</span>
                </div>
                <div class="comment-content">${comment.content}</div>
            </div>
        `;
    }

    renderUserSuggestions() {
        const suggestionsContainer = document.querySelector('.suggestions');
        if (!suggestionsContainer || !this.users.length) return;

        const suggestedUsers = this.users
            .filter(user => this.currentUser ? user.id !== this.currentUser.id : true)
            .filter(user => !this.currentUser || !this.currentUser.following || 
                           !this.currentUser.following.includes(user.id))
            .slice(0, 5);

        if (suggestedUsers.length === 0) {
            suggestionsContainer.innerHTML = `
                <h3>Suggestions</h3>
                <p class="text-center">No new suggestions</p>
            `;
            return;
        }

        suggestionsContainer.innerHTML = `
            <h3>Who to follow</h3>
            ${suggestedUsers.map(user => `
                <div class="suggestion-item">
                    <div class="suggestion-avatar">
                        ${this.getAvatarContent(user)}
                    </div>
                    <div class="suggestion-info">
                        <div class="suggestion-name">${user.fullName}</div>
                        <div class="suggestion-handle">@${user.username}</div>
                    </div>
                    ${this.currentUser ? `
                        <button class="btn btn-small follow-btn" data-user-id="${user.id}">
                            Follow
                        </button>
                    ` : ''}
                </div>
            `).join('')}
        `;

        // Attach follow event listeners
        suggestionsContainer.querySelectorAll('.follow-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.dataset.userId;
                this.handleFollow(userId);
            });
        });
    }

    // Utility Methods
    attachPostEventListeners() {
        // Like buttons
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const postId = e.target.dataset.postId;
                this.handleLike(postId);
            });
        });

        // Follow buttons
        document.querySelectorAll('.follow-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.dataset.userId;
                this.handleFollow(userId);
            });
        });

        // Comment submission
        document.querySelectorAll('.comment-submit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const postId = e.target.dataset.postId;
                const input = e.target.parentElement.querySelector('.comment-input');
                const content = input.value.trim();
                if (content) {
                    this.handleComment(postId, content);
                    input.value = '';
                }
            });
        });

        // Comment input enter key
        document.querySelectorAll('.comment-input').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const postId = e.target.dataset.postId;
                    const content = e.target.value.trim();
                    if (content) {
                        this.handleComment(postId, content);
                        e.target.value = '';
                    }
                }
            });
        });
    }

    getAvatarContent(user) {
        if (user.avatar) {
            return `<img src="${user.avatar}" alt="${user.fullName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        }
        return user.fullName.charAt(0).toUpperCase();
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d`;
        if (hours > 0) return `${hours}h`;
        if (minutes > 0) return `${minutes}m`;
        return 'now';
    }

    // Modal Methods
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Notification Methods
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Remove existing notification
        const existing = document.querySelector('.notification');
        if (existing) {
            existing.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            z-index: 9999;
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
        `;

        if (type === 'success') {
            notification.style.background = 'linear-gradient(45deg, #2ecc71, #27ae60)';
        } else if (type === 'error') {
            notification.style.background = 'linear-gradient(45deg, #e74c3c, #c0392b)';
        } else {
            notification.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    showLoading(message = 'Loading...') {
        this.hideLoading(); // Remove any existing loader
        
        const loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.className = 'loading';
        loader.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div style="border: 4px solid rgba(102, 126, 234, 0.3); border-radius: 50%; border-top: 4px solid #667eea; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
                <p>${message}</p>
            </div>
        `;
        
        // Add spin animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(loader);
    }

    hideLoading() {
        const loader = document.getElementById('globalLoader');
        if (loader) {
            loader.remove();
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SocialMediaApp();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SocialMediaApp;
}