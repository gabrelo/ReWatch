import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const API = import.meta.env.VITE_API_URL;

const DAYS = [
  { key: 'monday', label: 'Segunda' },
  { key: 'tuesday', label: 'Terça' },
  { key: 'wednesday', label: 'Quarta' },
  { key: 'thursday', label: 'Quinta' },
  { key: 'friday', label: 'Sexta' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

const JS_DAY_TO_KEY = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export default function Schedule() {
  const { user, getToken } = useAuth();
  const todayKey = JS_DAY_TO_KEY[new Date().getDay()];
  const [activeDay, setActiveDay] = useState(todayKey);
  const [animes, setAnimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userList, setUserList] = useState(new Map());
  const [adding, setAdding] = useState(null);

  useEffect(() => {
    if (user) {
      fetch(`${API}/api/anime/my-list`, { headers: { Authorization: `Bearer ${getToken()}` } })
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(data => setUserList(new Map(data.map(a => [a.mal_id, a.status]))))
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    setAnimes([]);
    fetch(`${API}/api/jikan/schedule?day=${activeDay}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setAnimes(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeDay]);

  async function handleWatch(anime) {
    if (!user) return;
    setAdding(anime.mal_id);
    const status = userList.has(anime.mal_id) ? userList.get(anime.mal_id) : null;
    if (status === 'watching') {
      // already watching, skip
      setAdding(null);
      return;
    }
    if (status) {
      await fetch(`${API}/api/anime/${anime.mal_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ status: 'watching' }),
      });
    } else {
      await fetch(`${API}/api/anime/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ mal_id: anime.mal_id, title: anime.title, image_url: anime.images?.jpg?.image_url || null, status: 'watching' }),
      });
    }
    setUserList(prev => new Map(prev).set(anime.mal_id, 'watching'));
    setAdding(null);
  }

  const statusLabel = { watched: 'Assistido', watching: 'Assistindo', plan_to_watch: 'Planejo', dropped: 'Dropado' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 64 }}>
      <Navbar />

      <div style={{ maxWidth: 1050, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--text-dark)', marginBottom: '0.2rem' }}>Calendário de lançamentos</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-mid)' }}>Animes em exibição por dia da semana.</p>
        </div>

        {/* Day tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
          {DAYS.map(d => (
            <button
              key={d.key}
              onClick={() => setActiveDay(d.key)}
              style={{
                padding: '0.45rem 1rem', borderRadius: 'var(--radius-sm)', border: 'none',
                background: activeDay === d.key ? 'var(--accent-purple)' : 'var(--bg-card)',
                color: activeDay === d.key ? 'white' : d.key === todayKey ? 'var(--accent-purple)' : 'var(--text-mid)',
                fontSize: '0.875rem', fontWeight: activeDay === d.key || d.key === todayKey ? 600 : 400,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                border: d.key === todayKey && activeDay !== d.key ? '1px solid var(--accent-purple-light)' : '1px solid transparent',
              }}
            >
              {d.label}
              {d.key === todayKey && <span style={{ marginLeft: 4, fontSize: '0.65rem', opacity: 0.8 }}>• hoje</span>}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--accent-purple-light)', borderTopColor: 'var(--accent-purple)', animation: 'spin 0.7s linear infinite' }} />
          </div>
        )}

        {!loading && animes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-mid)' }}>
            <p>Nenhum anime encontrado para este dia.</p>
          </div>
        )}

        {!loading && animes.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
            {animes.map(anime => {
              const inList = userList.get(anime.mal_id);
              return (
                <div key={anime.mal_id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }}>
                  <Link to={`/anime/${anime.mal_id}`} style={{ textDecoration: 'none', display: 'block', flexShrink: 0 }}>
                    <div style={{ height: 200, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                      {anime.images?.jpg?.image_url
                        ? <img src={anime.images.jpg.image_url} alt={anime.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-mid)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
                          </div>
                      }
                    </div>
                  </Link>

                  <div style={{ padding: '0.6rem 0.65rem 0.75rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dark)', lineHeight: 1.3, marginBottom: '0.5rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', flex: 1 }}>{anime.title}</p>

                    {user && (
                      inList ? (
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '999px', background: 'var(--bg-secondary)', color: 'var(--text-mid)', border: '1px solid var(--border)', alignSelf: 'flex-start', marginTop: 'auto' }}>
                          {statusLabel[inList] || inList}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleWatch(anime)}
                          disabled={adding === anime.mal_id}
                          style={{ width: '100%', padding: '0.35rem', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--accent-purple)', color: 'white', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: adding === anime.mal_id ? 0.7 : 1, marginTop: 'auto' }}
                        >
                          {adding === anime.mal_id ? '...' : '+ Acompanhar'}
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
