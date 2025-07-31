// profile.js - Handle all profile-related functionality

class ProfileManager {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        this.profileUser = null; // The user whose profile is being viewed
        this.userPosts = [];
        this.followers = [];
        this.following = [];
        this.isOwnProfile = false;
        this.initializeEventListeners();
        this.loadProfile();
    }

    initializeEventListeners() {
        // Edit profile button
        const editProfileBtn = document.getElementById('editProfileBtn');
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => this.openEditModal());
        }

        // Follow/Unfollow button
        const followBtn = document.getElementById('followBtn');
        if (followBtn) {
            followBtn.addEventListener('click', (e) => this.handleFollowToggle(e));
        }

        // Profile form submission
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => this.handleProfileUpdate(e));
        }

        // Avatar upload
        const avatarInput = document.getElementById('avatarInput');
        if (avatarInput) {
            avatarInput.addEventListener('change', (e) => this.handleAvatarUpload(e));
        }

        // Cover photo upload
        const coverInput = document.getElementById('coverInput');
        if (coverInput) {
            coverInput.addEventListener('change', (e) => this.handleCoverUpload(e));
        }

        // Modal close functionality
        const modal = document.getElementById('editProfileModal');
        const closeBtn = document.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeEditModal());
        }
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeEditModal();
            });
        }

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e));
        });

        // Followers/Following modal
        const followersBtn = document.getElementById('followersCount');
        const followingBtn = document.getElementById('followingCount');
        
        if (followersBtn) {
            followersBtn.addEventListener('click', () => this.showFollowersModal());
        }
        if (followingBtn) {
            followingBtn.addEventListener('click', () => this.showFollowingModal());
        }
    }

    async loadProfile() {
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('userId') || this.currentUser?.id;

        if (!userId) {
            this.showNotification('No user specified', 'error');
            return;
        }

        try {
            // Load user profile
            const userResponse = await fetch(`/api/users/${userId}`);
            if (userResponse.ok) {
                this.profileUser = await userResponse.json();
                this.isOwnProfile = this.currentUser?.id === this.profileUser.id;
                this.renderProfile();
            }

            // Load user posts
            const postsResponse = await fetch(`/api/users/${userId}/posts`);
            if (postsResponse.ok) {
                this.userPosts = await postsResponse.json();
                this.renderUserPosts();
            }

            // Load followers and following
            await this.loadFollowData(userId);

        } catch (error) {
            console.error('Error loading profile:', error);
            this.showNotification('Error loading profile', 'error');
        }
    }

    async loadFollowData(userId) {
        try {
            const [followersResponse, followingResponse] = await Promise.all([
                fetch(`/api/users/${userId}/followers`),
                fetch(`/api/users/${userId}/following`)
            ]);

            if (followersResponse.ok) {
                this.followers = await followersResponse.json();
            }
            if (followingResponse.ok) {
                this.following = await followingResponse.json();
            }

            this.updateFollowCounts();
        } catch (error) {
            console.error('Error loading follow data:', error);
        }
    }

    renderProfile() {
        if (!this.profileUser) return;

        // Update profile header
        const profileHeader = document.getElementById('profileHeader');
        if (profileHeader) {
            profileHeader.innerHTML = `
                <div class="cover-photo" style="background-image: url('${this.profileUser.coverPhoto || '/images/default-cover.jpg'}')">
                    ${this.isOwnProfile ? `
                        <button class="change-cover-btn" onclick="document.getElementById('coverInput').click()">
                            <i class="fas fa-camera"></i>
                        </button>
                    ` : ''}
                </div>
                <div class="profile-info">
                    <div class="avatar-container">
                        <img src="${this.profileUser.avatar || '/images/default-avatar.png'}" 
                             alt="${this.profileUser.username}" class="profile-avatar">
                        ${this.isOwnProfile ? `
                            <button class="change-avatar-btn" onclick="document.getElementById('avatarInput').click()">
                                <i class="fas fa-camera"></i>
                            </button>
                        ` : ''}
                    </div>
                    <div class="profile-details">
                        <h1>${this.profileUser.fullName || this.profileUser.username}</h1>
                        <p class="username">@${this.profileUser.username}</p>
                        ${this.profileUser.bio ? `<p class="bio">${this.escapeHtml(this.profileUser.bio)}</p>` : ''}
                        <div class="profile-meta">
                            ${this.profileUser.location ? `
                                <span class="meta-item">
                                    <i class="fas fa-map-marker-alt"></i>
                                    ${this.escapeHtml(this.profileUser.location)}
                                </span>
                            ` : ''}
                            ${this.profileUser.website ? `
                                <span class="meta-item">
                                    <i class="fas fa-link"></i>
                                    <a href="${this.profileUser.website}" target="_blank">${this.profileUser.website}</a>
                                </span>
                            ` : ''}
                            <span class="meta-item">
                                <i class="fas fa-calendar-alt"></i>
                                Joined ${this.formatDate(this.profileUser.createdAt)}
                            </span>
                        </div>
                    </div>
                    <div class="profile-actions">
                        ${this.renderProfileActions()}
                    </div>
                </div>
            `;
        }

        // Update stats
        this.updateStats();
    }

    renderProfileActions() {
        if (this.isOwnProfile) {
            return `
                <button id="editProfileBtn" class="btn btn-secondary">
                    <i class="fas fa-edit"></i>
                    Edit Profile
                </button>
            `;
        } else {
            const isFollowing = this.followers.some(f => f.id === this.currentUser?.id);
            return `
                <button id="followBtn" class="btn ${isFollowing ? 'btn-secondary' : 'btn-primary'}" 
                        ${!this.currentUser ? 'disabled' : ''}>
                    <i class="fas fa-${isFollowing ? 'user-minus' : 'user-plus'}"></i>
                    ${isFollowing ? 'Unfollow' : 'Follow'}
                </button>
                <button class="btn btn-secondary message-btn" ${!this.currentUser ? 'disabled' : ''}>
                    <i class="fas fa-envelope"></i>
                    Message
                </button>
            `;
        }
    }

    updateStats() {
        const postsCount = document.getElementById('postsCount');
        const followersCount = document.getElementById('followersCount');
        const followingCount = document.getElementById('followingCount');

        if (postsCount) postsCount.textContent = this.userPosts.length;
        if (followersCount) followersCount.textContent = this.followers.length;
        if (followingCount) followingCount.textContent = this.following.length;
    }

    updateFollowCounts() {
        const followersCount = document.getElementById('followersCount');
        const followingCount = document.getElementById('followingCount');

        if (followersCount) followersCount.textContent = this.followers.length;
        if (followingCount) followingCount.textContent = this.following.length;
    }

    renderUserPosts() {
        const postsContainer = document.getElementById('userPostsContainer');
        if (!postsContainer) return;

        if (this.userPosts.length === 0) {
            postsContainer.innerHTML = `
                <div class="no-posts">
                    <i class="fas fa-file-alt"></i>
                    <h3>${this.isOwnProfile ? 'No posts yet' : `${this.profileUser.username} hasn't posted yet`}</h3>
                    <p>${this.isOwnProfile ? 'Share your first post!' : 'Check back later for updates.'}</p>
                </div>
            `;
            return;
        }

        postsContainer.innerHTML = this.userPosts.map(post => this.createPostHTML(post)).join('');
        this.attachPostEventListeners();
    }

    createPostHTML(post) {
        const timeAgo = this.getTimeAgo(new Date(post.createdAt));
        const isLiked = post.likes && post.likes.includes(this.currentUser?.id);
        const likesCount = post.likes ? post.likes.length : 0;
        const commentsCount = post.comments ? post.comments.length : 0;

        return `
            <div class="post profile-post" data-post-id="${post.id}">
                <div class="post-header">
                    <div class="post-time">${timeAgo}</div>
                    ${this.isOwnProfile ? `
                        <div class="post-actions">
                            <button class="btn-icon delete-post" data-post-id="${post.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>

                <div class="post-content">
                    <p>${this.escapeHtml(post.content)}</p>
                    ${post.image ? `
                        <div class="post-image">
                            <img src="${post.image}" alt="Post image" onclick="openImageModal('${post.image}')">
                        </div>
                    ` : ''}
                </div>

                <div class="post-stats">
                    <span>${likesCount} ${likesCount === 1 ? 'like' : 'likes'}</span>
                    <span>${commentsCount} ${commentsCount === 1 ? 'comment' : 'comments'}</span>
                </div>

                <div class="post-footer">
                    <button class="post-btn like-btn ${isLiked ? 'liked' : ''}" 
                            data-post-id="${post.id}" ${!this.currentUser ? 'disabled' : ''}>
                        <i class="fas fa-heart"></i>
                        <span>Like</span>
                    </button>
                    <button class="post-btn comment-btn" data-post-id="${post.id}" 
                            ${!this.currentUser ? 'disabled' : ''}>
                        <i class="fas fa-comment"></i>
                        <span>Comment</span>
                    </button>
                    <button class="post-btn share-btn" data-post-id="${post.id}">
                        <i class="fas fa-share"></i>
                        <span>Share</span>
                    </button>
                </div>

                <div class="comments-section" id="comments-${post.id}" style="display: none;">
                    <div class="comments-list">
                        ${this.renderComments(post.comments || [])}
                    </div>
                    ${this.currentUser ? `
                        <div class="comment-form">
                            <img src="${this.currentUser.avatar || '/images/default-avatar.png'}" 
                                 alt="${this.currentUser.username}" class="user-avatar small">
                            <form class="add-comment-form" data-post-id="${post.id}">
                                <input type="text" name="comment" placeholder="Write a comment..." required>
                                <button type="submit">
                                    <i class="fas fa-paper-plane"></i>
                                </button>
                            </form>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderComments(comments) {
        return comments.map(comment => `
            <div class="comment" data-comment-id="${comment.id}">
                <img src="${comment.user?.avatar || '/images/default-avatar.png'}" 
                     alt="${comment.user?.username}" class="user-avatar small">
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="username">${comment.user?.username || 'Unknown User'}</span>
                        <span class="comment-time">${this.getTimeAgo(new Date(comment.createdAt))}</span>
                    </div>
                    <p>${this.escapeHtml(comment.content)}</p>
                </div>
                ${this.currentUser?.id === comment.userId ? `
                    <button class="btn-icon delete-comment" data-comment-id="${comment.id}">
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
            </div>
        `).join('');
    }

    attachPostEventListeners() {
        // Like buttons
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleLike(e));
        });

        // Comment buttons
        document.querySelectorAll('.comment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.toggleComments(e));
        });

        // Delete post buttons
        document.querySelectorAll('.delete-post').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDeletePost(e));
        });

        // Comment forms
        document.querySelectorAll('.add-comment-form').forEach(form => {
            form.addEventListener('submit', (e) => this.handleAddComment(e));
        });
    }

    async handleFollowToggle(e) {
        e.preventDefault();
        if (!this.currentUser || !this.profileUser) return;

        const btn = e.currentTarget;
        const isFollowing = btn.textContent.trim().includes('Unfollow');

        try {
            const response = await fetch(`/api/users/${this.profileUser.id}/follow`, {
                method: isFollowing ? 'DELETE' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ followerId: this.currentUser.id })
            });

            if (response.ok) {
                // Update followers list
                if (isFollowing) {
                    this.followers = this.followers.filter(f => f.id !== this.currentUser.id);
                } else {
                    this.followers.push({
                        id: this.currentUser.id,
                        username: this.currentUser.username,
                        avatar: this.currentUser.avatar
                    });
                }

                // Update button
                btn.innerHTML = isFollowing ? 
                    '<i class="fas fa-user-plus"></i> Follow' : 
                    '<i class="fas fa-user-minus"></i> Unfollow';
                btn.className = `btn ${isFollowing ? 'btn-primary' : 'btn-secondary'}`;

                this.updateFollowCounts();
                this.showNotification(
                    isFollowing ? `Unfollowed ${this.profileUser.username}` : `Following ${this.profileUser.username}`, 
                    'success'
                );
            }
        } catch (error) {
            console.error('Error toggling follow:', error);
            this.showNotification('Error updating follow status', 'error');
        }
    }

    openEditModal() {
        if (!this.isOwnProfile) return;

        const modal = document.getElementById('editProfileModal');
        if (modal) {
            // Populate form with current data
            document.getElementById('editFullName').value = this.profileUser.fullName || '';
            document.getElementById('editBio').value = this.profileUser.bio || '';
            document.getElementById('editLocation').value = this.profileUser.location || '';
            document.getElementById('editWebsite').value = this.profileUser.website || '';

            modal.style.display = 'block';
        }
    }

    closeEditModal() {
        const modal = document.getElementById('editProfileModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async handleProfileUpdate(e) {
        e.preventDefault();
        if (!this.isOwnProfile) return;

        const formData = new FormData(e.target);
        const profileData = {
            fullName: formData.get('fullName'),
            bio: formData.get('bio'),
            location: formData.get('location'),
            website: formData.get('website')
        };

        try {
            const response = await fetch(`/api/users/${this.currentUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profileData)
            });

            if (response.ok) {
                const updatedUser = await response.json();
                this.profileUser = { ...this.profileUser, ...updatedUser };
                
                // Update localStorage if it's current user
                if (this.currentUser.id === updatedUser.id) {
                    this.currentUser = { ...this.currentUser, ...updatedUser };
                    localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                }

                this.renderProfile();
                this.closeEditModal();
                this.showNotification('Profile updated successfully!', 'success');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            this.showNotification('Error updating profile', 'error');
        }
    }

    async handleAvatarUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const base64 = await this.convertImageToBase64(file);
            const response = await fetch(`/api/users/${this.currentUser.id}/avatar`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ avatar: base64 })
            });

            if (response.ok) {
                const updatedUser = await response.json();
                this.profileUser.avatar = updatedUser.avatar;
                this.currentUser.avatar = updatedUser.avatar;
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                
                this.renderProfile();
                this.showNotification('Avatar updated successfully!', 'success');
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);
            this.showNotification('Error uploading avatar', 'error');
        }
    }

    async handleCoverUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const base64 = await this.convertImageToBase64(file);
            const response = await fetch(`/api/users/${this.currentUser.id}/cover`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ coverPhoto: base64 })
            });

            if (response.ok) {
                const updatedUser = await response.json();
                this.profileUser.coverPhoto = updatedUser.coverPhoto;
                
                this.renderProfile();
                this.showNotification('Cover photo updated successfully!', 'success');
            }
        } catch (error) {
            console.error('Error uploading cover photo:', error);
            this.showNotification('Error uploading cover photo', 'error');
        }
    }

    switchTab(e) {
        const tabName = e.target.dataset.tab;
        
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');

        // Show/hide content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });
        
        const activeContent = document.getElementById(`${tabName}Tab`);
        if (activeContent) {
            activeContent.style.display = 'block';
        }

        // Load content based on tab
        switch (tabName) {
            case 'posts':
                this.renderUserPosts();
                break;
            case 'media':
                this.renderMediaPosts();
                break;
            case 'likes':
                this.loadLikedPosts();
                break;
        }
    }

    renderMediaPosts() {
        const mediaContainer = document.getElementById('mediaContainer');
        if (!mediaContainer) return;

        const mediaPosts = this.userPosts.filter(post => post.image);
        
        if (mediaPosts.length === 0) {
            mediaContainer.innerHTML = `
                <div class="no-media">
                    <i class="fas fa-images"></i>
                    <h3>No media posts</h3>
                    <p>Photos and videos will appear here</p>
                </div>
            `;
            return;
        }

        mediaContainer.innerHTML = `
            <div class="media-grid">
                ${mediaPosts.map(post => `
                    <div class="media-item" onclick="openImageModal('${post.image}')">
                        <img src="${post.image}" alt="Media post">
                        <div class="media-overlay">
                            <span><i class="fas fa-heart"></i> ${post.likes?.length || 0}</span>
                            <span><i class="fas fa-comment"></i> ${post.comments?.length || 0}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async loadLikedPosts() {
        try {
            const response = await fetch(`/api/users/${this.profileUser.id}/liked-posts`);
            if (response.ok) {
                const likedPosts = await response.json();
                this.renderLikedPosts(likedPosts);
            }
        } catch (error) {
            console.error('Error loading liked posts:', error);
        }
    }

    renderLikedPosts(likedPosts) {
        const likesContainer = document.getElementById('likesContainer');
        if (!likesContainer) return;

        if (likedPosts.length === 0) {
            likesContainer.innerHTML = `
                <div class="no-likes">
                    <i class="fas fa-heart"></i>
                    <h3>No liked posts</h3>
                    <p>Posts you like will appear here</p>
                </div>
            `;
            return;
        }

        likesContainer.innerHTML = likedPosts.map(post => this.createPostHTML(post)).join('');
    }

    showFollowersModal() {
        this.showUserListModal('Followers', this.followers);
    }

    showFollowingModal() {
        this.showUserListModal('Following', this.following);
    }

    showUserListModal(title, users) {
        const modal = document.createElement('div');
        modal.className = 'user-list-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="user-list">
                    ${users.map(user => `
                        <div class="user-item">
                            <img src="${user.avatar || '/images/default-avatar.png'}" 
                                 alt="${user.username}" class="user-avatar">
                            <div class="user-info">
                                <span class="username">${user.username}</span>
                                <span class="full-name">${user.fullName || ''}</span>
                            </div>
                            <button class="btn btn-sm btn-primary" onclick="viewProfile('${user.id}')">
                                View Profile
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('close-modal')) {
                document.body.removeChild(modal);
            }
        });
    }

    // Utility methods
    async handleLike(e) {
        // Similar to posts.js implementation
        e.preventDefault();
        if (!this.currentUser) return;

        const postId = e.currentTarget.dataset.postId;
        const btn = e.currentTarget;
        const isLiked = btn.classList.contains('liked');

        try {
            const response = await fetch(`/api/posts/${postId}/like`, {
                method: isLiked ? 'DELETE' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: this.currentUser.id })
            });

            if (response.ok) {
                const updatedPost = await response.json();
                const postIndex = this.userPosts.findIndex(p => p.id === postId);
                if (postIndex !== -1) {
                    this.userPosts[postIndex] = updatedPost;
                }
                
                btn.classList.toggle('liked');
                const postElement = btn.closest('.post');
                const statsElement = postElement.querySelector('.post-stats span');
                const likesCount = updatedPost.likes ? updatedPost.likes.length : 0;
                statsElement.textContent = `${likesCount} ${likesCount === 1 ? 'like' : 'likes'}`;
            }
        } catch (error) {
            console.error('Error handling like:', error);
            this.showNotification('Error updating like', 'error');
        }
    }

    toggleComments(e) {
        const postId = e.currentTarget.dataset.postId;
        const commentsSection = document.getElementById(`comments-${postId}`);
        
        if (commentsSection.style.display === 'none') {
            commentsSection.style.display = 'block';
            e.currentTarget.classList.add('active');
        } else {
            commentsSection.style.display = 'none';
            e.currentTarget.classList.remove('active');
        }
    }

    async handleDeletePost(e) {
        e.preventDefault();
        const postId = e.currentTarget.dataset.postId;

        if (!confirm('Are you sure you want to delete this post?')) return;

        try {
            const response = await fetch(`/api/posts/${postId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.userPosts = this.userPosts.filter(p => p.id !== postId);
                this.renderUserPosts();
                this.updateStats();
                this.showNotification('Post deleted successfully', 'success');
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            this.showNotification('Error deleting post', 'error');
        }
    }

    async handleAddComment(e) {
        e.preventDefault();
        if (!this.currentUser) return;

        const form = e.target;
        const postId = form.dataset.postId;
        const commentContent = form.comment.value.trim();

        if (!commentContent) return;

        try {
            const response = await fetch(`/api/posts/${postId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: commentContent,
                    userId: this.currentUser.id
                })
            });

            if (response.ok) {
                const updatedPost = await response.json();
                const postIndex = this.userPosts.findIndex(p => p.id === postId);
                if (postIndex !== -1) {
                    this.userPosts[postIndex] = updatedPost;
                }

                const commentsSection = document.getElementById(`comments-${postId}`);
                const commentsList = commentsSection.querySelector('.comments-list');
                commentsList.innerHTML = this.renderComments(updatedPost.comments || []);

                const postElement = form.closest('.post');
                const statsSpans = postElement.querySelectorAll('.post-stats span');
                const commentsCount = updatedPost.comments ? updatedPost.comments.length : 0;
                statsSpans[1].textContent = `${commentsCount} ${commentsCount === 1 ? 'comment' : 'comments'}`;

                form.reset();
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            this.showNotification('Error adding comment', 'error');
        }
    }

    convertImageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;
        
        return date.toLocaleDateString();
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long' 
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Global functions
function viewProfile(userId) {
    window.location.href = `/profile.html?userId=${userId}`;
}

function openImageModal(imageSrc) {
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <div class="image-modal-content">
            <span class="image-modal-close">&times;</span>
            <img src="${imageSrc}" alt="Full size image">
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('image-modal-close')) {
            document.body.removeChild(modal);
        }
    });
}

// Initialize ProfileManager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.profileManager = new ProfileManager();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfileManager;
}