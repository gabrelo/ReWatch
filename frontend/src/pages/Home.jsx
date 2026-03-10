import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AnimeCard from '../components/AnimeCard';
import { useAuth } from '../context/AuthContext';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

function activityText(a) {
  const statusMap = { watched: 'Assistido', watching: 'Assistindo', plan_to_watch: 'Quero assistir', dropped: 'Dropado' };
  if (a.type === 'anime_added') return `adicionou "${a.data?.title}" como ${statusMap[a.data?.status] || a.data?.status}`;
  if (a.type === 'status_changed') return `marcou "${a.data?.title}" como ${statusMap[a.data?.status] || a.data?.status}`;
  if (a.type === 'list_created') return `criou a lista "${a.data?.name}"`;
  if (a.type === 'review_posted') return `escreveu uma review de "${a.data?.title}"`;
  return a.type;
}

const API = import.meta.env.VITE_API_URL;

const TABS = [
  { id: 'top',    label: 'Top Animes' },
  { id: 'season', label: 'Esta Temporada' },
  { id: 'search', label: 'Buscar' },
];

function getPaginationNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  const left = Math.max(2, current - 2);
  const right = Math.min(total - 1, current + 2);
  if (left > 2) pages.push('...');
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push('...');
  pages.push(total);
  return pages;
}

export default function Home() {
  const { user, getToken } = useAuth();
  const token = getToken();

  const [tab, setTab]               = useState('top');
  const [query, setQuery]           = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [animes, setAnimes]         = useState([]);
  const [loading, setLoading]       = useState(false);
  const [userList, setUserList]     = useState({});
  const [userScores, setUserScores] = useState({});
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [feed, setFeed]             = useState(null); // null = not loaded, [] = empty

  const abortRef = useRef(null);

  // Carregar lista do usuário
  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/anime/my-list`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        if (Array.isArray(data)) {
          const statusMap = {}, scoreMap = {};
          data.forEach(a => { statusMap[a.mal_id] = a.status; scoreMap[a.mal_id] = a.score || null; });
          setUserList(statusMap);
          setUserScores(scoreMap);
        }
      })
      .catch(() => {});
  }, [token]);

  const loadAnimes = useCallback(async (currentTab, currentQuery, currentPage) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      let url;
      if (currentTab === 'top')         url = `${API}/api/jikan/top?page=${currentPage}`;
      else if (currentTab === 'season') url = `${API}/api/jikan/season`;
      else                              url = `${API}/api/jikan/search?q=${encodeURIComponent(currentQuery)}&page=${currentPage}`;

      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (controller.signal.aborted) return;

      const items = Array.isArray(data.data) ? data.data : [];
      setAnimes(items);

      if (currentTab === 'top') {
        setTotalPages(data.pagination?.total_pages ?? 1);
      } else if (currentTab === 'search') {
        setTotalPages(items.length >= 20 ? currentPage + 1 : currentPage);
      } else {
        setTotalPages(1);
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Erro ao carregar animes:', err.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'feed') {
      if (!token) return;
      fetch(`${API}/api/follows/feed`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(d => setFeed(Array.isArray(d) ? d : []))
        .catch(() => setFeed([]));
      return;
    }
    setPage(1);
    setAnimes([]);
    if (tab !== 'search') loadAnimes(tab, '', 1);
  }, [tab, loadAnimes, token]);

  function handleSearch(e) {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setQuery(searchInput.trim());
    setPage(1);
    setAnimes([]);
    loadAnimes('search', searchInput.trim(), 1);
  }

  function handlePageChange(newPage) {
    if (newPage === page || newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    loadAnimes(tab, query, newPage);
  }

  function handleStatusChange(malId, status) {
    setUserList(prev => {
      const next = { ...prev };
      if (status === null) delete next[malId];
      else next[malId] = status;
      return next;
    });
  }

  function handleScoreChange(malId, score) {
    setUserScores(prev => ({ ...prev, [malId]: score }));
  }

  const showPagination = !loading && animes.length > 0 &&
    (tab === 'top' || (tab === 'search' && query));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 64 }}>
      <Navbar />

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 500, color: 'var(--text-dark)', marginBottom: '0.25rem' }}>
            Explorar Animes
          </h1>
          <p style={{ color: 'var(--text-mid)', fontSize: '0.9rem' }}>
            Encontre, adicione e organize sua jornada.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          {[...(user ? [{ id: 'feed', label: 'Feed' }] : []), ...TABS].map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); if (t.id !== 'search') setSearchInput(''); }}
              style={{
                padding: '0.6rem 1.25rem', background: 'none', border: 'none',
                borderBottom: tab === t.id ? '2px solid var(--accent-purple)' : '2px solid transparent',
                color: tab === t.id ? 'var(--accent-purple)' : 'var(--text-mid)',
                fontWeight: tab === t.id ? 600 : 400,
                fontSize: '0.9rem', cursor: 'pointer',
                transition: 'var(--transition)', marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Feed */}
        {tab === 'feed' && (
          feed === null ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--accent-purple-light)', borderTopColor: 'var(--accent-purple)', animation: 'spin 0.7s linear infinite' }} />
            </div>
          ) : feed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-mid)' }}>
              <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Seu feed está vazio.</p>
              <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Siga outros usuários para ver a atividade deles aqui.</p>
              <Link to="/discover" style={{ color: 'var(--accent-purple)', fontSize: '0.875rem', fontWeight: 500 }}>Descobrir usuários →</Link>
            </div>
          ) : (
            <div style={{ maxWidth: 620, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {feed.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem 1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
                  <Link to={a.user_username ? `/u/${a.user_username}` : `/profile/${a.user_id}`}>
                    <img src={a.user_avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${a.user_id}`} alt={a.user_name} referrerPolicy="no-referrer" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  </Link>
                  {a.data?.image_url && <img src={a.data.image_url} alt="" style={{ width: 32, height: 44, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-dark)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Link to={a.user_username ? `/u/${a.user_username}` : `/profile/${a.user_id}`} style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{a.user_name}</Link>
                      {' '}{activityText(a)}
                    </p>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', flexShrink: 0 }}>{timeAgo(a.created_at)}</span>
                </div>
              ))}
            </div>
          )
        )}

        {/* Search bar */}
        {tab !== 'feed' && tab === 'search' && (
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', maxWidth: 480 }}>
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Nome do anime..."
              style={{
                flex: 1, padding: '0.65rem 1rem',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                background: 'var(--bg-card)', fontSize: '0.9rem',
                color: 'var(--text-dark)', outline: 'none', transition: 'var(--transition)',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent-purple-light)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <button type="submit" style={{
              padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-purple)', color: 'white',
              border: 'none', fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer',
            }}
              onMouseEnter={e => e.target.style.background = '#a396b8'}
              onMouseLeave={e => e.target.style.background = 'var(--accent-purple)'}
            >Buscar</button>
          </form>
        )}

        {/* Anime grid */}
        {tab !== 'feed' && animes.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.25rem' }}>
            {animes.map(franchise => (
              <AnimeCard
                key={franchise.franchise_key}
                franchise={franchise}
                userStatuses={userList}
                onStatusChange={handleStatusChange}
                userScores={userScores}
                onScoreChange={handleScoreChange}
                token={token}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {tab !== 'feed' && !loading && animes.length === 0 && tab === 'search' && query && (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-mid)' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: 8 }}>Nenhum resultado para "{query}"</p>
            <p style={{ fontSize: '0.85rem' }}>Tente outro nome ou verifique a ortografia.</p>
          </div>
        )}

        {/* Loading */}
        {tab !== 'feed' && loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--accent-purple-light)', borderTopColor: 'var(--accent-purple)', animation: 'spin 0.7s linear infinite' }} />
          </div>
        )}

        {/* Pagination */}
        {tab !== 'feed' && showPagination && totalPages > 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginTop: '2.5rem', paddingBottom: '2rem' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>
              Página {page} de {totalPages} · {animes.length} animes
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <PageBtn onClick={() => handlePageChange(page - 1)} disabled={page === 1}>‹</PageBtn>
              {getPaginationNumbers(page, totalPages).map((p, i) =>
                p === '...'
                  ? <span key={`dots-${i}`} style={{ padding: '0 0.25rem', color: 'var(--text-light)', fontSize: '0.85rem' }}>…</span>
                  : <PageBtn key={p} onClick={() => handlePageChange(p)} active={p === page}>{p}</PageBtn>
              )}
              <PageBtn onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}>›</PageBtn>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function PageBtn({ onClick, disabled, active, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 36, height: 36, borderRadius: 'var(--radius-sm)',
        border: active ? 'none' : '1px solid var(--border)',
        background: active ? 'var(--accent-purple)' : disabled ? 'transparent' : 'var(--bg-card)',
        color: active ? 'white' : disabled ? 'var(--border)' : 'var(--text-mid)',
        fontWeight: active ? 600 : 400, fontSize: '0.85rem',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'var(--transition)',
        boxShadow: active ? 'var(--shadow-sm)' : 'none', padding: '0 0.5rem',
      }}
      onMouseEnter={e => { if (!disabled && !active) { e.currentTarget.style.borderColor = 'var(--accent-purple-light)'; e.currentTarget.style.color = 'var(--accent-purple)'; } }}
      onMouseLeave={e => { if (!disabled && !active) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-mid)'; } }}
    >
      {children}
    </button>
  );
}
