const express = require('express');
const db = require('../database');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

async function buildProfileResponse(user) {
  const { google_id, email, ...publicUser } = user;
  const animeList = await db.getUserAnimeList(user.id);

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
router.get('/u/:username', async (req, res) => {
  try {
    const user = await db.findUserByUsername(req.params.username);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(await buildProfileResponse(user));
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/user/:id/compare — animes em comum (requer auth)
router.get('/:id/compare', authMiddleware, async (req, res) => {
  try {
    const [myList, theirList] = await Promise.all([
      db.getUserAnimeList(req.user.id),
      db.getUserAnimeList(req.params.id),
    ]);

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
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/user/:id/reviews — reviews públicas do usuário
router.get('/:id/reviews', async (req, res) => {
  try {
    const reviews = (await db.getUserReviews(req.params.id)).filter(r => r.is_public);
    res.json(reviews);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/user/:id/activity — atividade pública do usuário
router.get('/:id/activity', async (req, res) => {
  try {
    res.json(await db.getUserActivity(req.params.id, 20));
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/user/discover — lista de usuários para descobrir
router.get('/discover', async (req, res) => {
  try {
    res.json(await db.getDiscoverUsers());
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/user/:id — perfil público por id
router.get('/:id', async (req, res) => {
  try {
    const user = await db.findUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(await buildProfileResponse(user));
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
