const { db } = require('../config/database');

class Post {
  static async create(postData) {
    const { user_id, content, image } = postData;
    
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO posts (user_id, content, image)
        VALUES (?, ?, ?)
      `);
      
      stmt.run([user_id, content, image], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, user_id, content, image });
        }
      });
      stmt.finalize();
    });
  }

  static async findAll(userId = null, limit = 20, offset = 0) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT p.*, u.username, u.full_name, u.avatar,
               EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
      `;
      
      let params = [userId];
      
      if (userId) {
        // Get posts from followed users and own posts
        query += `
          WHERE p.user_id = ? OR p.user_id IN (
            SELECT following_id FROM follows WHERE follower_id = ?
          )
        `;
        params.push(userId, userId);
      }
      
      query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async findById(id, userId = null) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT p.*, u.username, u.full_name, u.avatar,
               EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
      `, [userId, id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  static async findByUserId(userId, viewerId = null, limit = 20, offset = 0) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT p.*, u.username, u.full_name, u.avatar,
               EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `, [viewerId, userId, limit, offset], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async like(postId, userId) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Insert like
        db.run(`
          INSERT OR IGNORE INTO likes (post_id, user_id)
          VALUES (?, ?)
        `, [postId, userId], function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          const wasInserted = this.changes > 0;
          
          // Update likes count
          db.run(`
            UPDATE posts SET likes_count = (
              SELECT COUNT(*) FROM likes WHERE post_id = ?
            ) WHERE id = ?
          `, [postId, postId], (err) => {
            if (err) {
              reject(err);
            } else {
              resolve(wasInserted);
            }
          });
        });
      });
    });
  }

  static async unlike(postId, userId) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Remove like
        db.run(`
          DELETE FROM likes WHERE post_id = ? AND user_id = ?
        `, [postId, userId], function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          const wasDeleted = this.changes > 0;
          
          // Update likes count
          db.run(`
            UPDATE posts SET likes_count = (
              SELECT COUNT(*) FROM likes WHERE post_id = ?
            ) WHERE id = ?
          `, [postId, postId], (err) => {
            if (err) {
              reject(err);
            } else {
              resolve(wasDeleted);
            }
          });
        });
      });
    });
  }

  static async delete(id, userId) {
    return new Promise((resolve, reject) => {
      db.run(`
        DELETE FROM posts WHERE id = ? AND user_id = ?
      `, [id, userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  static async updateCommentsCount(postId) {
    return new Promise((resolve, reject) => {
      db.run(`
        UPDATE posts SET comments_count = (
          SELECT COUNT(*) FROM comments WHERE post_id = ?
        ) WHERE id = ?
      `, [postId, postId], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

module.exports = Post;