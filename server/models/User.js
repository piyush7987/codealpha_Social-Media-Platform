const { db } = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  static async create(userData) {
    const { username, email, password, full_name } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO users (username, email, password, full_name)
        VALUES (?, ?, ?, ?)
      `);
      
      stmt.run([username, email, hashedPassword, full_name], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, username, email, full_name });
        }
      });
      stmt.finalize();
    });
  }

  static async findByEmail(email) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  static async findByUsername(username) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT id, username, email, full_name, bio, avatar, created_at,
               (SELECT COUNT(*) FROM follows WHERE following_id = ?) as followers_count,
               (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as following_count,
               (SELECT COUNT(*) FROM posts WHERE user_id = ?) as posts_count
        FROM users WHERE id = ?
      `, [id, id, id, id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  static async update(id, userData) {
    const { full_name, bio, avatar } = userData;
    return new Promise((resolve, reject) => {
      db.run(`
        UPDATE users SET full_name = ?, bio = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [full_name, bio, avatar, id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, full_name, bio, avatar });
        }
      });
    });
  }

  static async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async follow(followerId, followingId) {
    return new Promise((resolve, reject) => {
      db.run(`
        INSERT OR IGNORE INTO follows (follower_id, following_id)
        VALUES (?, ?)
      `, [followerId, followingId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  static async unfollow(followerId, followingId) {
    return new Promise((resolve, reject) => {
      db.run(`
        DELETE FROM follows WHERE follower_id = ? AND following_id = ?
      `, [followerId, followingId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  static async isFollowing(followerId, followingId) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?
      `, [followerId, followingId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(!!row);
        }
      });
    });
  }

  static async getFollowers(userId) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT u.id, u.username, u.full_name, u.avatar
        FROM users u
        JOIN follows f ON u.id = f.follower_id
        WHERE f.following_id = ?
        ORDER BY f.created_at DESC
      `, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async getFollowing(userId) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT u.id, u.username, u.full_name, u.avatar
        FROM users u
        JOIN follows f ON u.id = f.following_id
        WHERE f.follower_id = ?
        ORDER BY f.created_at DESC
      `, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

module.exports = User;