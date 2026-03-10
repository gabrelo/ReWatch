const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/reviews — criar ou atualizar review (upsert por user+mal_id)
router.post('/', authMiddleware, (req, res) => {
  const { mal_id, anime_title, anime_image, text, score, is_public } = req.body;
  if (!mal_id || !anime_title) return res.status(400).json({ error: 'mal_id e anime_title obrigatórios' });
  const safeTitle = String(anime_title).slice(0, 200);
  if (score !== undefined && score !== null) {
    const s = parseInt(score);
    if (isNaN(s) || s < 1 || s > 10) return res.status(400).json({ error: 'Score deve ser entre 1 e 10' });
  }
  const review = db.createOrUpdateReview(req.user.id, {
    mal_id, anime_title: safeTitle, anime_image,
    text: (text || '').slice(0, 1000),
    score: score !== undefined && score !== null ? parseInt(score) : null,
    is_public: is_public === false || is_public === 'false' ? false : true,
  });
  db.logActivity(req.user.id, 'review_posted', { mal_id: parseInt(mal_id), title: anime_title, image_url: anime_image || null });
  res.json(review);
});

// GET /api/reviews/anime/:mal_id — reviews públicas de um anime
router.get('/anime/:mal_id', (req, res) => {
  const reviews = db.getAnimeReviews(req.params.mal_id);
  const users = reviews.map(r => {
    const user = db.findUserById(r.user_id);
    return { ...r, user_name: user?.name || 'Usuário', user_avatar: user?.avatar || null, user_username: user?.username || null };
  });
  res.json(users);
});

// DELETE /api/reviews/:mal_id — deletar minha review
router.delete('/:mal_id', authMiddleware, (req, res) => {
  const ok = db.deleteReview(req.user.id, req.params.mal_id);
  if (!ok) return res.status(404).json({ error: 'Review não encontrada' });
  res.json({ ok: true });
});

module.exports = router;
