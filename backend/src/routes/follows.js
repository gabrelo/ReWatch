const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/follows/feed — atividade dos que sigo
router.get('/feed', authMiddleware, (req, res) => {
  const activity = db.getFeedActivity(req.user.id);
  const enriched = activity.map(a => {
    const user = db.findUserById(a.user_id);
    return { ...a, user_name: user?.name || 'Usuário', user_avatar: user?.avatar || null, user_username: user?.username || null };
  });
  res.json(enriched);
});

// GET /api/follows/:id — info de seguidores/seguindo de um usuário
router.get('/:id', (req, res) => {
  const followerId = req.headers.authorization
    ? (() => { try { const jwt = require('jsonwebtoken'); const token = req.headers.authorization.replace('Bearer ', ''); const p = jwt.verify(token, process.env.JWT_SECRET); return p.id; } catch { return null; } })()
    : null;
  const followers = db.getFollowers(req.params.id);
  const following = db.getFollowing(req.params.id);
  const isFollowing = followerId ? db.isFollowing(followerId, req.params.id) : false;
  res.json({ followers_count: followers.length, following_count: following.length, is_following: isFollowing });
});

// POST /api/follows/:id — seguir usuário
router.post('/:id', authMiddleware, (req, res) => {
  const result = db.followUser(req.user.id, req.params.id);
  if (!result) return res.status(400).json({ error: 'Não pode seguir a si mesmo' });
  res.json({ ok: true });
});

// DELETE /api/follows/:id — deixar de seguir
router.delete('/:id', authMiddleware, (req, res) => {
  db.unfollowUser(req.user.id, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
