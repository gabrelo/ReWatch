require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const fetch = require('node-fetch');

const authRoutes = require('./routes/auth');
const animeRoutes = require('./routes/anime');
const userRoutes = require('./routes/user');
const listsRoutes = require('./routes/lists');
const reviewsRoutes = require('./routes/reviews');
const followsRoutes = require('./routes/follows');

const app = express();
const PORT = process.env.PORT || 3001;
app.set('trust proxy', 1);

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://re-watch-lovat.vercel.app',
];

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, origin || ALLOWED_ORIGINS[0]);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '3mb' }));
app.use(passport.initialize());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { error: 'Muitas tentativas de autenticação. Aguarde 15 minutos.' },
});
const jikanLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { error: 'Limite de buscas atingido. Aguarde um momento.' },
});
app.use('/api/auth', authLimiter);
app.use('/api/jikan', jikanLimiter);
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/anime', animeRoutes);
app.use('/api/user', userRoutes);
app.use('/api/lists', listsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/follows', followsRoutes);

// ── Franchise grouping ─────────────────────────────────────────────────────
// Normaliza o título removendo indicadores de temporada/sequência para
// agrupar entradas da mesma franquia (ex: "Gintama", "Gintama'", "Gintama°")
function getFranchiseKey(anime) {
  const raw = (anime.title_english || anime.title || '').toLowerCase();
  return raw
    // Apóstrofos e símbolos de sequência no final: Gintama' → gintama, Gintama° → gintama
    .replace(/[''`°!?\.]+$/, '')
    // "Part 2", "Cour 2", "Season 2", "Temporada 2" no final
    .replace(/[\s:–\-]+(?:part|cour|season|temporada)\s*\d+\s*$/i, '')
    // "2nd Season", "3rd Cour" no final
    .replace(/[\s:–\-]+\d+(?:st|nd|rd|th)\s*(?:season|cour)\s*$/i, '')
    // "The Final Season", "Final Season"
    .replace(/[\s:–\-]+(?:the\s+)?final\s*season\s*$/i, '')
    // Subtítulos japoneses de arco que indicam sequência
    .replace(/[\s:]+(?:enchousen|beginnings?|conclusions?|aftermath|kanketsu|hen)\s*$/i, '')
    // Numerais romanos no final: "II", "III", "IV" etc. (sequências diretas)
    .replace(/\s+(?:ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toSeason(anime) {
  return {
    mal_id: anime.mal_id,
    title: anime.title_english || anime.title,
    title_japanese: anime.title,
    type: anime.type || 'TV',
    episodes: anime.episodes || null,
    score: anime.score || null,
    image_url: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || null,
    year: anime.year || anime.aired?.prop?.from?.year || null,
  };
}

function groupByFranchise(animes) {
  const groups = new Map();

  for (const anime of animes) {
    const key = getFranchiseKey(anime);

    if (!groups.has(key)) {
      groups.set(key, {
        franchise_key: key,
        mal_id: anime.mal_id,
        title: anime.title_english || anime.title,
        cover_image: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || null,
        score: anime.score || null,
        seasons: [],
      });
    }

    const group = groups.get(key);
    group.seasons.push(toSeason(anime));

    // Capa = temporada com maior score (geralmente a mais popular)
    if ((anime.score || 0) > (group.score || 0)) {
      group.score = anime.score;
      group.cover_image = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || null;
    }
  }

  return Array.from(groups.values()).map(g => {
    const tvCount = g.seasons.filter(s => ['TV', 'ONA'].includes(s.type)).length;
    const movieCount = g.seasons.filter(s => s.type === 'Movie').length;
    const ovaCount = g.seasons.filter(s => ['OVA', 'Special'].includes(s.type)).length;
    return { ...g, season_count: tvCount, movie_count: movieCount, ova_count: ovaCount };
  });
}

// ── Jikan proxy ────────────────────────────────────────────────────────────
const JIKAN_BASE = 'https://api.jikan.moe/v4';

app.get('/api/jikan/top', async (req, res) => {
  try {
    const page = Math.min(parseInt(req.query.page) || 1, 10);
    const response = await fetch(`${JIKAN_BASE}/top/anime?page=${page}&limit=25`);
    if (!response.ok) return res.status(503).json({ error: 'Jikan indisponível. Tente novamente.' });
    const data = await response.json();
    const totalPages = Math.min(data.pagination?.last_visible_page || 10, 10);
    // Cada anime vira um card individual (sem agrupamento) — garante sempre 25 por página
    const list = (data.data || []).map(anime => {
      const season = toSeason(anime);
      return {
        franchise_key: String(anime.mal_id),
        mal_id: anime.mal_id,
        title: anime.title_english || anime.title,
        cover_image: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || null,
        score: anime.score || null,
        seasons: [season],
        season_count: ['TV', 'ONA'].includes(anime.type) ? 1 : 0,
        movie_count: anime.type === 'Movie' ? 1 : 0,
        ova_count: ['OVA', 'Special'].includes(anime.type) ? 1 : 0,
      };
    });
    res.json({
      data: list,
      pagination: { current_page: page, has_next_page: page < totalPages, total_pages: totalPages },
    });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar top animes' });
  }
});

app.get('/api/jikan/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    const page = req.query.page || 1;
    if (!q.trim()) return res.json({ data: [] });
    const response = await fetch(`${JIKAN_BASE}/anime?q=${encodeURIComponent(q)}&page=${page}&limit=24&sfw=true`);
    const data = await response.json();
    res.json({ data: groupByFranchise(data.data || []) });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar animes' });
  }
});

app.get('/api/jikan/studios', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const q = req.query.q || '';
    let url = `${JIKAN_BASE}/producers?page=${page}&limit=25&order_by=favorites&sort=desc`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json({ data: data.data || [], pagination: data.pagination });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar estúdios' });
  }
});

app.get('/api/jikan/studios/:id/anime', async (req, res) => {
  const studioId = parseInt(req.params.id);
  if (isNaN(studioId) || studioId <= 0) return res.status(400).json({ error: 'ID inválido' });
  try {
    const url = `${JIKAN_BASE}/producers/${studioId}/anime?page=1&limit=20&order_by=score&sort=desc`;
    let response;
    for (let attempt = 0; attempt <= 2; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 1000 * attempt));
      response = await fetch(url);
      if (response.status !== 429) break;
    }
    if (!response.ok) return res.status(503).json({ error: 'Jikan indisponível.' });
    const data = await response.json();
    const list = (data.data || []).map(a => ({
      mal_id: a.mal_id,
      title: a.title_english || a.title,
      image_url: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || null,
      type: a.type || 'TV',
      year: a.year || a.aired?.prop?.from?.year || null,
      score: a.score || null,
      episodes: a.episodes || null,
    }));
    res.json({ data: list });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar animes do estúdio' });
  }
});

app.get('/api/jikan/anime/:id/full', async (req, res) => {
  const animeId = parseInt(req.params.id);
  if (isNaN(animeId) || animeId <= 0) return res.status(400).json({ error: 'ID inválido' });
  try {
    const url = `${JIKAN_BASE}/anime/${animeId}`;
    let response;
    for (let attempt = 0; attempt <= 1; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 800));
      response = await fetch(url);
      if (response.status !== 429) break;
    }
    if (!response.ok) return res.status(503).json({ error: 'Jikan indisponível.' });
    const data = await response.json();
    const a = data.data;
    let minutesPerEp = 24;
    if (a.duration && a.duration !== 'Unknown') {
      const m = a.duration.match(/(\d+)\s*min/);
      if (m) minutesPerEp = parseInt(m[1]);
    }
    res.json({
      mal_id: a.mal_id,
      title: a.title_english || a.title,
      title_japanese: a.title_japanese || null,
      type: a.type || null,
      episodes: a.episodes || null,
      status: a.status || null,
      aired: a.aired?.string || null,
      duration: a.duration || null,
      minutesPerEp,
      rating: a.rating || null,
      score: a.score || null,
      scored_by: a.scored_by || null,
      rank: a.rank || null,
      synopsis: a.synopsis || null,
      genres: (a.genres || []).map(g => g.name),
      themes: (a.themes || []).map(t => t.name),
      studios: (a.studios || []).map(s => s.name),
      year: a.year || a.aired?.prop?.from?.year || null,
      image: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || null,
      trailer_id: a.trailer?.youtube_id || null,
    });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar detalhes' });
  }
});

app.get('/api/jikan/anime/:id/characters', async (req, res) => {
  const animeId = parseInt(req.params.id);
  if (isNaN(animeId) || animeId <= 0) return res.status(400).json({ error: 'ID inválido' });
  try {
    const url = `${JIKAN_BASE}/anime/${animeId}/characters`;
    let response;
    for (let attempt = 0; attempt <= 1; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 800));
      response = await fetch(url);
      if (response.status !== 429) break;
    }
    if (!response.ok) return res.json({ data: [] });
    const data = await response.json();
    const chars = (data.data || [])
      .sort((a, b) => (a.role === 'Main' ? -1 : 1))
      .slice(0, 14)
      .map(c => ({
        mal_id: c.character.mal_id,
        name: c.character.name,
        image: c.character.images?.jpg?.image_url || null,
        role: c.role,
      }));
    res.json({ data: chars });
  } catch {
    res.json({ data: [] });
  }
});

app.get('/api/jikan/anime/:id/episodes', async (req, res) => {
  const animeId = parseInt(req.params.id);
  if (isNaN(animeId) || animeId <= 0) return res.status(400).json({ error: 'ID inválido' });
  try {
    const page = parseInt(req.query.page) || 1;
    const url = `${JIKAN_BASE}/anime/${animeId}/episodes?page=${page}`;
    let response;
    for (let attempt = 0; attempt <= 1; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 800));
      response = await fetch(url);
      if (response.status !== 429) break;
    }
    if (!response.ok) return res.json({ data: [], pagination: { has_next_page: false } });
    const data = await response.json();
    const eps = (data.data || []).map(e => ({
      number: e.mal_id,
      title: e.title || `Episode ${e.mal_id}`,
      title_romanji: e.title_romanji || null,
      aired: e.aired ? new Date(e.aired).toLocaleDateString('pt-BR') : null,
      filler: e.filler || false,
      recap: e.recap || false,
    }));
    res.json({
      data: eps,
      pagination: {
        current_page: page,
        has_next_page: data.pagination?.has_next_page || false,
        last_visible_page: data.pagination?.last_visible_page || 1,
      },
    });
  } catch {
    res.json({ data: [], pagination: { has_next_page: false } });
  }
});

app.get('/api/jikan/anime/:id', async (req, res) => {
  const animeId = parseInt(req.params.id);
  if (isNaN(animeId) || animeId <= 0) return res.status(400).json({ error: 'ID inválido' });
  try {
    const url = `${JIKAN_BASE}/anime/${animeId}`;
    let response;
    for (let attempt = 0; attempt <= 1; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 800));
      response = await fetch(url);
      if (response.status !== 429) break;
    }
    if (!response.ok) return res.status(503).json({ error: 'Jikan indisponível.' });
    const data = await response.json();
    const a = data.data;
    let minutesPerEp = 24;
    if (a.duration && a.duration !== 'Unknown') {
      const m = a.duration.match(/(\d+)\s*min/);
      if (m) minutesPerEp = parseInt(m[1]);
    }
    res.json({
      mal_id: a.mal_id,
      episodes: a.episodes || null,
      minutesPerEp,
      genres: (a.genres || []).map(g => g.name),
      studios: (a.studios || []).map(s => s.name),
      year: a.year || a.aired?.prop?.from?.year || null,
    });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar detalhes' });
  }
});

app.get('/api/jikan/season', async (req, res) => {
  try {
    const response = await fetch(`${JIKAN_BASE}/seasons/now?limit=24`);
    const data = await response.json();
    res.json({ data: groupByFranchise(data.data || []) });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar animes da temporada' });
  }
});

// ── Trivia com imagens (banco de perguntas curadas) ────────────────────────
const triviaQuestions = require('./triviaQuestions');

const animeCharCache = new Map(); // animeId → [{name, image}]
const animeImageCache = new Map();

// Normaliza romanizações japonesas comuns (jougo→jogo, chousou→choso, etc.)
function normalizeJp(s) {
  return s.toLowerCase()
    .replace(/ou/g, 'o').replace(/oo/g, 'o')
    .replace(/uu/g, 'u');
}

// Divide nome em palavras individuais (remove vírgulas e espaços extras)
// Jikan armazena nomes japoneses como "Himejima, Gyomei" — ordem invertida com vírgula
function nameWords(s) {
  return normalizeJp(s).replace(/,/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
}

// Busca imagem de um personagem dentro do elenco já carregado do anime
function findCharImage(chars, name) {
  const qWords = nameWords(name);

  // 1. Todos os qWords batem com todos cWords (funciona com nomes invertidos)
  //    "Gyomei Himejima" ↔ "Himejima, Gyomei" → ambos têm ["gyomei","himejima"]
  let found = chars.find(ch => {
    if (!ch.image) return false;
    const cWords = nameWords(ch.name);
    return qWords.every(qw => cWords.includes(qw)) || cWords.every(cw => qWords.includes(cw));
  });
  if (found) return found.image;

  // 2. Fallback: qualquer palavra compartilhada (nomes únicos como "Akaza", "Mahito")
  found = chars.find(ch => {
    if (!ch.image) return false;
    const cWords = nameWords(ch.name);
    return qWords.some(qw => cWords.some(cw => cw === qw || cw.startsWith(qw)));
  });
  return found?.image || null;
}

async function getAnimeChars(animeId) {
  if (animeCharCache.has(animeId)) return animeCharCache.get(animeId);
  try {
    await new Promise(r => setTimeout(r, 350));
    const r = await fetch(`${JIKAN_BASE}/anime/${animeId}/characters`);
    if (!r.ok) { animeCharCache.set(animeId, []); return []; }
    const d = await r.json();
    const chars = (d.data || []).map(c => ({
      name: c.character.name,
      image: c.character.images?.jpg?.image_url || c.character.images?.webp?.image_url || null,
    }));
    animeCharCache.set(animeId, chars);
    return chars;
  } catch {
    animeCharCache.set(animeId, []);
    return [];
  }
}

async function fetchAnimeImage(animeId) {
  if (animeImageCache.has(animeId)) return animeImageCache.get(animeId);
  try {
    await new Promise(r => setTimeout(r, 350));
    const r = await fetch(`${JIKAN_BASE}/anime/${animeId}`);
    if (!r.ok) { animeImageCache.set(animeId, null); return null; }
    const d = await r.json();
    const img = d.data?.images?.jpg?.large_image_url || d.data?.images?.jpg?.image_url || null;
    animeImageCache.set(animeId, img);
    return img;
  } catch {
    animeImageCache.set(animeId, null);
    return null;
  }
}

app.get('/api/jikan/trivia', async (req, res) => {
  try {
    const q = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
    const shuffledNames = [...q.options].sort(() => Math.random() - 0.5);

    // Busca imagem do anime e elenco em paralelo (2 calls ao invés de 5)
    const [animeImg, chars] = await Promise.all([
      fetchAnimeImage(q.animeId),
      getAnimeChars(q.animeId),
    ]);

    // Resolve imagens pelo elenco do anime correto (evita pegar personagens de outros animes)
    const options = shuffledNames.map(name => ({
      name,
      image: findCharImage(chars, name),
    }));

    res.json({
      anime: { mal_id: q.animeId, title: q.anime, image: animeImg },
      question: q.question,
      options,
      correct: q.correct,
    });
  } catch (err) {
    console.error('Trivia error:', err);
    res.status(500).json({ error: 'Erro ao gerar trivia' });
  }
});

// GET /api/jikan/schedule?day=monday
const VALID_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
app.get('/api/jikan/schedule', async (req, res) => {
  const day = req.query.day || 'monday';
  if (!VALID_DAYS.includes(day)) return res.status(400).json({ error: 'Dia inválido' });
  try {
    const response = await fetch(`${JIKAN_BASE}/schedules?filter=${day}&limit=25`);
    const data = await response.json();
    res.json({ data: data.data || [] });
  } catch {
    res.json({ data: [] });
  }
});

// GET /api/discover
app.get('/api/discover', async (req, res) => {
  try {
    const db = require('./database');
    res.json(await db.getDiscoverUsers());
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`ReWatch backend rodando em http://localhost:${PORT}`);
});
