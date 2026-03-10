const express = require('express');
const router = express.Router();
const db = require('../database');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/lists/my — minhas listas (auth)
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const lists = await db.getUserLists(req.user.id);
    res.json({ data: lists });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar listas' });
  }
});

// POST /api/lists — criar lista (auth)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, is_public } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Nome obrigatório' });
    const list = await db.createList(req.user.id, { name: name.trim(), description, is_public });
    await db.logActivity(req.user.id, 'list_created', { list_id: list.id, name: list.name });
    res.json(list);
  } catch {
    res.status(500).json({ error: 'Erro ao criar lista' });
  }
});

// GET /api/lists/:id — ver lista (pública sempre, privada só pro dono)
router.get('/:id', async (req, res) => {
  try {
    const list = await db.getListById(req.params.id);
    if (!list) return res.status(404).json({ error: 'Lista não encontrada' });

    if (!list.is_public) {
      let requesterId = null;
      const auth = req.headers.authorization;
      if (auth?.startsWith('Bearer ')) {
        try {
          const jwt = require('jsonwebtoken');
          requesterId = jwt.verify(auth.slice(7), process.env.JWT_SECRET)?.id;
        } catch {}
      }
      if (requesterId !== list.user_id) {
        return res.status(403).json({ error: 'Lista privada' });
      }
    }

    const owner = await db.findUserById(list.user_id);
    res.json({ ...list, owner_name: owner?.name || 'Usuário', owner_username: owner?.username || null });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar lista' });
  }
});

// PUT /api/lists/:id — editar lista (auth, dono)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, description, is_public } = req.body;
    if (name !== undefined && !name.trim()) return res.status(400).json({ error: 'Nome obrigatório' });
    const list = await db.updateList(req.params.id, req.user.id, {
      name: name?.trim(), description, is_public,
    });
    if (!list) return res.status(404).json({ error: 'Lista não encontrada' });
    res.json(list);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar lista' });
  }
});

// DELETE /api/lists/:id — deletar lista (auth, dono)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const ok = await db.deleteList(req.params.id, req.user.id);
    if (!ok) return res.status(404).json({ error: 'Lista não encontrada' });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro ao deletar lista' });
  }
});

// POST /api/lists/:id/anime — adicionar anime à lista (auth, dono)
router.post('/:id/anime', authMiddleware, async (req, res) => {
  try {
    const { mal_id, title, image_url } = req.body;
    if (!mal_id || !title) return res.status(400).json({ error: 'mal_id e title obrigatórios' });
    const list = await db.addAnimeToList(req.params.id, req.user.id, { mal_id, title, image_url });
    if (!list) return res.status(404).json({ error: 'Lista não encontrada' });
    res.json(list);
  } catch {
    res.status(500).json({ error: 'Erro ao adicionar anime' });
  }
});

// DELETE /api/lists/:id/anime/:mal_id — remover anime da lista (auth, dono)
router.delete('/:id/anime/:mal_id', authMiddleware, async (req, res) => {
  try {
    const list = await db.removeAnimeFromList(req.params.id, req.user.id, req.params.mal_id);
    if (!list) return res.status(404).json({ error: 'Lista não encontrada' });
    res.json(list);
  } catch {
    res.status(500).json({ error: 'Erro ao remover anime' });
  }
});

module.exports = router;
