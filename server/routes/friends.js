// Friends Routes - Add to server/routes/friends.js
import express from 'express';
import { friendsDb } from '../db/friends.js';
import { userDb } from '../db/index.js';
import { sanitize } from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

const router = express.Router();

// Generate a unique friend code for a user
const generateFriendCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// ============ FRIEND CODES ============

// Get my friend code
router.get('/code', async (req, res) => {
  try {
    let code = await friendsDb.getFriendCode(req.user.id);
    
    if (!code) {
      // Generate new friend code
      code = generateFriendCode();
      await friendsDb.setFriendCode(req.user.id, code);
    }
    
    res.json({ code });
  } catch (error) {
    logger.error('Get friend code error', { error: error.message });
    res.status(500).json({ error: 'Failed to get friend code' });
  }
});

// Regenerate friend code
router.post('/code/regenerate', async (req, res) => {
  try {
    const code = generateFriendCode();
    await friendsDb.setFriendCode(req.user.id, code);
    res.json({ code });
  } catch (error) {
    logger.error('Regenerate friend code error', { error: error.message });
    res.status(500).json({ error: 'Failed to regenerate friend code' });
  }
});

// ============ FRIEND REQUESTS ============

// Send friend request by code
router.post('/request', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Friend code required' });
    }
    
    // Find user by friend code
    const targetUserId = await friendsDb.getUserByFriendCode(code.toUpperCase());
    
    if (!targetUserId) {
      return res.status(404).json({ error: 'Friend code not found' });
    }
    
    if (targetUserId === req.user.id) {
      return res.status(400).json({ error: "You can't add yourself as a friend" });
    }
    
    // Check if already friends
    const alreadyFriends = await friendsDb.areFriends(req.user.id, targetUserId);
    if (alreadyFriends) {
      return res.status(400).json({ error: 'Already friends with this user' });
    }
    
    // Check for existing pending request
    const existingRequest = await friendsDb.getPendingRequest(req.user.id, targetUserId);
    if (existingRequest) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }
    
    // Check if they already sent us a request - if so, auto-accept
    const theirRequest = await friendsDb.getPendingRequest(targetUserId, req.user.id);
    if (theirRequest) {
      await friendsDb.acceptRequest(theirRequest.id);
      const friend = await userDb.getById(targetUserId);
      return res.json({ 
        message: 'Friend added!',
        friend: { id: friend.id, name: friend.name, avatar: friend.avatar }
      });
    }
    
    // Create friend request
    const requestId = await friendsDb.createRequest(req.user.id, targetUserId);
    
    // Get target user info
    const targetUser = await userDb.getById(targetUserId);
    
    res.status(201).json({ 
      message: 'Friend request sent!',
      request: {
        id: requestId,
        toUser: { id: targetUser.id, name: targetUser.name, avatar: targetUser.avatar }
      }
    });
  } catch (error) {
    logger.error('Send friend request error', { error: error.message });
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// Send friend request by user ID (for in-game adding)
router.post('/request/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (userId === req.user.id) {
      return res.status(400).json({ error: "You can't add yourself as a friend" });
    }
    
    const targetUser = await userDb.getById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if already friends
    const alreadyFriends = await friendsDb.areFriends(req.user.id, userId);
    if (alreadyFriends) {
      return res.status(400).json({ error: 'Already friends with this user' });
    }
    
    // Check for existing request
    const existingRequest = await friendsDb.getPendingRequest(req.user.id, userId);
    if (existingRequest) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }
    
    // Check if they already sent us a request
    const theirRequest = await friendsDb.getPendingRequest(userId, req.user.id);
    if (theirRequest) {
      await friendsDb.acceptRequest(theirRequest.id);
      return res.json({ 
        message: 'Friend added!',
        friend: { id: targetUser.id, name: targetUser.name, avatar: targetUser.avatar }
      });
    }
    
    const requestId = await friendsDb.createRequest(req.user.id, userId);
    
    res.status(201).json({ 
      message: 'Friend request sent!',
      request: {
        id: requestId,
        toUser: { id: targetUser.id, name: targetUser.name, avatar: targetUser.avatar }
      }
    });
  } catch (error) {
    logger.error('Send friend request by ID error', { error: error.message });
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// Get pending friend requests (incoming and outgoing)
router.get('/requests', async (req, res) => {
  try {
    const [incoming, outgoing] = await Promise.all([
      friendsDb.getIncomingRequests(req.user.id),
      friendsDb.getOutgoingRequests(req.user.id)
    ]);
    
    res.json({ incoming, outgoing });
  } catch (error) {
    logger.error('Get friend requests error', { error: error.message });
    res.status(500).json({ error: 'Failed to get friend requests' });
  }
});

// Accept friend request
router.post('/requests/:requestId/accept', async (req, res) => {
  try {
    const request = await friendsDb.getRequest(req.params.requestId);
    
    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }
    
    if (request.to_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to accept this request' });
    }
    
    await friendsDb.acceptRequest(req.params.requestId);
    
    const friend = await userDb.getById(request.from_user_id);
    
    res.json({ 
      message: 'Friend request accepted!',
      friend: { id: friend.id, name: friend.name, avatar: friend.avatar }
    });
  } catch (error) {
    logger.error('Accept friend request error', { error: error.message });
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// Decline friend request
router.post('/requests/:requestId/decline', async (req, res) => {
  try {
    const request = await friendsDb.getRequest(req.params.requestId);
    
    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }
    
    if (request.to_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to decline this request' });
    }
    
    await friendsDb.deleteRequest(req.params.requestId);
    
    res.json({ message: 'Friend request declined' });
  } catch (error) {
    logger.error('Decline friend request error', { error: error.message });
    res.status(500).json({ error: 'Failed to decline friend request' });
  }
});

// Cancel outgoing friend request
router.delete('/requests/:requestId', async (req, res) => {
  try {
    const request = await friendsDb.getRequest(req.params.requestId);
    
    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }
    
    if (request.from_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to cancel this request' });
    }
    
    await friendsDb.deleteRequest(req.params.requestId);
    
    res.json({ message: 'Friend request cancelled' });
  } catch (error) {
    logger.error('Cancel friend request error', { error: error.message });
    res.status(500).json({ error: 'Failed to cancel friend request' });
  }
});

// ============ FRIENDS LIST ============

// Get friends list
router.get('/', async (req, res) => {
  try {
    const friends = await friendsDb.getFriends(req.user.id);
    res.json({ friends });
  } catch (error) {
    logger.error('Get friends error', { error: error.message });
    res.status(500).json({ error: 'Failed to get friends list' });
  }
});

// Remove friend
router.delete('/:friendId', async (req, res) => {
  try {
    await friendsDb.removeFriend(req.user.id, req.params.friendId);
    res.json({ message: 'Friend removed' });
  } catch (error) {
    logger.error('Remove friend error', { error: error.message });
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// Get friends online status
router.get('/online', async (req, res) => {
  try {
    const friends = await friendsDb.getFriendsWithOnlineStatus(req.user.id);
    res.json({ friends });
  } catch (error) {
    logger.error('Get online friends error', { error: error.message });
    res.status(500).json({ error: 'Failed to get online friends' });
  }
});

// Search users by name (for adding friends from recent games)
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ users: [] });
    }
    
    const users = await friendsDb.searchUsers(sanitize.string(q, 50), req.user.id);
    res.json({ users });
  } catch (error) {
    logger.error('Search users error', { error: error.message });
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Get recent players (people you've played with)
router.get('/recent', async (req, res) => {
  try {
    const recentPlayers = await friendsDb.getRecentPlayers(req.user.id, 20);
    res.json({ recentPlayers });
  } catch (error) {
    logger.error('Get recent players error', { error: error.message });
    res.status(500).json({ error: 'Failed to get recent players' });
  }
});

export { router as friendsRouter };
