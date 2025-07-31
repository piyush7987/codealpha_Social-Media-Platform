const express = require('express');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove sensitive information
    delete user.password;
    delete user.email;

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Error fetching user profile' });
  }
});

// Update user profile (protected)
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { full_name, bio, avatar } = req.body;

    const updatedUser = await User.update(userId, { full_name, bio, avatar });
    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// Follow/unfollow user (protected)
router.post('/follow/:id', authenticateToken, async (req, res) => {
  try {
    const followerId = req.user.userId;
    const followingId = parseInt(req.params.id);

    if (followerId === followingId) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    // Check if already following
    const isFollowing = await User.isFollowing(followerId, followingId);
    
    let result;
    let message;
    
    if (isFollowing) {
      result = await User.unfollow(followerId, followingId);
      message = 'Unfollowed successfully';
    } else {
      result = await User.follow(followerId, followingId);
      message = 'Followed successfully';
    }

    res.json({
      message,
      isFollowing: !isFollowing
    });
  } catch (error) {
    console.error('Follow/unfollow error:', error);
    res.status(500).json({ message: 'Error updating follow status' });
  }
});

// Get followers
router.get('/followers/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const followers = await User.getFollowers(userId);
    res.json(followers);
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ message: 'Error fetching followers' });
  }
});

// Get following
router.get('/following/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const following = await User.getFollowing(userId);
    res.json(following);
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ message: 'Error fetching following' });
  }
});

// Check if following (protected)
router.get('/is-following/:id', authenticateToken, async (req, res) => {
  try {
    const followerId = req.user.userId;
    const followingId = parseInt(req.params.id);
    
    const isFollowing = await User.isFollowing(followerId, followingId);
    res.json({ isFollowing });
  } catch (error) {
    console.error('Check following error:', error);
    res.status(500).json({ message: 'Error checking follow status' });
  }
});

module.exports = router;