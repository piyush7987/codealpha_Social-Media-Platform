const express = require('express');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get comments for a post
router.get('/:postId', async (req, res) => {
  try {
    const postId = req.params.postId;
    const { limit = 50, offset = 0 } = req.query;

    const comments = await Comment.findByPostId(postId, parseInt(limit), parseInt(offset));
    res.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Error fetching comments' });
  }
});

// Add comment to post (protected)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { post_id, content } = req.body;
    const userId = req.user.userId;

    if (!post_id || !content) {
      return res.status(400).json({ message: 'Post ID and content are required' });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ message: 'Comment content cannot be empty' });
    }

    if (content.length > 200) {
      return res.status(400).json({ message: 'Comment must be 200 characters or less' });
    }

    // Check if post exists
    const post = await Post.findById(post_id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Create comment
    const comment = await Comment.create({
      post_id: parseInt(post_id),
      user_id: userId,
      content: content.trim()
    });

    // Update post comments count
    await Post.updateCommentsCount(post_id);

    // Get complete comment with user info
    const completeComment = await Comment.findById(comment.id);

    res.status(201).json({
      message: 'Comment added successfully',
      comment: completeComment
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Error adding comment' });
  }
});

// Delete comment (protected)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.userId;

    // Get comment to find post_id for updating count
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user owns the comment
    if (comment.user_id !== userId) {
      return res.status(403).json({ message: 'Unauthorized to delete this comment' });
    }

    const result = await Comment.delete(commentId, userId);
    
    if (!result) {
      return res.status(404).json({ message: 'Comment not found or unauthorized' });
    }

    // Update post comments count
    await Post.updateCommentsCount(comment.post_id);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Error deleting comment' });
  }
});

module.exports = router;