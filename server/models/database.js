// database.js - Database models and operations for social media platform

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

class Database {
    constructor(dbPath = './social_media.db') {
        this.dbPath = dbPath;
        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
            } else {
                console.log('Connected to SQLite database');
                this.initializeTables();
            }
        });
    }

    // Initialize database tables
    initializeTables() {
        const tables = [
            // Users table
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                fullName TEXT,
                bio TEXT,
                avatar TEXT,
                coverPhoto TEXT,
                location TEXT,
                website TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Posts table
            `CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                content TEXT NOT NULL,
                image TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
            )`,

            // Comments table
            `CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                postId INTEGER NOT NULL,
                userId INTEGER NOT NULL,
                content TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (postId) REFERENCES posts (id) ON DELETE CASCADE,
                FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
            )`,

            // Likes table
            `CREATE TABLE IF NOT EXISTS likes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                postId INTEGER NOT NULL,
                userId INTEGER NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(postId, userId),
                FOREIGN KEY (postId) REFERENCES posts (id) ON DELETE CASCADE,
                FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
            )`,

            // Followers table (many-to-many relationship)
            `CREATE TABLE IF NOT EXISTS followers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                followerId INTEGER NOT NULL,
                followingId INTEGER NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(followerId, followingId),
                FOREIGN KEY (followerId) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (followingId) REFERENCES users (id) ON DELETE CASCADE
            )`,

            // Sessions table (optional for session management)
            `CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                sessionToken TEXT UNIQUE NOT NULL,
                expiresAt DATETIME NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
            )`
        ];

        tables.forEach((table, index) => {
            this.db.run(table, (err) => {
                if (err) {
                    console.error(`Error creating table ${index + 1}:`, err.message);
                } else {
                    console.log(`Table ${index + 1} initialized successfully`);
                }
            });
        });

        // Create indexes for better performance
        this.createIndexes();
    }

    createIndexes() {
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_posts_userId ON posts(userId)',
            'CREATE INDEX IF NOT EXISTS idx_posts_createdAt ON posts(createdAt DESC)',
            'CREATE INDEX IF NOT EXISTS idx_comments_postId ON comments(postId)',
            'CREATE INDEX IF NOT EXISTS idx_comments_userId ON comments(userId)',
            'CREATE INDEX IF NOT EXISTS idx_likes_postId ON likes(postId)',
            'CREATE INDEX IF NOT EXISTS idx_likes_userId ON likes(userId)',
            'CREATE INDEX IF NOT EXISTS idx_followers_followerId ON followers(followerId)',
            'CREATE INDEX IF NOT EXISTS idx_followers_followingId ON followers(followingId)',
            'CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions(userId)',
            'CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(sessionToken)'
        ];

        indexes.forEach(index => {
            this.db.run(index, (err) => {
                if (err) {
                    console.error('Error creating index:', err.message);
                }
            });
        });
    }

    // Helper method to run queries with promises
    runQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    // Helper method to get single row
    getRow(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Helper method to get all rows
    getAllRows(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // USER OPERATIONS

    // Create new user
    async createUser(userData) {
        const { username, email, password, fullName } = userData;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const sql = `
            INSERT INTO users (username, email, password, fullName)
            VALUES (?, ?, ?, ?)
        `;
        
        try {
            const result = await this.runQuery(sql, [username, email, hashedPassword, fullName]);
            return await this.getUserById(result.id);
        } catch (error) {
            if (error.message.includes('UNIQUE constraint failed')) {
                if (error.message.includes('username')) {
                    throw new Error('Username already exists');
                } else if (error.message.includes('email')) {
                    throw new Error('Email already exists');
                }
            }
            throw error;
        }
    }

    // Get user by ID
    async getUserById(id) {
        const sql = `
            SELECT id, username, email, fullName, bio, avatar, coverPhoto, 
                   location, website, createdAt, updatedAt
            FROM users WHERE id = ?
        `;
        return await this.getRow(sql, [id]);
    }

    // Get user by username
    async getUserByUsername(username) {
        const sql = `
            SELECT id, username, email, fullName, bio, avatar, coverPhoto,
                   location, website, createdAt, updatedAt
            FROM users WHERE username = ?
        `;
        return await this.getRow(sql, [username]);
    }

    // Get user by email (for login)
    async getUserByEmail(email) {
        const sql = `
            SELECT id, username, email, password, fullName, bio, avatar, coverPhoto,
                   location, website, createdAt, updatedAt
            FROM users WHERE email = ?
        `;
        return await this.getRow(sql, [email]);
    }

    // Update user profile
    async updateUser(id, userData) {
        const { fullName, bio, location, website } = userData;
        const sql = `
            UPDATE users 
            SET fullName = ?, bio = ?, location = ?, website = ?, updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        await this.runQuery(sql, [fullName, bio, location, website, id]);
        return await this.getUserById(id);
    }

    // Update user avatar
    async updateUserAvatar(id, avatar) {
        const sql = `
            UPDATE users 
            SET avatar = ?, updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        await this.runQuery(sql, [avatar, id]);
        return await this.getUserById(id);
    }

    // Update user cover photo
    async updateUserCoverPhoto(id, coverPhoto) {
        const sql = `
            UPDATE users 
            SET coverPhoto = ?, updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        await this.runQuery(sql, [coverPhoto, id]);
        return await this.getUserById(id);
    }

    // Delete user
    async deleteUser(id) {
        const sql = 'DELETE FROM users WHERE id = ?';
        return await this.runQuery(sql, [id]);
    }

    // POST OPERATIONS

    // Create new post
    async createPost(postData) {
        const { userId, content, image } = postData;
        const sql = `
            INSERT INTO posts (userId, content, image)
            VALUES (?, ?, ?)
        `;
        
        const result = await this.runQuery(sql, [userId, content, image]);
        return await this.getPostById(result.id);
    }

    // Get post by ID with user info, likes, and comments
    async getPostById(id) {
        const sql = `
            SELECT p.*, u.username, u.avatar, u.fullName,
                   COUNT(DISTINCT l.id) as likesCount,
                   COUNT(DISTINCT c.id) as commentsCount
            FROM posts p
            LEFT JOIN users u ON p.userId = u.id
            LEFT JOIN likes l ON p.id = l.postId
            LEFT JOIN comments c ON p.id = c.postId
            WHERE p.id = ?
            GROUP BY p.id
        `;
        
        const post = await this.getRow(sql, [id]);
        if (!post) return null;

        // Get likes and comments separately for detailed info
        post.likes = await this.getPostLikes(id);
        post.comments = await this.getPostComments(id);
        post.user = {
            id: post.userId,
            username: post.username,
            avatar: post.avatar,
            fullName: post.fullName
        };

        return post;
    }

    // Get all posts with pagination
    async getAllPosts(limit = 20, offset = 0) {
        const sql = `
            SELECT p.*, u.username, u.avatar, u.fullName
            FROM posts p
            LEFT JOIN users u ON p.userId = u.id
            ORDER BY p.createdAt DESC
            LIMIT ? OFFSET ?
        `;
        
        const posts = await this.getAllRows(sql, [limit, offset]);
        
        // Enhance each post with likes and comments
        for (let post of posts) {
            post.likes = await this.getPostLikes(post.id);
            post.comments = await this.getPostComments(post.id);
            post.user = {
                id: post.userId,
                username: post.username,
                avatar: post.avatar,
                fullName: post.fullName
            };
        }
        
        return posts;
    }

    // Get posts by user ID
    async getPostsByUserId(userId, limit = 20, offset = 0) {
        const sql = `
            SELECT p.*, u.username, u.avatar, u.fullName
            FROM posts p
            LEFT JOIN users u ON p.userId = u.id
            WHERE p.userId = ?
            ORDER BY p.createdAt DESC
            LIMIT ? OFFSET ?
        `;
        
        const posts = await this.getAllRows(sql, [userId, limit, offset]);
        
        for (let post of posts) {
            post.likes = await this.getPostLikes(post.id);
            post.comments = await this.getPostComments(post.id);
            post.user = {
                id: post.userId,
                username: post.username,
                avatar: post.avatar,
                fullName: post.fullName
            };
        }
        
        return posts;
    }

    // Update post
    async updatePost(id, content) {
        const sql = `
            UPDATE posts 
            SET content = ?, updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        await this.runQuery(sql, [content, id]);
        return await this.getPostById(id);
    }

    // Delete post
    async deletePost(id) {
        const sql = 'DELETE FROM posts WHERE id = ?';
        return await this.runQuery(sql, [id]);
    }

    // COMMENT OPERATIONS

    // Create comment
    async createComment(commentData) {
        const { postId, userId, content } = commentData;
        const sql = `
            INSERT INTO comments (postId, userId, content)
            VALUES (?, ?, ?)
        `;
        
        const result = await this.runQuery(sql, [postId, userId, content]);
        
        // Return updated post with new comment
        return await this.getPostById(postId);
    }

    // Get comments for a post
    async getPostComments(postId) {
        const sql = `
            SELECT c.*, u.username, u.avatar, u.fullName
            FROM comments c
            LEFT JOIN users u ON c.userId = u.id
            WHERE c.postId = ?
            ORDER BY c.createdAt ASC
        `;
        
        const comments = await this.getAllRows(sql, [postId]);
        
        return comments.map(comment => ({
            ...comment,
            user: {
                id: comment.userId,
                username: comment.username,
                avatar: comment.avatar,
                fullName: comment.fullName
            }
        }));
    }

    // Delete comment
    async deleteComment(id) {
        const sql = 'DELETE FROM comments WHERE id = ?';
        return await this.runQuery(sql, [id]);
    }

    // LIKE OPERATIONS

    // Add like to post
    async likePost(postId, userId) {
        const sql = `
            INSERT OR IGNORE INTO likes (postId, userId)
            VALUES (?, ?)
        `;
        
        await this.runQuery(sql, [postId, userId]);
        return await this.getPostById(postId);
    }

    // Remove like from post
    async unlikePost(postId, userId) {
        const sql = 'DELETE FROM likes WHERE postId = ? AND userId = ?';
        
        await this.runQuery(sql, [postId, userId]);
        return await this.getPostById(postId);
    }

    // Get likes for a post
    async getPostLikes(postId) {
        const sql = `
            SELECT l.userId, u.username, u.avatar
            FROM likes l
            LEFT JOIN users u ON l.userId = u.id
            WHERE l.postId = ?
            ORDER BY l.createdAt DESC
        `;
        
        const likes = await this.getAllRows(sql, [postId]);
        return likes.map(like => like.userId);
    }

    // Get posts liked by user
    async getLikedPostsByUserId(userId, limit = 20, offset = 0) {
        const sql = `
            SELECT p.*, u.username, u.avatar, u.fullName
            FROM posts p
            LEFT JOIN users u ON p.userId = u.id
            INNER JOIN likes l ON p.id = l.postId
            WHERE l.userId = ?
            ORDER BY l.createdAt DESC
            LIMIT ? OFFSET ?
        `;
        
        const posts = await this.getAllRows(sql, [userId, limit, offset]);
        
        for (let post of posts) {
            post.likes = await this.getPostLikes(post.id);
            post.comments = await this.getPostComments(post.id);
            post.user = {
                id: post.userId,
                username: post.username,
                avatar: post.avatar,
                fullName: post.fullName
            };
        }
        
        return posts;
    }

    // FOLLOW OPERATIONS

    // Follow user
    async followUser(followerId, followingId) {
        if (followerId === followingId) {
            throw new Error('Cannot follow yourself');
        }
        
        const sql = `
            INSERT OR IGNORE INTO followers (followerId, followingId)
            VALUES (?, ?)
        `;
        
        return await this.runQuery(sql, [followerId, followingId]);
    }

    // Unfollow user
    async unfollowUser(followerId, followingId) {
        const sql = 'DELETE FROM followers WHERE followerId = ? AND followingId = ?';
        return await this.runQuery(sql, [followerId, followingId]);
    }

    // Get followers of a user
    async getFollowers(userId) {
        const sql = `
            SELECT u.id, u.username, u.avatar, u.fullName
            FROM followers f
            LEFT JOIN users u ON f.followerId = u.id
            WHERE f.followingId = ?
            ORDER BY f.createdAt DESC
        `;
        
        return await this.getAllRows(sql, [userId]);
    }

    // Get users that a user is following
    async getFollowing(userId) {
        const sql = `
            SELECT u.id, u.username, u.avatar, u.fullName
            FROM followers f
            LEFT JOIN users u ON f.followingId = u.id
            WHERE f.followerId = ?
            ORDER BY f.createdAt DESC
        `;
        
        return await this.getAllRows(sql, [userId]);
    }

    // Check if user1 follows user2
    async isFollowing(followerId, followingId) {
        const sql = 'SELECT 1 FROM followers WHERE followerId = ? AND followingId = ?';
        const result = await this.getRow(sql, [followerId, followingId]);
        return !!result;
    }

    // Get follower counts
    async getFollowerCounts(userId) {
        const followersCountSql = 'SELECT COUNT(*) as count FROM followers WHERE followingId = ?';
        const followingCountSql = 'SELECT COUNT(*) as count FROM followers WHERE followerId = ?';
        
        const [followersResult, followingResult] = await Promise.all([
            this.getRow(followersCountSql, [userId]),
            this.getRow(followingCountSql, [userId])
        ]);
        
        return {
            followers: followersResult.count,
            following: followingResult.count
        };
    }

    // SESSION OPERATIONS (Optional)

    // Create session
    async createSession(userId, sessionToken, expiresAt) {
        const sql = `
            INSERT INTO sessions (userId, sessionToken, expiresAt)
            VALUES (?, ?, ?)
        `;
        
        return await this.runQuery(sql, [userId, sessionToken, expiresAt]);
    }

    // Get session
    async getSession(sessionToken) {
        const sql = `
            SELECT s.*, u.id as userId, u.username, u.email, u.fullName, u.avatar
            FROM sessions s
            LEFT JOIN users u ON s.userId = u.id
            WHERE s.sessionToken = ? AND s.expiresAt > CURRENT_TIMESTAMP
        `;
        
        return await this.getRow(sql, [sessionToken]);
    }

    // Delete session
    async deleteSession(sessionToken) {
        const sql = 'DELETE FROM sessions WHERE sessionToken = ?';
        return await this.runQuery(sql, [sessionToken]);
    }

    // Clean expired sessions
    async cleanExpiredSessions() {
        const sql = 'DELETE FROM sessions WHERE expiresAt <= CURRENT_TIMESTAMP';
        return await this.runQuery(sql);
    }

    // UTILITY OPERATIONS

    // Search users
    async searchUsers(query, limit = 10) {
        const sql = `
            SELECT id, username, fullName, avatar, bio
            FROM users
            WHERE username LIKE ? OR fullName LIKE ?
            ORDER BY username
            LIMIT ?
        `;
        
        const searchTerm = `%${query}%`;
        return await this.getAllRows(sql, [searchTerm, searchTerm, limit]);
    }

    // Get user statistics
    async getUserStats(userId) {
        const postsCountSql = 'SELECT COUNT(*) as count FROM posts WHERE userId = ?';
        const likesReceivedSql = `
            SELECT COUNT(*) as count 
            FROM likes l 
            INNER JOIN posts p ON l.postId = p.id 
            WHERE p.userId = ?
        `;
        
        const [postsResult, likesResult, followCounts] = await Promise.all([
            this.getRow(postsCountSql, [userId]),
            this.getRow(likesReceivedSql, [userId]),
            this.getFollowerCounts(userId)
        ]);
        
        return {
            posts: postsResult.count,
            likesReceived: likesResult.count,
            followers: followCounts.followers,
            following: followCounts.following
        };
    }

    // Close database connection
    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('Database connection closed');
                    resolve();
                }
            });
        });
    }
}

module.exports = Database;