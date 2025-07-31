const { db } = require('../config/database');

class Comment {
  static async create(commentData) {
    const { post_id, user_id, content } = commentData;
    
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO comments (post_id, user_id, content)
        VALUES (?, ?, ?)
      `);
      
      stmt.run([post_id, user_id, content], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, post_id, user_id, content });
        }
      });
      stmt.finalize();
    });
  }

  static async findByPostId(postId, limit = 50, offset = 0) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT c.*, u.username, u.full_name, u.avatar
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
        LIMIT ? OFFSET ?
      `, [postId, limit, offset], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT c.*, u.username, u.full_name, u.avatar
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
      `, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  static async delete(id, userId) {
    return new Promise((resolve, reject) => {
      db.run(`
        DELETE FROM comments WHERE id = ? AND user_id = ?
      `, [id, userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  static async countByPostId(postId) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as count FROM comments WHERE post_id = ?
      `, [postId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });
  }
}

module.exports = Comment;