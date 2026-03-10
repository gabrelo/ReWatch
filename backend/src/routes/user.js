const express = require('express');
const db = require('../database');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

function buildProfileResponse(user) {
  const { google_id, email, ...publicUser } = user;
  const animeList = db.getUserAnimeList(user.id);

  const stats = {
    watched: animeList.filter(a => a.status === 'watched').length,
    watching: animeList.filter(a => a.status === 'watching').length,
    plan_to_watch: animeList.filter(a => a.status === 'plan_to_watch').length,
    dropped: animeList.filter(a => a.status === 'dropped').length,
    total: animeList.length,
  };

  const pinnedIds = publicUser.pinned_mal_ids || [];
  const pinnedAnime = pinnedIds
    .map(id => animeList.find(a => a.mal_id === parseInt(id)))
    .filter(Boolean);

  return { user: publicUser, animeList, stats, pinnedAnime };
}

// GET /api/user/u/:username — perfil público por username
router.get('/u/:username', (req, res) => {
  const user = db.findUserByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json(buildProfileResponse(user));
});

// GET /api/user/:id/compare — animes em comum (requer auth)
router.get('/:id/compare', authMiddleware, (req, res) => {
  const myList = db.getUserAnimeList(req.user.id);
  const theirList = db.getUserAnimeList(req.params.id);

  const theirMap = new Map(theirList.map(a => [a.mal_id, a]));
  const common = myList
    .filter(a => theirMap.has(a.mal_id))
    .map(a => ({
      mal_id: a.mal_id,
      title: a.title,
      image_url: a.image_url,
      myStatus: a.status,
      theirStatus: theirMap.get(a.mal_id).status,
    }));

  res.json({ total: common.length, animes: common });
});

// GET /api/user/:id/reviews — reviews públicas do usuário
router.get('/:id/reviews', (req, res) => {
  const reviews = db.getUserReviews(req.params.id).filter(r => r.is_public);
  res.json(reviews);
});

// GET /api/user/:id/activity — atividade pública do usuário
router.get('/:id/activity', (req, res) => {
  res.json(db.getUserActivity(req.params.id, 20));
});

// GET /api/discover — lista de usuários para descobrir
router.get('/discover', (req, res) => {
  res.json(db.getDiscoverUsers());
});

// GET /api/user/:id — perfil público por id
router.get('/:id', (req, res) => {
  const user = db.findUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json(buildProfileResponse(user));
});

module.exports = router;
