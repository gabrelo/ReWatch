const express = require('express');
const db = require('../database');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const VALID_STATUSES = ['watched', 'watching', 'plan_to_watch', 'dropped'];

router.get('/my-list', authMiddleware, (req, res) => {
  const list = db.getUserAnimeList(req.user.id);
  res.json(list);
});

router.post('/add', authMiddleware, (req, res) => {
  const { mal_id, title, image_url, status } = req.body;
  const malId = parseInt(mal_id);
  if (!malId || malId <= 0 || isNaN(malId)) {
    return res.status(400).json({ error: 'mal_id inválido' });
  }
  if (!title || !status) {
    return res.status(400).json({ error: 'title e status são obrigatórios' });
  }
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Status inválido' });
  }
  const anime = db.upsertAnime(req.user.id, { mal_id: malId, title: String(title).slice(0, 200), image_url, status });
  db.logActivity(req.user.id, 'anime_added', { mal_id: malId, title, image_url: image_url || null, status });
  res.json(anime);
});

router.put('/:mal_id', authMiddleware, (req, res) => {
  const { status, score } = req.body;
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Status inválido' });
  }
  if (score !== undefined && score !== null) {
    const s = parseInt(score);
    if (isNaN(s) || s < 1 || s > 10) {
      return res.status(400).json({ error: 'Nota deve ser um número entre 1 e 10' });
    }
  }
  const updates = {};
  if (status !== undefined) updates.status = status;
  if (score !== undefined) updates.score = score === null ? null : parseInt(score);

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  }
  const anime = db.updateAnimeEntry(req.user.id, req.params.mal_id, updates);
  if (!anime) return res.status(404).json({ error: 'Anime não encontrado na lista' });
  if (updates.status) db.logActivity(req.user.id, 'status_changed', { mal_id: anime.mal_id, title: anime.title, image_url: anime.image_url || null, status: updates.status });
  res.json(anime);
});

router.delete('/:mal_id', authMiddleware, (req, res) => {
  const removed = db.removeAnime(req.user.id, req.params.mal_id);
  if (!removed) return res.status(404).json({ error: 'Anime não encontrado na lista' });
  res.json({ success: true });
});

module.exports = router;
