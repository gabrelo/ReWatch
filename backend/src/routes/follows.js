const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/follows/feed — atividade dos que sigo
router.get('/feed', authMiddleware, async (req, res) => {
  try {
    const activity = await db.getFeedActivity(req.user.id);
    const enriched = await Promise.all(activity.map(async a => {
      const user = await db.findUserById(a.user_id);
      return { ...a, user_name: user?.name || 'Usuário', user_avatar: user?.avatar || null, user_username: user?.username || null };
    }));
    res.json(enriched);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar feed' });
  }
});

// GET /api/follows/:id — info de seguidores/seguindo de um usuário
router.get('/:id', async (req, res) => {
  try {
    const followerId = req.headers.authorization
      ? (() => { try { const jwt = require('jsonwebtoken'); const token = req.headers.authorization.replace('Bearer ', ''); const p = jwt.verify(token, process.env.JWT_SECRET); return p.id; } catch { return null; } })()
      : null;
    const [followers, following] = await Promise.all([
      db.getFollowers(req.params.id),
      db.getFollowing(req.params.id),
    ]);
    const isFollowingUser = followerId ? await db.isFollowing(followerId, req.params.id) : false;
    res.json({ followers_count: followers.length, following_count: following.length, is_following: isFollowingUser });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/follows/:id — seguir usuário
router.post('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.followUser(req.user.id, req.params.id);
    if (!result) return res.status(400).json({ error: 'Não pode seguir a si mesmo' });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro ao seguir usuário' });
  }
});

// DELETE /api/follows/:id — deixar de seguir
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await db.unfollowUser(req.user.id, req.params.id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro ao deixar de seguir' });
  }
});

module.exports = router;
