import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '1.5rem' }}>Editar lista</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', display: 'block', marginBottom: 6 }}>Nome *</label>
            <input
              value={name} onChange={e => setName(e.target.value)} maxLength={100}
              style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-dark)', fontSize: '0.9rem', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', display: 'block', marginBottom: 6 }}>Descrição</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)} maxLength={300} rows={2}
              style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-dark)', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', userSelect: 'none' }}>
            <div
              onClick={() => setIsPublic(p => !p)}
              style={{ width: 40, height: 22, borderRadius: 11, background: isPublic ? 'var(--accent-purple)' : 'var(--border)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
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

function AddAnimeSearch({ listId, existingIds, onAdded, token }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API}/api/jikan/search?q=${encodeURIComponent(query)}&limit=6`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setResults(data.data || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 450);
  }, [query]);

  async function addAnime(anime) {
    setAdding(anime.mal_id);
    await fetch(`${API}/api/lists/${listId}/anime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mal_id: anime.mal_id, title: anime.title, image_url: anime.images?.jpg?.image_url || null }),
    });
    onAdded({ mal_id: anime.mal_id, title: anime.title, image_url: anime.images?.jpg?.image_url || null });
    setAdding(null);
  }

  return (
    <div style={{ marginBottom: '2rem' }}>
      <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', display: 'block', marginBottom: 8 }}>Adicionar anime</label>
      <div style={{ position: 'relative' }}>
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Buscar anime..."
          style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-dark)', fontSize: '0.9rem', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
        />
        {searching && (
          <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--accent-purple-light)', borderTopColor: 'var(--accent-purple)', animation: 'spin 0.7s linear infinite' }} />
        )}
      </div>

      {results.length > 0 && (
        <div style={{ marginTop: 8, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
          {results.map(anime => {
            const already = existingIds.has(anime.mal_id);
            return (
              <div key={anime.mal_id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.875rem', borderBottom: '1px solid var(--border)' }}>
                <img src={anime.images?.jpg?.small_image_url} alt={anime.title} style={{ width: 36, height: 50, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text-dark)', lineHeight: 1.3 }}>{anime.title}</span>
                <button
                  onClick={() => !already && addAnime(anime)}
                  disabled={already || adding === anime.mal_id}
                  style={{ padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-sm)', border: 'none', background: already ? 'var(--bg-secondary)' : 'var(--accent-purple)', color: already ? 'var(--text-light)' : 'white', fontSize: '0.8rem', cursor: already ? 'default' : 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0, opacity: adding === anime.mal_id ? 0.7 : 1 }}
                >
                  {already ? 'Adicionado' : adding === anime.mal_id ? '...' : '+ Adicionar'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ListDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, getToken } = useAuth();
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/lists/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        if (data.error) { setList(null); } else { setList(data); }
      })
      .catch(() => setList(null))
      .finally(() => setLoading(false));
  }, [id]);

  const isOwner = user && list && user.id === list.user_id;

  async function handleEdit({ name, description, is_public }) {
    const res = await fetch(`${API}/api/lists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ name, description, is_public }),
    });
    const data = await res.json();
    if (!res.ok) return data.error || 'Erro ao salvar';
    setList(prev => ({ ...prev, ...data }));
    setEditOpen(false);
  }

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja excluir esta lista?')) return;
    await fetch(`${API}/api/lists/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    navigate('/lists');
  }

  async function handleRemoveAnime(malId) {
    setRemoving(malId);
    const res = await fetch(`${API}/api/lists/${id}/anime/${malId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();
    if (res.ok) setList(prev => ({ ...prev, anime: data.anime }));
    setRemoving(null);
  }

  function handleAnimeAdded(anime) {
    setList(prev => ({ ...prev, anime: [...prev.anime, anime] }));
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/lists/${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 64 }}>
      <Navbar />
      <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--accent-purple-light)', borderTopColor: 'var(--accent-purple)', animation: 'spin 0.7s linear infinite' }} />
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!list) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 64 }}>
      <Navbar />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center', color: 'var(--text-mid)' }}>
        <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Lista não encontrada.</p>
        <Link to="/lists" style={{ color: 'var(--accent-purple)', fontSize: '0.9rem' }}>← Voltar para minhas listas</Link>
      </div>
    </div>
  );

  const existingIds = new Set(list.anime.map(a => a.mal_id));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 64 }}>
      <Navbar />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <Link to="/lists" style={{ fontSize: '0.8rem', color: 'var(--text-mid)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '1rem' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            Minhas listas
          </Link>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-dark)' }}>{list.name}</h1>
                <span style={{
                  fontSize: '0.65rem', fontWeight: 600,
                  padding: '2px 8px', borderRadius: '999px',
                  background: list.is_public ? 'rgba(157,181,160,0.2)' : 'rgba(180,180,180,0.15)',
                  color: list.is_public ? 'var(--accent-green)' : 'var(--text-light)',
                  border: `1px solid ${list.is_public ? 'var(--accent-green)' : 'var(--border)'}`,
                }}>
                  {list.is_public ? 'Pública' : 'Privada'}
                </span>
              </div>
              {list.description && (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-mid)', marginBottom: '0.4rem', lineHeight: 1.5 }}>{list.description}</p>
              )}
              <p style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
                por <span style={{ color: 'var(--text-mid)' }}>{list.owner_name}</span>
                {' · '}{list.anime.length} {list.anime.length === 1 ? 'anime' : 'animes'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              {list.is_public && (
                <button
                  onClick={copyLink}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'none', color: copied ? 'var(--accent-green)' : 'var(--text-mid)', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'var(--transition)' }}
                >
                  {copied
                    ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg> Copiado!</>
                    : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg> Compartilhar</>
                  }
                </button>
              )}
              {isOwner && (
                <>
                  <button
                    onClick={() => setEditOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'none', color: 'var(--text-mid)', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    Editar
                  </button>
                  <button
                    onClick={handleDelete}
                    style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(184,138,138,0.4)', background: 'none', color: '#b88a8a', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                  >
                    Excluir
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Add anime (owner only) */}
        {isOwner && (
          <AddAnimeSearch listId={id} existingIds={existingIds} onAdded={handleAnimeAdded} token={getToken()} />
        )}

        {/* Anime grid */}
        {list.anime.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-mid)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.3, marginBottom: '1rem' }}>
              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
            </svg>
            <p style={{ fontSize: '1rem', marginBottom: '0.4rem' }}>Lista vazia</p>
            <p style={{ fontSize: '0.85rem' }}>{isOwner ? 'Use a busca acima para adicionar animes.' : 'Nenhum anime nesta lista ainda.'}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem' }}>
            {list.anime.map(anime => (
              <div key={anime.mal_id} style={{ position: 'relative' }}>
                <Link to={`/anime/${anime.mal_id}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = 'var(--accent-purple-light)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                  >
                    <div style={{ height: 185, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                      {anime.image_url
                        ? <img src={anime.image_url} alt={anime.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-mid)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
                          </div>
                      }
                    </div>
                    <div style={{ padding: '0.6rem 0.65rem' }}>
                      <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dark)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{anime.title}</p>
                    </div>
                  </div>
                </Link>
                {isOwner && (
                  <button
                    onClick={() => handleRemoveAnime(anime.mal_id)}
                    disabled={removing === anime.mal_id}
                    style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: 'white', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: removing === anime.mal_id ? 0.5 : 1 }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {editOpen && (
        <ListFormModal initial={list} onSave={handleEdit} onClose={() => setEditOpen(false)} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
