import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import EditProfileModal, { getCoverStyle } from '../components/EditProfileModal';
import { getLevel, TIER_COLORS } from '../utils/levels';

const API = import.meta.env.VITE_API_URL;

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

function statusPtBr(s) {
  return { watched: 'Assistido', watching: 'Assistindo', plan_to_watch: 'Quero assistir', dropped: 'Dropado' }[s] || s;
}

const STATUS_TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'watched', label: 'Assistido' },
  { id: 'watching', label: 'Assistindo' },
  { id: 'plan_to_watch', label: 'Quero assistir' },
  { id: 'dropped', label: 'Dropado' },
];

export default function Profile() {
  const { id, username } = useParams();
  const { user: me, getToken } = useAuth();
  const token = getToken();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [editOpen, setEditOpen] = useState(false);
  const [pinPickerOpen, setPinPickerOpen] = useState(false);
  const [triviaStreak, setTriviaStreak] = useState(0);
  const [compare, setCompare] = useState(null);
  const [copied, setCopied] = useState(false);
  const [followStats, setFollowStats] = useState({ followers_count: 0, following_count: 0, is_following: false });
  const [followLoading, setFollowLoading] = useState(false);
  const [activity, setActivity] = useState([]);
  const [profileReviews, setProfileReviews] = useState([]);

  const isOwn = me && data ? me.id === data.user.id : false;

  useEffect(() => {
    if (!isOwn) return;
    try {
      const s = JSON.parse(localStorage.getItem('rewatch_trivia_streak') || '{}');
      setTriviaStreak(s.count || 0);
    } catch {}
  }, [isOwn]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);
    setCompare(null);
    const url = username
      ? `${API}/api/user/u/${username}`
      : `${API}/api/user/${id}`;
    fetch(url)
      .then(r => { if (!r.ok) throw new Error('Usuário não encontrado'); return r.json(); })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, username]);

  async function handleTogglePin(malId) {
    if (!isOwn) return;
    const current = data.user.pinned_mal_ids || [];
    const isPinned = current.includes(malId);
    if (!isPinned && current.length >= 5) return;
    const next = isPinned ? current.filter(x => x !== malId) : [...current, malId];

    const res = await fetch(`${API}/api/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ pinned_mal_ids: next }),
    });
    if (res.ok) {
      const updated = await res.json();
      setData(prev => ({
        ...prev,
        user: { ...prev.user, pinned_mal_ids: updated.pinned_mal_ids },
        pinnedAnime: (updated.pinned_mal_ids || [])
          .map(pid => prev.animeList.find(a => a.mal_id === pid))
          .filter(Boolean),
      }));
    }
  }

  async function handleScoreChange(malId, score) {
    if (!isOwn || !token) return;
    const res = await fetch(`${API}/api/anime/${malId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ score }),
    });
    if (res.ok) {
      setData(prev => ({
        ...prev,
        animeList: prev.animeList.map(a => a.mal_id === malId ? { ...a, score } : a),
        pinnedAnime: (prev.pinnedAnime || []).map(a => a.mal_id === malId ? { ...a, score } : a),
      }));
    }
  }

  // Fetch compare data when viewing another user's profile
  useEffect(() => {
    if (!data || !me || isOwn || !token) return;
    fetch(`${API}/api/user/${data.user.id}/compare`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(setCompare)
      .catch(() => {});
  }, [data, me, isOwn, token]);

  useEffect(() => {
    if (!data) return;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`${API}/api/follows/${data.user.id}`, { headers })
      .then(r => r.json()).then(d => { if (d && typeof d.followers_count === 'number') setFollowStats(d); }).catch(() => {});
    fetch(`${API}/api/user/${data.user.id}/activity`)
      .then(r => r.json()).then(d => setActivity(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/api/user/${data.user.id}/reviews`)
      .then(r => r.json()).then(d => setProfileReviews(Array.isArray(d) ? d : [])).catch(() => {});
  }, [data]);

  async function handleToggleFollow() {
    if (!me || !token || isOwn || followLoading) return;
    setFollowLoading(true);
    const was = followStats.is_following;
    setFollowStats(prev => ({ ...prev, is_following: !was, followers_count: prev.followers_count + (was ? -1 : 1) }));
    await fetch(`${API}/api/follows/${data.user.id}`, {
      method: was ? 'DELETE' : 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    setFollowLoading(false);
  }

  function handleCopyLink() {
    const profileUser = data?.user;
    if (!profileUser) return;
    const url = profileUser.username
      ? `${window.location.origin}/u/${profileUser.username}`
      : `${window.location.origin}/profile/${profileUser.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleProfileSave(updates) {
    const res = await fetch(`${API}/api/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    });
    const body = await res.json();
    if (res.ok) {
      setData(prev => ({ ...prev, user: { ...prev.user, ...body } }));
      setEditOpen(false);
    } else {
      // Return error so modal can display it
      return body.error;
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 64 }}>
      <Navbar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--accent-purple-light)', borderTopColor: 'var(--accent-purple)', animation: 'spin 0.7s linear infinite' }} />
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 64 }}>
      <Navbar />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
        <p style={{ color: 'var(--text-mid)', fontSize: '1.1rem' }}>{error}</p>
        <Link to="/home" style={{ color: 'var(--accent-purple)', fontSize: '0.9rem' }}>← Voltar para Home</Link>
      </div>
    </div>
  );

  const { user, animeList, stats, pinnedAnime = [] } = data;
  const pinnedIds = user.pinned_mal_ids || [];
  const filteredList = (() => {
    let list = activeTab === 'all' ? animeList : animeList.filter(a => a.status === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q));
    }
    const sorted = [...list];
    switch (sortBy) {
      case 'date_asc':  sorted.sort((a, b) => new Date(a.added_at) - new Date(b.added_at)); break;
      case 'alpha_asc': sorted.sort((a, b) => a.title.localeCompare(b.title, 'pt')); break;
      case 'alpha_desc':sorted.sort((a, b) => b.title.localeCompare(a.title, 'pt')); break;
      case 'score_desc':sorted.sort((a, b) => (b.score ?? -1) - (a.score ?? -1)); break;
      case 'score_asc': sorted.sort((a, b) => {
        if (!a.score && !b.score) return 0;
        if (!a.score) return 1;
        if (!b.score) return -1;
        return a.score - b.score;
      }); break;
      // date_desc: já ordenado pelo backend
    }
    return sorted;
  })();
  const levelInfo = getLevel(stats.watched);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 64 }}>
      <Navbar />

      {/* ── Banner / Capa ── */}
      <div style={{ ...getCoverStyle(user), height: 220, position: 'relative' }}>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 100,
          background: 'linear-gradient(to bottom, transparent, var(--bg-primary))',
        }} />
        {isOwn && (
          <button
            onClick={() => setEditOpen(true)}
            style={{
              position: 'absolute', top: 16, right: 16,
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '6px 14px', borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.35)',
              background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(8px)',
              color: 'white', fontSize: '0.8rem', fontWeight: 500,
              cursor: 'pointer', transition: 'var(--transition)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.45)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.28)'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Editar perfil
          </button>
        )}
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 1.5rem', position: 'relative', zIndex: 1 }}>

        {/* ── Avatar + Nome ── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.25rem', marginTop: -52, marginBottom: '1rem' }}>
          <img
            src={user.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${user.id}`}
            alt={user.name}
            referrerPolicy="no-referrer"
            onError={e => { e.currentTarget.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${user.id}`; }}
            style={{
              width: 100, height: 100, borderRadius: '50%', objectFit: 'cover',
              border: '4px solid var(--bg-primary)', boxShadow: 'var(--shadow-md)',
              flexShrink: 0, background: 'var(--bg-secondary)',
            }}
          />
          <div style={{ paddingBottom: 4, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-dark)' }}>{user.name}</h1>
              {isOwn && (
                <span style={{ fontSize: '0.68rem', color: 'var(--accent-purple)', background: 'var(--accent-purple-light)', padding: '2px 10px', borderRadius: '999px' }}>
                  Você
                </span>
              )}
              {levelInfo && <LevelBadge level={levelInfo.current} />}
              {isOwn && triviaStreak > 0 && <StreakBadge count={triviaStreak} />}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: 4, flexWrap: 'wrap' }}>
              {user.username && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>@{user.username}</span>
              )}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                Membro desde {new Date(user.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              {isOwn && (
                <button
                  onClick={handleCopyLink}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    fontSize: '0.72rem', color: copied ? 'var(--accent-green)' : 'var(--text-light)',
                    background: 'none', border: '1px solid var(--border)',
                    borderRadius: '999px', padding: '2px 10px',
                    cursor: 'pointer', transition: 'var(--transition)',
                  }}
                >
                  {copied ? (
                    <>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                      Copiado!
                    </>
                  ) : (
                    <>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                      Copiar link
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Follow / Counts ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-mid)' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{followStats.followers_count}</span> seguidores
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-mid)' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{followStats.following_count}</span> seguindo
          </span>
          {!isOwn && me && (
            <button
              onClick={handleToggleFollow}
              disabled={followLoading}
              style={{
                padding: '0.35rem 1rem', borderRadius: '999px', fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', fontWeight: 500,
                background: followStats.is_following ? 'var(--bg-secondary)' : 'var(--accent-purple)',
                color: followStats.is_following ? 'var(--text-mid)' : 'white',
                border: followStats.is_following ? '1px solid var(--border)' : 'none',
                opacity: followLoading ? 0.7 : 1,
              }}
            >
              {followStats.is_following ? 'Seguindo' : 'Seguir'}
            </button>
          )}
        </div>

        {/* ── Bio ── */}
        {user.bio ? (
          <p style={{ fontSize: '0.9rem', color: 'var(--text-mid)', lineHeight: 1.7, marginBottom: '1.5rem', maxWidth: 560 }}>
            {user.bio}
          </p>
        ) : isOwn && (
          <p
            onClick={() => setEditOpen(true)}
            style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '1.5rem', cursor: 'pointer', fontStyle: 'italic' }}
          >
            + Adicionar uma bio...
          </p>
        )}

        {/* ── Level Progress ── */}
        {levelInfo && <LevelProgress levelInfo={levelInfo} watchedCount={stats.watched} />}

        {/* ── Stats ── */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
          <StatCard value={stats.total} label="Total" />
          <StatCard value={stats.watched} label="Assistido" color="var(--accent-green)" />
          <StatCard value={stats.watching} label="Assistindo" color="var(--accent-blue)" />
          <StatCard value={stats.plan_to_watch} label="Quero assistir" color="#c4a96b" />
          <StatCard value={stats.dropped} label="Dropado" color="#b88a8a" />
        </div>

        {/* ── Atividade recente ── */}
        {activity.length > 0 && (
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '1rem' }}>Atividade recente</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {activity.slice(0, 8).map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.875rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-sm)' }}>
                  {a.data?.image_url
                    ? <img src={a.data.image_url} alt={a.data.title || ''} style={{ width: 32, height: 44, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                    : <div style={{ width: 32, height: 44, borderRadius: 4, background: 'var(--bg-secondary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
                      </div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-dark)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.type === 'anime_added' && `Adicionou "${a.data?.title}" como ${statusPtBr(a.data?.status)}`}
                      {a.type === 'status_changed' && `Marcou "${a.data?.title}" como ${statusPtBr(a.data?.status)}`}
                      {a.type === 'list_created' && `Criou a lista "${a.data?.name}"`}
                      {a.type === 'review_posted' && `Escreveu uma review de "${a.data?.title}"`}
                    </p>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', flexShrink: 0 }}>{timeAgo(a.created_at)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Comparar listas ── */}
        {!isOwn && me && compare !== null && (
          <section style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-dark)' }}>
                Em comum com {user.name.split(' ')[0]}
              </h2>
              <span style={{
                fontSize: '0.72rem', fontWeight: 700,
                background: compare.total > 0 ? 'var(--accent-purple-light)' : 'var(--bg-secondary)',
                color: compare.total > 0 ? 'var(--accent-purple)' : 'var(--text-light)',
                padding: '2px 10px', borderRadius: '999px',
                border: '1px solid var(--border)',
              }}>
                {compare.total} anime{compare.total !== 1 ? 's' : ''}
              </span>
            </div>
            {compare.total === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
                Nenhum anime em comum ainda.
              </p>
            ) : (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {compare.animes.slice(0, 10).map(a => (
                  <div key={a.mal_id} title={a.title} style={{ position: 'relative', flexShrink: 0 }}>
                    <img
                      src={a.image_url || 'https://via.placeholder.com/60x84?text=?'}
                      alt={a.title}
                      style={{ width: 60, height: 84, objectFit: 'cover', borderRadius: 8, display: 'block' }}
                    />
                    <div style={{ position: 'absolute', bottom: 4, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                      <StatusBadge status={a.myStatus} small />
                    </div>
                  </div>
                ))}
                {compare.total > 10 && (
                  <div style={{
                    width: 60, height: 84, borderRadius: 8,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 600,
                    flexShrink: 0,
                  }}>
                    +{compare.total - 10}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ── Favoritos (Top 5 fixado) ── */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-dark)' }}>★ Favoritos</h2>
            {isOwn && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>
                {pinnedAnime.length}/5 · clique nos slots vazios para adicionar
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.875rem' }}>
            {pinnedAnime.map(anime => (
              <PinnedCard
                key={anime.mal_id}
                anime={anime}
                isOwn={isOwn}
                onUnpin={() => handleTogglePin(anime.mal_id)}
              />
            ))}
            {Array.from({ length: Math.max(0, 5 - pinnedAnime.length) }).map((_, i) => (
              <EmptyPinnedSlot
                key={i}
                isOwn={isOwn}
                onClick={isOwn ? () => setPinPickerOpen(true) : undefined}
              />
            ))}
          </div>
        </section>

        {/* ── Reviews recentes ── */}
        {profileReviews.length > 0 && (
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '1rem' }}>Reviews recentes</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {profileReviews.slice(0, 3).map(r => (
                <Link key={r.id} to={`/anime/${r.mal_id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.875rem', boxShadow: 'var(--shadow-sm)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-purple-light)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                  >
                    {r.anime_image && <img src={r.anime_image} alt={r.anime_title} style={{ width: 44, height: 60, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4 }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)' }}>{r.anime_title}</p>
                        {r.score && <span style={{ fontSize: '0.72rem', color: 'var(--accent-purple)', fontWeight: 700 }}>★ {r.score}/10</span>}
                      </div>
                      {r.text && <p style={{ fontSize: '0.8rem', color: 'var(--text-mid)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.text}</p>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Lista de animes ── */}
        <section>
          {/* Header + controles */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-dark)' }}>Minha Lista</h2>
            {animeList.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {/* Busca */}
                <div style={{ position: 'relative' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="2"
                    style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                  </svg>
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar..."
                    style={{
                      padding: '0.45rem 2rem 0.45rem 2rem',
                      borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                      background: 'var(--bg-card)', fontSize: '0.82rem',
                      color: 'var(--text-dark)', outline: 'none', width: 140,
                      transition: 'var(--transition)',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent-purple-light)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{
                        position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-light)', fontSize: '0.75rem', lineHeight: 0, padding: 0,
                      }}
                    >✕</button>
                  )}
                </div>

                {/* Ordenação */}
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  style={{
                    padding: '0.45rem 0.65rem',
                    borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                    background: 'var(--bg-card)', fontSize: '0.82rem',
                    color: 'var(--text-dark)', outline: 'none', cursor: 'pointer',
                  }}
                >
                  <option value="date_desc">Mais recente</option>
                  <option value="date_asc">Mais antigo</option>
                  <option value="alpha_asc">A → Z</option>
                  <option value="alpha_desc">Z → A</option>
                  <option value="score_desc">Maior nota</option>
                  <option value="score_asc">Menor nota</option>
                </select>
              </div>
            )}
          </div>

          {animeList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-light)' }}>
              <p>{isOwn ? 'Sua lista está vazia.' : 'Nenhum anime na lista ainda.'}</p>
              {isOwn && (
                <Link to="/home" style={{
                  display: 'inline-block', marginTop: 12, padding: '0.6rem 1.5rem',
                  borderRadius: '999px', background: 'var(--accent-purple)', color: 'white',
                  fontSize: '0.875rem', fontWeight: 500,
                }}>Explorar animes →</Link>
              )}
            </div>
          ) : (
            <>
              {/* Tabs de status */}
              <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
                {STATUS_TABS.map(t => {
                  const count = t.id === 'all' ? stats.total : stats[t.id];
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      style={{
                        padding: '0.5rem 1rem', background: 'none', border: 'none',
                        borderBottom: activeTab === t.id ? '2px solid var(--accent-purple)' : '2px solid transparent',
                        color: activeTab === t.id ? 'var(--accent-purple)' : 'var(--text-mid)',
                        fontWeight: activeTab === t.id ? 600 : 400,
                        fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap',
                        marginBottom: -1, transition: 'var(--transition)',
                      }}
                    >
                      {t.label}
                      {count > 0 && <span style={{ marginLeft: 4, fontSize: '0.7rem', color: 'var(--text-light)' }}>({count})</span>}
                    </button>
                  );
                })}
              </div>

              {filteredList.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                  {searchQuery.trim()
                    ? `Nenhum resultado para "${searchQuery}".`
                    : 'Nenhum anime nesta categoria.'}
                </p>
              ) : (
                <>
                  {searchQuery.trim() && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.75rem' }}>
                      {filteredList.length} resultado{filteredList.length !== 1 ? 's' : ''} para "{searchQuery}"
                    </p>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '1rem', paddingBottom: '3rem' }}>
                    {filteredList.map(anime => (
                      <ProfileAnimeCard
                        key={anime.id}
                        anime={anime}
                        isPinned={pinnedIds.includes(anime.mal_id)}
                        isOwn={isOwn}
                        onTogglePin={() => handleTogglePin(anime.mal_id)}
                        canPin={pinnedIds.length < 5 || pinnedIds.includes(anime.mal_id)}
                        onScoreChange={isOwn ? (score) => handleScoreChange(anime.mal_id, score) : null}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>

      {editOpen && (
        <EditProfileModal user={user} onSave={handleProfileSave} onClose={() => setEditOpen(false)} />
      )}

      {pinPickerOpen && isOwn && (
        <PinPickerModal
          animeList={animeList}
          pinnedIds={pinnedIds}
          onPin={(malId) => { handleTogglePin(malId); setPinPickerOpen(false); }}
          onClose={() => setPinPickerOpen(false)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StreakBadge({ count }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      fontSize: '0.7rem', fontWeight: 700,
      color: '#c45000', background: 'rgba(255,120,0,0.12)',
      padding: '3px 10px', borderRadius: '999px',
      border: '1px solid rgba(255,120,0,0.25)',
    }}>
      🔥 {count}
    </span>
  );
}

function LevelBadge({ level }) {
  const colors = TIER_COLORS[level.tier];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      fontSize: '0.7rem', fontWeight: 600,
      color: colors.text, background: colors.bg,
      padding: '3px 10px', borderRadius: '999px',
      border: `1px solid ${colors.bar}44`,
    }}>
      {level.emoji} {level.name}
    </span>
  );
}

function LevelProgress({ levelInfo, watchedCount }) {
  const { current, next, progress } = levelInfo;
  const colors = TIER_COLORS[current.tier];
  const isMax = !next;

  return (
    <div style={{
      background: colors.bg,
      border: `1px solid ${colors.bar}44`,
      borderRadius: 'var(--radius-md)',
      padding: '0.875rem 1.1rem',
      marginBottom: '1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '1.1rem' }}>{current.emoji}</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: colors.text }}>{current.name}</span>
        </div>
        {isMax ? (
          <span style={{ fontSize: '0.7rem', color: colors.text, fontWeight: 500 }}>
            🏆 Nível máximo — {watchedCount} animes assistidos
          </span>
        ) : (
          <span style={{ fontSize: '0.7rem', color: colors.text }}>
            {watchedCount} / {next.min} para <strong>{next.name}</strong>
          </span>
        )}
      </div>

      {/* Barra de progresso */}
      <div style={{
        height: 6, borderRadius: 999,
        background: `${colors.bar}30`,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          borderRadius: 999,
          background: isMax
            ? `linear-gradient(90deg, ${colors.bar}, ${colors.glow})`
            : colors.bar,
          transition: 'width 0.6s ease',
          boxShadow: isMax ? `0 0 8px ${colors.glow}` : 'none',
        }} />
      </div>

      {/* Próximos níveis (preview discreto) */}
      {!isMax && (
        <p style={{ fontSize: '0.62rem', color: colors.text, opacity: 0.65, marginTop: '0.4rem' }}>
          {next.min - watchedCount} anime{next.min - watchedCount !== 1 ? 's' : ''} para avançar
        </p>
      )}
    </div>
  );
}

function StatCard({ value, label, color }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '0.75rem 1.1rem',
      background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', minWidth: 72,
    }}>
      <span style={{ fontSize: '1.5rem', fontWeight: 600, color: color || 'var(--text-dark)', lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: '0.65rem', color: 'var(--text-light)', marginTop: 5, textAlign: 'center' }}>{label}</span>
    </div>
  );
}

function PinnedCard({ anime, isOwn, onUnpin }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        borderRadius: 'var(--radius-md)', overflow: 'hidden',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: hovered ? 'translateY(-3px)' : 'none',
        transition: 'var(--transition)', position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ position: 'relative', aspectRatio: '2/3', overflow: 'hidden' }}>
        <img
          src={anime.image_url || 'https://via.placeholder.com/140x200?text=?'}
          alt={anime.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{
          position: 'absolute', top: 6, left: 6,
          background: 'rgba(255,215,0,0.92)', borderRadius: '999px',
          padding: '1px 7px', fontSize: '0.65rem', fontWeight: 700, color: '#5a4000',
        }}>★</div>
        {isOwn && hovered && (
          <button
            onClick={onUnpin}
            title="Remover dos favoritos"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '0.3rem', color: 'white', fontSize: '0.72rem', fontWeight: 500,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Remover
          </button>
        )}
      </div>
      <div style={{ padding: '0.5rem 0.6rem' }}>
        <p style={{
          fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-dark)',
          lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: '2.1em',
        }}>{anime.title}</p>
      </div>
    </div>
  );
}

function EmptyPinnedSlot({ isOwn, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => isOwn && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 'var(--radius-md)',
        border: `2px dashed ${hovered ? 'var(--accent-purple)' : 'var(--border)'}`,
        aspectRatio: '2/3',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
        cursor: isOwn ? 'pointer' : 'default',
        transition: 'var(--transition)',
        background: hovered ? 'var(--accent-purple-light)' : 'transparent',
      }}
    >
      {hovered ? (
        <>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <p style={{ fontSize: '0.6rem', color: 'var(--accent-purple)', textAlign: 'center', lineHeight: 1.3, padding: '0 6px', fontWeight: 500 }}>
            Adicionar favorito
          </p>
        </>
      ) : (
        <>
          <span style={{ fontSize: '1.1rem', color: 'var(--border)' }}>★</span>
          {isOwn && (
            <p style={{ fontSize: '0.58rem', color: 'var(--text-light)', textAlign: 'center', lineHeight: 1.3, padding: '0 4px' }}>
              Fixe um anime
            </p>
          )}
        </>
      )}
    </div>
  );
}

function PinPickerModal({ animeList, pinnedIds, onPin, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const available = animeList.filter(a => !pinnedIds.includes(a.mal_id));
  const filtered = query.trim()
    ? available.filter(a => a.title.toLowerCase().includes(query.toLowerCase()))
    : available;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(45, 55, 72, 0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        width: '100%', maxWidth: 520,
        maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.1rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          flexShrink: 0,
        }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-dark)' }}>
            ★ Escolher favorito
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', lineHeight: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="2"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar na sua lista..."
              style={{
                width: '100%', padding: '0.5rem 0.75rem 0.5rem 2rem',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                background: 'var(--bg-secondary)', fontSize: '0.85rem',
                color: 'var(--text-dark)', outline: 'none',
                fontFamily: 'DM Sans, sans-serif',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent-purple-light)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem 0' }}>
          {filtered.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-light)', fontSize: '0.85rem' }}>
              {available.length === 0 ? 'Todos os animes já estão fixados.' : 'Nenhum anime encontrado.'}
            </p>
          ) : (
            filtered.map(anime => (
              <button
                key={anime.id}
                onClick={() => onPin(anime.mal_id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  width: '100%', padding: '0.6rem 1.5rem',
                  background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', transition: 'var(--transition)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <img
                  src={anime.image_url || 'https://via.placeholder.com/40x56?text=?'}
                  alt={anime.title}
                  style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-dark)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{anime.title}</p>
                  <StatusBadge status={anime.status} small />
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--accent-purple)', flexShrink: 0 }}>+ Fixar</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileAnimeCard({ anime, isPinned, isOwn, onTogglePin, canPin, onScoreChange }) {
  const [hovered, setHovered] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [scorePos, setScorePos] = useState({ top: 0, left: 0 });
  const scoreBtnRef = useRef(null);

  useEffect(() => {
    if (!scoreOpen) return;
    function handleClose() { setScoreOpen(false); }
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [scoreOpen]);

  function openScorePicker(e) {
    e.stopPropagation();
    const rect = scoreBtnRef.current.getBoundingClientRect();
    setScorePos({
      top: rect.bottom + 4,
      left: Math.min(rect.left, window.innerWidth - 190),
    });
    setScoreOpen(true);
  }

  return (
    <div
      style={{
        borderRadius: 'var(--radius-md)', overflow: 'visible',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: hovered ? 'translateY(-3px)' : 'none',
        transition: 'var(--transition)', position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isOwn && (
        <button
          onClick={onTogglePin}
          title={isPinned ? 'Remover dos favoritos' : canPin ? 'Adicionar aos favoritos' : 'Máximo 5 favoritos'}
          style={{
            position: 'absolute', top: -8, right: -8, zIndex: 10,
            width: 26, height: 26, borderRadius: '50%',
            border: isPinned ? 'none' : '1px solid var(--border)',
            background: isPinned ? 'rgba(255,215,0,0.95)' : 'var(--bg-card)',
            color: isPinned ? '#5a4000' : (canPin ? 'var(--text-light)' : 'var(--border)'),
            fontSize: '0.72rem', cursor: (canPin || isPinned) ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)',
            opacity: hovered || isPinned ? 1 : 0,
          }}
        >★</button>
      )}
      <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <div style={{ position: 'relative', aspectRatio: '2/3', overflow: 'hidden' }}>
          <img
            src={anime.image_url || 'https://via.placeholder.com/140x200?text=?'}
            alt={anime.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', top: 6, left: 6 }}>
            <StatusBadge status={anime.status} small />
          </div>
        </div>
        <div style={{ padding: '0.5rem 0.65rem' }}>
          <p style={{
            fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-dark)',
            lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: '2.2em',
          }}>{anime.title}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <p style={{ fontSize: '0.63rem', color: 'var(--text-light)' }}>
              {new Date(anime.added_at).toLocaleDateString('pt-BR')}
            </p>
            {/* Nota */}
            {anime.score ? (
              <button
                ref={scoreBtnRef}
                onClick={isOwn && onScoreChange ? openScorePicker : undefined}
                title={isOwn ? 'Alterar nota' : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  fontSize: '0.7rem', fontWeight: 700,
                  color: '#c4a96b',
                  background: 'rgba(196,169,107,0.12)',
                  border: '1px solid rgba(196,169,107,0.3)',
                  borderRadius: 999, padding: '1px 7px',
                  cursor: isOwn && onScoreChange ? 'pointer' : 'default',
                }}
              >
                ★ {anime.score}
              </button>
            ) : isOwn && onScoreChange ? (
              <button
                ref={scoreBtnRef}
                onClick={openScorePicker}
                title="Dar nota"
                style={{
                  fontSize: '0.65rem', fontWeight: 500,
                  color: 'var(--text-light)',
                  background: 'none',
                  border: '1px dashed var(--border)',
                  borderRadius: 999, padding: '1px 7px',
                  cursor: 'pointer',
                }}
              >
                + nota
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Score picker */}
      {scoreOpen && onScoreChange && (
        <>
          <div
            style={{
              position: 'fixed', top: scorePos.top, left: scorePos.left,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
              padding: '0.65rem', zIndex: 401,
            }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ fontSize: '0.65rem', color: 'var(--text-light)', marginBottom: '0.4rem', textAlign: 'center' }}>
              Sua nota
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.25rem' }}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button
                  key={n}
                  onClick={() => { onScoreChange(n); setScoreOpen(false); }}
                  style={{
                    width: 32, height: 32, borderRadius: 6,
                    border: anime.score === n ? 'none' : '1px solid var(--border)',
                    background: anime.score === n ? '#c4a96b' : 'transparent',
                    color: anime.score === n ? 'white' : 'var(--text-dark)',
                    fontSize: '0.8rem', fontWeight: anime.score === n ? 700 : 400,
                    cursor: 'pointer', transition: 'var(--transition)',
                  }}
                  onMouseEnter={e => { if (anime.score !== n) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                  onMouseLeave={e => { if (anime.score !== n) e.currentTarget.style.background = 'transparent'; }}
                >{n}</button>
              ))}
            </div>
            {anime.score && (
              <button
                onClick={() => { onScoreChange(null); setScoreOpen(false); }}
                style={{
                  display: 'block', width: '100%', marginTop: '0.4rem',
                  padding: '4px 0', fontSize: '0.7rem', color: 'var(--text-light)',
                  background: 'none', border: 'none', borderTop: '1px solid var(--border)',
                  paddingTop: '0.4rem', cursor: 'pointer',
                }}
              >Remover nota</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
