const express = require('express');
const Post = require('../models/Post');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all posts (feed) - can be accessed with or without auth
router.get('/', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const authHeader = req.headers['authorization'];
    let userId = null;

    // Try to get user ID if token is provided (for likes status)
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-here');
        userId = decoded.userId;
      } catch (err) {
        // Token invalid, continue without user ID
      }
    }

    const posts = await Post.findAll(userId, parseInt(limit), parseInt(offset));
    res.json(posts);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Error fetching posts' });
  }
});

// Create new post (protected)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { content, image } = req.body;
    const userId = req.user.userId;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Post content is required' });
    }

    if (content.length > 500) {
      return res.status(400).json({ message: 'Post content must be 500 characters or less' });
    }

    const post = await Post.create({
      user_id: userId,
      content: content.trim(),
      image: image || null
    });

    // Get the complete post with user info
    const completePost = await Post.findById(post.id, userId);
    
    res.status(201).json({
      message: 'Post created successfully',
      post: completePost
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Error creating post' });
  }
});

// Get single post
router.get('/:id', async (req, res) => {
  try {
    const postId = req.params.id;
    const authHeader = req.headers['authorization'];
    let userId = null;

    // Try to get user ID if token is provided
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-here');
        userId = decoded.userId;
      } catch (err) {
        // Token invalid, continue without user ID
      }
    }

    const post = await Post.findById(postId, userId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ message: 'Error fetching post' });
  }
});

// Get posts by user
router.get('/user/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { limit = 20, offset = 0 } = req.query;
    const authHeader = req.headers['authorization'];
    let viewerId = null;

    // Try to get viewer ID if token is provided
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-here');
        viewerId = decoded.userId;
      } catch (err) {
        // Token invalid, continue without user ID
      }
    }

    const posts = await Post.findByUserId(userId, viewerId, parseInt(limit), parseInt(offset));
    res.json(posts);
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ message: 'Error fetching user posts' });
  }
});

// Like/unlike post (protected)
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId;

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check current like status
    const currentPost = await Post.findById(postId, userId);
    const isLiked = currentPost.is_liked;

    let result;
    let message;

    if (isLiked) {
      result = await Post.unlike(postId, userId);
      message = 'Post unliked';
    } else {
      result = await Post.like(postId, userId);
      message = 'Post liked';
    }

    // Get updated post data
    const updatedPost = await Post.findById(postId, userId);

    res.json({
      message,
      isLiked: !isLiked,
      likesCount: updatedPost.likes_count
    });
  } catch (error) {
    console.error('Like/unlike error:', error);
    res.status(500).json({ message: 'Error updating like status' });
  }
});

// Delete post (protected)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId;

    const result = await Post.delete(postId, userId);
    
    if (!result) {
      return res.status(404).json({ message: 'Post not found or unauthorized' });
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ message: 'Error deleting post' });
  }
});

module.exports = router;