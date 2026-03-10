import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL;

const STATUS_OPTIONS = [
  { id: 'watched',       label: '✓ Assistido',      color: '#9db5a0' },
  { id: 'watching',      label: '▶ Assistindo',      color: '#7c8fa8' },
  { id: 'plan_to_watch', label: '◷ Quero assistir', color: '#c4a96b' },
  { id: 'dropped',       label: '✕ Dropado',         color: '#b88a8a' },
];

export default function AnimeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, getToken } = useAuth();
  const token = getToken();

  const [anime, setAnime] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [epPagination, setEpPagination] = useState({ has_next_page: false, current_page: 1 });
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);

  const [userStatus, setUserStatus] = useState(null);
  const [userScore, setUserScore] = useState(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [scoreMenuOpen, setScoreMenuOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [myReview, setMyReview] = useState(null);
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewScore, setReviewScore] = useState(null);
  const [reviewPublic, setReviewPublic] = useState(true);
  const [savingReview, setSavingReview] = useState(false);

  // Carrega detalhes do anime primeiro, depois personagens + episódios com delay
  useEffect(() => {
    setLoading(true);
    setError(null);
    setAnime(null);
    setCharacters([]);
    setEpisodes([]);

    fetch(`${API}/api/jikan/anime/${id}/full`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        if (data.error) throw new Error(data.error);
        setAnime(data);
        setLoading(false);

        // Busca personagens e episódios após 350ms e 700ms (evita rate limit do Jikan)
        setTimeout(() => {
          fetch(`${API}/api/jikan/anime/${id}/characters`)
            .then(r => { if (!r.ok) throw new Error(); return r.json(); })
            .then(d => setCharacters(d.data || []))
            .catch(() => {});
        }, 350);

        setTimeout(() => {
          fetch(`${API}/api/jikan/anime/${id}/episodes`)
            .then(r => { if (!r.ok) throw new Error(); return r.json(); })
            .then(d => {
              setEpisodes(d.data || []);
              setEpPagination(d.pagination || { has_next_page: false, current_page: 1 });
            })
            .catch(() => {});
        }, 700);
      })
      .catch(() => {
        setError('Erro ao carregar dados do anime.');
        setLoading(false);
      });
  }, [id]);

  // Carrega reviews do anime
  useEffect(() => {
    fetch(`${API}/api/reviews/anime/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        if (Array.isArray(data)) {
          setReviews(data);
          if (user) {
            const mine = data.find(r => r.user_id === user.id);
            if (mine) { setMyReview(mine); setReviewText(mine.text || ''); setReviewScore(mine.score || null); setReviewPublic(mine.is_public !== false); }
          }
        }
      })
      .catch(() => {});
  }, [id, user]);

  async function handleSaveReview() {
    if (!token || !anime) return;
    setSavingReview(true);
    const res = await fetch(`${API}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mal_id: parseInt(id), anime_title: anime.title, anime_image: anime.image, text: reviewText, score: reviewScore, is_public: reviewPublic }),
    });
    const data = await res.json();
    if (res.ok) {
      setMyReview(data);
      setReviews(prev => {
        const without = prev.filter(r => r.user_id !== user.id);
        return reviewPublic ? [{ ...data, user_name: user.name, user_avatar: user.avatar }, ...without] : without;
      });
      setReviewFormOpen(false);
    }
    setSavingReview(false);
  }

  async function handleDeleteReview() {
    if (!token) return;
    await fetch(`${API}/api/reviews/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setMyReview(null);
    setReviewText('');
    setReviewScore(null);
    setReviews(prev => prev.filter(r => r.user_id !== user.id));
    setReviewFormOpen(false);
  }

  // Carrega status do usuário para este anime
  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/anime/my-list`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        if (Array.isArray(data)) {
          const entry = data.find(a => a.mal_id === parseInt(id));
          if (entry) { setUserStatus(entry.status); setUserScore(entry.score || null); }
        }
      })
      .catch(() => {});
  }, [token, id]);

  async function handleSetStatus(status) {
    setStatusMenuOpen(false);
    if (!token || !anime) return;
    setActionLoading(true);
    const isNew = !userStatus;
    const url = isNew ? `${API}/api/anime/add` : `${API}/api/anime/${id}`;
    try {
      await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mal_id: parseInt(id), title: anime.title, image_url: anime.image, status }),
      });
      setUserStatus(status);
    } catch {}
    setActionLoading(false);
  }

  async function handleRemove() {
    setStatusMenuOpen(false);
    if (!token) return;
    setActionLoading(true);
    try {
      await fetch(`${API}/api/anime/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setUserStatus(null);
      setUserScore(null);
    } catch {}
    setActionLoading(false);
  }

  async function handleSetScore(score) {
    setScoreMenuOpen(false);
    if (!token) return;
    setActionLoading(true);
    try {
      await fetch(`${API}/api/anime/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ score }),
      });
      setUserScore(score);
    } catch {}
    setActionLoading(false);
  }

  async function loadMoreEpisodes() {
    setLoadingMore(true);
    try {
      const nextPage = epPagination.current_page + 1;
      const res = await fetch(`${API}/api/jikan/anime/${id}/episodes?page=${nextPage}`);
      const data = await res.json();
      setEpisodes(prev => [...prev, ...(data.data || [])]);
      setEpPagination(data.pagination || { has_next_page: false, current_page: nextPage });
    } catch {}
    setLoadingMore(false);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 64 }}>
      <Navbar />
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
        <Spinner />
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error || !anime) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 64 }}>
      <Navbar />
      <div style={{ textAlign: 'center', padding: '5rem 1rem', color: 'var(--text-mid)' }}>
        <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>{error || 'Anime não encontrado.'}</p>
        <button onClick={() => navigate(-1)} style={{ color: 'var(--accent-purple)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
          ← Voltar
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const currentStatusOpt = STATUS_OPTIONS.find(o => o.id === userStatus);
  const SYNOPSIS_LIMIT = 500;
  const synopsis = anime.synopsis || '';
  const isSynopsisLong = synopsis.length > SYNOPSIS_LIMIT;
  const allGenres = [...(anime.genres || []), ...(anime.themes || [])].slice(0, 7);

  const statusLabel =
    anime.status === 'Finished Airing' ? 'Completo' :
    anime.status === 'Currently Airing' ? 'Em exibição' :
    anime.status === 'Not yet aired' ? 'Em breve' :
    anime.status || null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 64 }}>
      <Navbar />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-light)', fontSize: '0.85rem',
            padding: 0, marginBottom: '1.5rem',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-purple)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-light)'}
        >
          ← Voltar
        </button>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: '2rem', flexWrap: 'wrap',
          background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)', padding: '1.75rem',
          boxShadow: 'var(--shadow-sm)', marginBottom: '1.5rem',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Blurred cover background */}
          {anime.image && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 0,
              backgroundImage: `url(${anime.image})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              filter: 'blur(60px)', opacity: 0.07,
            }} />
          )}

          {/* Cover */}
          <img
            src={anime.image || 'https://via.placeholder.com/225x318?text=?'}
            alt={anime.title}
            style={{
              width: 180, height: 256, objectFit: 'cover',
              borderRadius: 'var(--radius-sm)', flexShrink: 0,
              boxShadow: 'var(--shadow-md)', position: 'relative', zIndex: 1,
            }}
          />

          {/* Info */}
          <div style={{ flex: 1, minWidth: 220, position: 'relative', zIndex: 1 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 4, lineHeight: 1.3 }}>
              {anime.title}
            </h1>
            {anime.title_japanese && (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-light)', marginBottom: '1rem' }}>
                {anime.title_japanese}
              </p>
            )}

            {/* Score + meta chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center', marginBottom: '0.875rem' }}>
              {anime.score && (
                <span style={{
                  background: 'rgba(196,169,107,0.15)', color: '#c4a96b',
                  fontWeight: 700, fontSize: '0.88rem', padding: '3px 12px', borderRadius: 999,
                }}>★ {anime.score}</span>
              )}
              {anime.type && <MetaChip>{anime.type}</MetaChip>}
              {anime.episodes && <MetaChip>{anime.episodes} eps</MetaChip>}
              {anime.year && <MetaChip>{anime.year}</MetaChip>}
              {statusLabel && (
                <MetaChip color={
                  statusLabel === 'Completo' ? '#9db5a0' :
                  statusLabel === 'Em exibição' ? '#7c8fa8' : 'var(--text-light)'
                }>{statusLabel}</MetaChip>
              )}
            </div>

            {/* Genre tags */}
            {allGenres.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.875rem' }}>
                {allGenres.map(g => (
                  <span key={g} style={{
                    background: 'var(--accent-purple-light)', color: 'var(--accent-purple)',
                    fontSize: '0.7rem', fontWeight: 500, padding: '2px 10px', borderRadius: 999,
                  }}>{g}</span>
                ))}
              </div>
            )}

            {/* Studios + duration */}
            {(anime.studios?.length > 0 || anime.duration) && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-mid)', marginBottom: '0.5rem' }}>
                {anime.studios?.length > 0 && (
                  <>Estúdio: <strong style={{ color: 'var(--text-dark)' }}>{anime.studios.join(', ')}</strong></>
                )}
                {anime.studios?.length > 0 && anime.duration && <span style={{ margin: '0 0.4rem', color: 'var(--border)' }}>·</span>}
                {anime.duration && <span>{anime.duration}</span>}
              </p>
            )}

            {/* Aired */}
            {anime.aired && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '1.25rem' }}>
                {anime.aired}
              </p>
            )}

            {/* Action buttons */}
            {token && (
              <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                {/* Status */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => { setStatusMenuOpen(o => !o); setScoreMenuOpen(false); }}
                    disabled={actionLoading}
                    style={{
                      padding: '7px 18px', borderRadius: 999, fontSize: '0.82rem', fontWeight: 500,
                      border: currentStatusOpt ? `1px solid ${currentStatusOpt.color}88` : '1px dashed var(--border)',
                      background: currentStatusOpt ? `${currentStatusOpt.color}22` : 'transparent',
                      color: currentStatusOpt ? currentStatusOpt.color : 'var(--text-mid)',
                      cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    {currentStatusOpt ? currentStatusOpt.label : '+ Adicionar à lista'}
                  </button>
                  {statusMenuOpen && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setStatusMenuOpen(false)} />
                      <div style={{
                        position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 41,
                        background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
                        minWidth: 170, overflow: 'hidden',
                      }}>
                        {STATUS_OPTIONS.map(opt => (
                          <button key={opt.id} onClick={() => handleSetStatus(opt.id)} style={{
                            display: 'block', width: '100%', padding: '0.55rem 1rem',
                            background: userStatus === opt.id ? `${opt.color}22` : 'none',
                            border: 'none', textAlign: 'left', fontSize: '0.82rem',
                            color: userStatus === opt.id ? opt.color : 'var(--text-dark)',
                            fontWeight: userStatus === opt.id ? 600 : 400, cursor: 'pointer',
                          }}
                            onMouseEnter={e => e.currentTarget.style.background = `${opt.color}18`}
                            onMouseLeave={e => e.currentTarget.style.background = userStatus === opt.id ? `${opt.color}22` : 'none'}
                          >{opt.label}</button>
                        ))}
                        {userStatus && (
                          <button onClick={handleRemove} style={{
                            display: 'block', width: '100%', padding: '0.55rem 1rem',
                            background: 'none', border: 'none', borderTop: '1px solid var(--border)',
                            textAlign: 'left', fontSize: '0.82rem', color: 'var(--text-light)', cursor: 'pointer',
                          }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >Remover da lista</button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Score — só aparece se tem status */}
                {userStatus && (
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => { setScoreMenuOpen(o => !o); setStatusMenuOpen(false); }}
                      style={{
                        padding: '7px 18px', borderRadius: 999, fontSize: '0.82rem', fontWeight: 500,
                        border: `1px solid ${userScore ? '#c4a96b88' : 'var(--border)'}`,
                        background: userScore ? 'rgba(196,169,107,0.12)' : 'transparent',
                        color: userScore ? '#c4a96b' : 'var(--text-mid)',
                        cursor: 'pointer',
                      }}
                    >
                      {userScore ? `★ ${userScore}/10` : '+ Nota'}
                    </button>
                    {scoreMenuOpen && (
                      <>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setScoreMenuOpen(false)} />
                        <div style={{
                          position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 41,
                          background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
                          padding: '0.75rem',
                          display: 'grid', gridTemplateColumns: 'repeat(5, 38px)', gap: '0.35rem',
                        }}>
                          {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(n => (
                            <button key={n} onClick={() => handleSetScore(n)} style={{
                              width: 38, height: 38, borderRadius: 'var(--radius-sm)',
                              border: userScore === n ? '1px solid #c4a96b' : '1px solid var(--border)',
                              background: userScore === n ? 'rgba(196,169,107,0.25)' : 'var(--bg-secondary)',
                              color: userScore === n ? '#c4a96b' : 'var(--text-mid)',
                              fontSize: '0.82rem', fontWeight: userScore === n ? 700 : 400, cursor: 'pointer',
                            }}>{n}</button>
                          ))}
                          {userScore && (
                            <button onClick={() => handleSetScore(null)} style={{
                              gridColumn: '1 / -1', padding: '0.3rem',
                              background: 'none', border: 'none', borderTop: '1px solid var(--border)',
                              color: 'var(--text-light)', fontSize: '0.75rem', cursor: 'pointer', marginTop: 4,
                            }}>Remover nota</button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Sinopse ──────────────────────────────────────────────────────── */}
        {synopsis && (
          <Section title="Sinopse">
            <p style={{ fontSize: '0.875rem', color: 'var(--text-dark)', lineHeight: 1.8 }}>
              {isSynopsisLong && !synopsisExpanded ? synopsis.slice(0, SYNOPSIS_LIMIT) + '…' : synopsis}
            </p>
            {isSynopsisLong && (
              <button
                onClick={() => setSynopsisExpanded(v => !v)}
                style={{
                  marginTop: '0.625rem', background: 'none', border: 'none',
                  color: 'var(--accent-purple)', fontSize: '0.82rem',
                  cursor: 'pointer', padding: 0, fontWeight: 500,
                }}
              >
                {synopsisExpanded ? 'Ver menos ↑' : 'Ver mais ↓'}
              </button>
            )}
          </Section>
        )}

        {/* ── Trailer ──────────────────────────────────────────────────────── */}
        {anime.trailer_id && (
          <Section title="Trailer">
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <iframe
                src={`https://www.youtube.com/embed/${anime.trailer_id}`}
                title="Trailer"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              />
            </div>
          </Section>
        )}

        {/* ── Personagens ──────────────────────────────────────────────────── */}
        {characters.length > 0 && (
          <Section title="Personagens">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
              gap: '1rem',
            }}>
              {characters.map(char => (
                <div key={char.mal_id} style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '100%', aspectRatio: '3/4',
                    borderRadius: 'var(--radius-sm)', overflow: 'hidden',
                    marginBottom: '0.45rem', background: 'var(--bg-secondary)',
                  }}>
                    <img
                      src={char.image || 'https://via.placeholder.com/88x117?text=?'}
                      alt={char.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-dark)', fontWeight: 500, lineHeight: 1.3 }}>
                    {char.name}
                  </p>
                  <p style={{ fontSize: '0.62rem', color: 'var(--text-light)' }}>
                    {char.role === 'Main' ? 'Principal' : 'Secundário'}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Episódios ────────────────────────────────────────────────────── */}
        {episodes.length > 0 && (
          <Section title={`Episódios${anime.episodes ? ` · ${anime.episodes} total` : ''}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: 420, overflowY: 'auto' }}>
              {episodes.map(ep => (
                <div key={ep.number} style={{
                  display: 'flex', alignItems: 'center', gap: '0.875rem',
                  padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)',
                  background: ep.filler ? 'rgba(196,169,107,0.06)' : 'var(--bg-secondary)',
                }}>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-light)',
                    minWidth: 28, flexShrink: 0, fontVariantNumeric: 'tabular-nums',
                  }}>
                    {String(ep.number).padStart(2, '0')}
                  </span>
                  <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-dark)', lineHeight: 1.4 }}>
                    {ep.title}
                    {ep.filler && <span style={{ fontSize: '0.62rem', color: '#c4a96b', marginLeft: 8, fontWeight: 600 }}>FILLER</span>}
                    {ep.recap && <span style={{ fontSize: '0.62rem', color: 'var(--text-light)', marginLeft: 8 }}>RECAP</span>}
                  </span>
                  {ep.aired && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', flexShrink: 0 }}>
                      {ep.aired}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {epPagination.has_next_page && (
              <button
                onClick={loadMoreEpisodes}
                disabled={loadingMore}
                style={{
                  marginTop: '0.875rem', width: '100%', padding: '0.625rem',
                  borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border)',
                  background: 'transparent', color: 'var(--text-mid)',
                  fontSize: '0.85rem', cursor: loadingMore ? 'default' : 'pointer',
                }}
              >
                {loadingMore ? 'Carregando…' : 'Carregar mais episódios'}
              </button>
            )}
          </Section>
        )}

        {/* Reviews */}
        <Section title="Reviews">
          {/* My review */}
          {user && (
            <div style={{ marginBottom: reviews.filter(r => r.user_id !== user.id).length > 0 ? '1.25rem' : 0 }}>
              {myReview && !reviewFormOpen ? (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '0.875rem 1rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dark)' }}>Minha review</span>
                      {myReview.score && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-purple)' }}>★ {myReview.score}/10</span>}
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-light)', padding: '1px 6px', borderRadius: 999, border: '1px solid var(--border)' }}>{myReview.is_public ? 'Pública' : 'Privada'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => setReviewFormOpen(true)} style={{ fontSize: '0.75rem', color: 'var(--text-mid)', background: 'none', border: 'none', cursor: 'pointer' }}>Editar</button>
                      <button onClick={handleDeleteReview} style={{ fontSize: '0.75rem', color: '#b88a8a', background: 'none', border: 'none', cursor: 'pointer' }}>Excluir</button>
                    </div>
                  </div>
                  {myReview.text && <p style={{ fontSize: '0.85rem', color: 'var(--text-dark)', lineHeight: 1.5 }}>{myReview.text}</p>}
                </div>
              ) : reviewFormOpen ? (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '0.875rem 1rem', marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '0.75rem' }}>Minha review</p>
                  <textarea
                    value={reviewText} onChange={e => setReviewText(e.target.value)} maxLength={1000} rows={3}
                    placeholder="Escreva sua review... (opcional)"
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-dark)', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', resize: 'vertical', boxSizing: 'border-box', marginBottom: '0.75rem' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-mid)' }}>Nota:</span>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button key={n} onClick={() => setReviewScore(reviewScore === n ? null : n)}
                        style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid var(--border)', background: reviewScore === n ? 'var(--accent-purple)' : 'var(--bg-card)', color: reviewScore === n ? 'white' : 'var(--text-mid)', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                        {n}
                      </button>
                    ))}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.5rem', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-mid)' }}>
                      <input type="checkbox" checked={reviewPublic} onChange={e => setReviewPublic(e.target.checked)} />
                      Pública
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button onClick={() => setReviewFormOpen(false)} style={{ padding: '0.4rem 0.9rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'none', color: 'var(--text-mid)', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Cancelar</button>
                    <button onClick={handleSaveReview} disabled={savingReview} style={{ padding: '0.4rem 1rem', borderRadius: 'var(--radius-sm)', background: 'var(--accent-purple)', color: 'white', border: 'none', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: savingReview ? 0.7 : 1 }}>
                      {savingReview ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setReviewFormOpen(true)} style={{ fontSize: '0.8rem', color: 'var(--accent-purple)', background: 'none', border: '1px dashed var(--accent-purple-light)', borderRadius: 'var(--radius-sm)', padding: '0.45rem 1rem', cursor: 'pointer', marginBottom: '0.75rem', fontFamily: 'DM Sans, sans-serif' }}>
                  + Escrever review
                </button>
              )}
            </div>
          )}

          {/* Public reviews */}
          {reviews.filter(r => !user || r.user_id !== user.id).length === 0 && !myReview && !reviewFormOpen && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontStyle: 'italic' }}>Nenhuma review ainda. Seja o primeiro!</p>
          )}
          {reviews.filter(r => !user || r.user_id !== user.id).map(r => (
            <div key={r.id} style={{ borderTop: '1px solid var(--border)', paddingTop: '0.875rem', marginTop: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <img src={r.user_avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${r.user_id}`} alt={r.user_name} referrerPolicy="no-referrer" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-dark)' }}>{r.user_name}</span>
                {r.score && <span style={{ fontSize: '0.75rem', color: 'var(--accent-purple)', fontWeight: 700 }}>★ {r.score}/10</span>}
                <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginLeft: 'auto' }}>{new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              {r.text && <p style={{ fontSize: '0.85rem', color: 'var(--text-dark)', lineHeight: 1.5, paddingLeft: 34 }}>{r.text}</p>}
            </div>
          ))}
        </Section>

      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--accent-purple-light)', borderTopColor: 'var(--accent-purple)', animation: 'spin 0.7s linear infinite' }} />
  );
}

function Section({ title, children }) {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)', padding: '1.25rem 1.5rem',
      boxShadow: 'var(--shadow-sm)', marginBottom: '1.5rem',
    }}>
      <p style={{
        fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '1rem',
      }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function MetaChip({ children, color }) {
  return (
    <span style={{
      background: 'var(--bg-secondary)', color: color || 'var(--text-mid)',
      fontSize: '0.72rem', fontWeight: 500, padding: '3px 10px', borderRadius: 999,
    }}>
      {children}
    </span>
  );
}
