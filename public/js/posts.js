// posts.js - Handle all post-related functionality

class PostManager {
    constructor() {
        this.posts = [];
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        this.initializeEventListeners();
        this.loadPosts();
    }

    initializeEventListeners() {
        // Post creation form
        const postForm = document.getElementById('postForm');
        if (postForm) {
            postForm.addEventListener('submit', (e) => this.handleCreatePost(e));
        }

        // Image upload preview
        const imageInput = document.getElementById('postImage');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => this.handleImagePreview(e));
        }

        // Modal close functionality
        const modal = document.getElementById('postModal');
        const closeBtn = document.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closePostModal());
        }
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closePostModal();
            });
        }
    }

    async loadPosts() {
        try {
            const response = await fetch('/api/posts');
            if (response.ok) {
                this.posts = await response.json();
                this.renderPosts();
            }
        } catch (error) {
            console.error('Error loading posts:', error);
            this.showNotification('Error loading posts', 'error');
        }
    }

    async handleCreatePost(e) {
        e.preventDefault();
        
        if (!this.currentUser) {
            this.showNotification('Please login to create a post', 'error');
            return;
        }

        const formData = new FormData(e.target);
        const postData = {
            content: formData.get('content'),
            userId: this.currentUser.id
        };

        // Handle image upload if present
        const imageFile = formData.get('image');
        if (imageFile && imageFile.size > 0) {
            postData.image = await this.convertImageToBase64(imageFile);
        }

        try {
            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(postData)
            });

            if (response.ok) {
                const newPost = await response.json();
                this.posts.unshift(newPost);
                this.renderPosts();
                this.resetPostForm();
                this.closePostModal();
                this.showNotification('Post created successfully!', 'success');
            } else {
                throw new Error('Failed to create post');
            }
        } catch (error) {
            console.error('Error creating post:', error);
            this.showNotification('Error creating post', 'error');
        }
    }

    renderPosts() {
        const postsContainer = document.getElementById('postsContainer');
        if (!postsContainer) return;

        if (this.posts.length === 0) {
            postsContainer.innerHTML = `
                <div class="no-posts">
                    <h3>No posts yet</h3>
                    <p>Be the first to share something!</p>
                </div>
            `;
            return;
        }

        postsContainer.innerHTML = this.posts.map(post => this.createPostHTML(post)).join('');
        this.attachPostEventListeners();
    }

    createPostHTML(post) {
        const timeAgo = this.getTimeAgo(new Date(post.createdAt));
        const isLiked = post.likes && post.likes.includes(this.currentUser?.id);
        const likesCount = post.likes ? post.likes.length : 0;
        const commentsCount = post.comments ? post.comments.length : 0;

        return `
            <div class="post" data-post-id="${post.id}">
                <div class="post-header">
                    <div class="user-info">
                        <img src="${post.user?.avatar || '/images/default-avatar.png'}" 
                             alt="${post.user?.username}" class="user-avatar">
                        <div class="user-details">
                            <span class="username">${post.user?.username || 'Unknown User'}</span>
                            <span class="post-time">${timeAgo}</span>
                        </div>
                    </div>
                    ${this.currentUser?.id === post.userId ? `
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

        // Share buttons
        document.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleShare(e));
        });

        // Delete post buttons
        document.querySelectorAll('.delete-post').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDeletePost(e));
        });

        // Comment forms
        document.querySelectorAll('.add-comment-form').forEach(form => {
            form.addEventListener('submit', (e) => this.handleAddComment(e));
        });

        // Delete comment buttons
        document.querySelectorAll('.delete-comment').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDeleteComment(e));
        });
    }

    async handleLike(e) {
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
                const postIndex = this.posts.findIndex(p => p.id === postId);
                if (postIndex !== -1) {
                    this.posts[postIndex] = updatedPost;
                }
                
                // Update UI
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
                const postIndex = this.posts.findIndex(p => p.id === postId);
                if (postIndex !== -1) {
                    this.posts[postIndex] = updatedPost;
                }

                // Update comments display
                const commentsSection = document.getElementById(`comments-${postId}`);
                const commentsList = commentsSection.querySelector('.comments-list');
                commentsList.innerHTML = this.renderComments(updatedPost.comments || []);

                // Update comments count
                const postElement = form.closest('.post');
                const statsSpans = postElement.querySelectorAll('.post-stats span');
                const commentsCount = updatedPost.comments ? updatedPost.comments.length : 0;
                statsSpans[1].textContent = `${commentsCount} ${commentsCount === 1 ? 'comment' : 'comments'}`;

                // Clear form
                form.reset();

                // Re-attach event listeners for new delete buttons
                this.attachPostEventListeners();
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            this.showNotification('Error adding comment', 'error');
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
                this.posts = this.posts.filter(p => p.id !== postId);
                this.renderPosts();
                this.showNotification('Post deleted successfully', 'success');
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            this.showNotification('Error deleting post', 'error');
        }
    }

    async handleDeleteComment(e) {
        e.preventDefault();
        const commentId = e.currentTarget.dataset.commentId;

        if (!confirm('Are you sure you want to delete this comment?')) return;

        try {
            const response = await fetch(`/api/comments/${commentId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Reload posts to update comments
                await this.loadPosts();
                this.showNotification('Comment deleted successfully', 'success');
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
            this.showNotification('Error deleting comment', 'error');
        }
    }

    handleShare(e) {
        const postId = e.currentTarget.dataset.postId;
        const postUrl = `${window.location.origin}/post/${postId}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Check out this post',
                url: postUrl
            });
        } else {
            // Fallback to clipboard
            navigator.clipboard.writeText(postUrl).then(() => {
                this.showNotification('Post link copied to clipboard!', 'success');
            });
        }
    }

    handleImagePreview(e) {
        const file = e.target.files[0];
        const preview = document.getElementById('imagePreview');
        
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `
                    <img src="${e.target.result}" alt="Preview">
                    <button type="button" onclick="removeImagePreview()">Remove</button>
                `;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
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

    openPostModal() {
        const modal = document.getElementById('postModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    closePostModal() {
        const modal = document.getElementById('postModal');
        if (modal) {
            modal.style.display = 'none';
            this.resetPostForm();
        }
    }

    resetPostForm() {
        const form = document.getElementById('postForm');
        const preview = document.getElementById('imagePreview');
        
        if (form) form.reset();
        if (preview) {
            preview.style.display = 'none';
            preview.innerHTML = '';
        }
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

// Global functions for modal and image handling
function openPostModal() {
    if (window.postManager) {
        window.postManager.openPostModal();
    }
}

function removeImagePreview() {
    const preview = document.getElementById('imagePreview');
    const input = document.getElementById('postImage');
    
    if (preview) {
        preview.style.display = 'none';
        preview.innerHTML = '';
    }
    if (input) {
        input.value = '';
    }
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

// Initialize PostManager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.postManager = new PostManager();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PostManager;
}