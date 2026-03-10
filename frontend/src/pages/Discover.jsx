import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

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

export default function Discover() {
  const { user, getToken } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followState, setFollowState] = useState({});

  useEffect(() => {
    fetch(`${API}/api/discover`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(async data => {
        const filtered = data.filter(u => u.id !== user?.id);
        setUsers(filtered);
        if (user && filtered.length > 0) {
          const results = await Promise.allSettled(
            filtered.map(u =>
              fetch(`${API}/api/follows/${u.id}`, { headers: { Authorization: `Bearer ${getToken()}` } })
                .then(r => { if (!r.ok) throw new Error(); return r.json(); })
                .then(d => [u.id, d.is_following])
            )
          );
          setFollowState(Object.fromEntries(results.filter(r => r.status === 'fulfilled').map(r => r.value)));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  async function toggleFollow(targetId) {
    const following = followState[targetId];
    setFollowState(prev => ({ ...prev, [targetId]: !following }));
    await fetch(`${API}/api/follows/${targetId}`, {
      method: following ? 'DELETE' : 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 64 }}>
      <Navbar />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--text-dark)', marginBottom: '0.2rem' }}>Descobrir usuários</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-mid)' }}>Encontre outros fãs de anime e siga quem tem gostos parecidos com os seus.</p>
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--accent-purple-light)', borderTopColor: 'var(--accent-purple)', animation: 'spin 0.7s linear infinite' }} />
          </div>
        )}

        {!loading && users.length === 0 && (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-mid)' }}>
            <p style={{ fontSize: '1rem' }}>Nenhum usuário para descobrir ainda.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>Convide amigos para começar!</p>
          </div>
        )}

        {!loading && users.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '1rem' }}>
            {users.map(u => (
              <div key={u.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', textAlign: 'center' }}>
                <Link to={u.username ? `/u/${u.username}` : `/profile/${u.id}`} style={{ textDecoration: 'none' }}>
                  <img
                    src={u.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${u.id}`}
                    alt={u.name}
                    referrerPolicy="no-referrer"
                    onError={e => { e.currentTarget.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${u.id}`; }}
                    style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }}
                  />
                </Link>

                <div>
                  <Link to={u.username ? `/u/${u.username}` : `/profile/${u.id}`} style={{ textDecoration: 'none' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-dark)', marginBottom: 2 }}>{u.name}</p>
                    {u.username && <p style={{ fontSize: '0.75rem', color: 'var(--text-mid)' }}>@{u.username}</p>}
                  </Link>
                </div>

                <p style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
                  {u.anime_count} {u.anime_count === 1 ? 'anime' : 'animes'}
                </p>

                {user && (
                  <button
                    onClick={() => toggleFollow(u.id)}
                    style={{
                      width: '100%', padding: '0.45rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', fontWeight: 500,
                      background: followState[u.id] ? 'var(--bg-secondary)' : 'var(--accent-purple)',
                      color: followState[u.id] ? 'var(--text-mid)' : 'white',
                      border: followState[u.id] ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    {followState[u.id] ? 'Seguindo' : 'Seguir'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
