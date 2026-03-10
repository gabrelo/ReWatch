import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const API = import.meta.env.VITE_API_URL;

function ListFormModal({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Nome obrigatório'); return; }
    setSaving(true);
    setError('');
    const err = await onSave({ name: name.trim(), description: description.trim(), is_public: isPublic });
    if (err) setError(err);
    setSaving(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: '1rem' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', width: '100%', maxWidth: 440, boxShadow: 'var(--shadow-lg)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '1.5rem' }}>
          {initial ? 'Editar lista' : 'Nova lista'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', display: 'block', marginBottom: 6 }}>Nome *</label>
            <input
              value={name} onChange={e => setName(e.target.value)} maxLength={100}
              placeholder="Ex: Animes pra assistir com a namorada"
              style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-dark)', fontSize: '0.9rem', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', display: 'block', marginBottom: 6 }}>Descrição</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)} maxLength={300} rows={2}
              placeholder="Opcional"
              style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-dark)', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', userSelect: 'none' }}>
            <div
              onClick={() => setIsPublic(p => !p)}
              style={{
                width: 40, height: 22, borderRadius: 11, background: isPublic ? 'var(--accent-purple)' : 'var(--border)',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <div style={{ position: 'absolute', top: 3, left: isPublic ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-dark)' }}>
              {isPublic ? 'Pública — qualquer pessoa pode ver' : 'Privada — só você vê'}
            </span>
          </label>

          {error && <p style={{ fontSize: '0.8rem', color: '#b88a8a' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.55rem 1.1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'none', color: 'var(--text-mid)', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} style={{ padding: '0.55rem 1.25rem', borderRadius: 'var(--radius-sm)', background: 'var(--accent-purple)', color: 'white', border: 'none', fontSize: '0.875rem', fontWeight: 500, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'DM Sans, sans-serif' }}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Lists() {
  const { user, getToken } = useAuth();
  const navigate = useNavigate();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch(`${API}/api/lists/my`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => setLists(d.data || []))
      .finally(() => setLoading(false));
  }, [user]);

  async function handleCreate({ name, description, is_public }) {
    const res = await fetch(`${API}/api/lists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ name, description, is_public }),
    });
    const data = await res.json();
    if (!res.ok) return data.error || 'Erro ao criar lista';
    setLists(prev => [data, ...prev]);
    setModalOpen(false);
    navigate(`/lists/${data.id}`);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 64 }}>
      <Navbar />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--text-dark)', marginBottom: '0.2rem' }}>Minhas Listas</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-mid)' }}>Organize seus animes em listas temáticas.</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-sm)', background: 'var(--accent-purple)', color: 'white', border: 'none', fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Nova lista
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--accent-purple-light)', borderTopColor: 'var(--accent-purple)', animation: 'spin 0.7s linear infinite' }} />
          </div>
        )}

        {/* Empty state */}
        {!loading && lists.length === 0 && (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-mid)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.3, marginBottom: '1rem' }}>
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
            </svg>
            <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Nenhuma lista ainda</p>
            <p style={{ fontSize: '0.85rem' }}>Crie sua primeira lista para organizar seus animes.</p>
          </div>
        )}

        {/* Grid */}
        {!loading && lists.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {lists.map(list => (
              <Link
                key={list.id}
                to={`/lists/${list.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = 'var(--accent-purple-light)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  {/* Anime covers strip */}
                  <div style={{ height: 88, display: 'flex', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                    {list.anime.slice(0, 4).map((a, i) => (
                      <div key={a.mal_id} style={{ flex: 1, overflow: 'hidden' }}>
                        {a.image_url
                          ? <img src={a.image_url} alt={a.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', background: `hsl(${i * 60 + 200}, 20%, 30%)` }} />
                        }
                      </div>
                    ))}
                    {list.anime.length === 0 && (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-mid)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: '0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-dark)', lineHeight: 1.3 }}>{list.name}</p>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 600, flexShrink: 0,
                        padding: '2px 7px', borderRadius: '999px',
                        background: list.is_public ? 'rgba(157,181,160,0.2)' : 'rgba(180,180,180,0.15)',
                        color: list.is_public ? 'var(--accent-green)' : 'var(--text-light)',
                        border: `1px solid ${list.is_public ? 'var(--accent-green)' : 'var(--border)'}`,
                      }}>
                        {list.is_public ? 'Pública' : 'Privada'}
                      </span>
                    </div>
                    {list.description && (
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-mid)', marginBottom: '0.5rem', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {list.description}
                      </p>
                    )}
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                      {list.anime.length} {list.anime.length === 1 ? 'anime' : 'animes'}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <ListFormModal onSave={handleCreate} onClose={() => setModalOpen(false)} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
