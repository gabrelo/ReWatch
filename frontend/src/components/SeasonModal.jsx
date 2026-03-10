import { useState, useRef } from 'react';
import StatusBadge, { STATUS_CONFIG } from './StatusBadge';

const API = import.meta.env.VITE_API_URL;

const STATUS_OPTIONS = [
  { value: 'watched', label: 'Assistido' },
  { value: 'watching', label: 'Assistindo' },
  { value: 'plan_to_watch', label: 'Quero assistir' },
  { value: 'dropped', label: 'Dropado' },
];

export default function SeasonModal({ franchise, userStatuses, userScores = {}, token, onStatusChange, onScoreChange, onClose }) {
  const [loadingIds, setLoadingIds] = useState({});
  const [markingAll, setMarkingAll] = useState(false);

  function setLoading(malId, val) {
    setLoadingIds(prev => ({ ...prev, [malId]: val }));
  }

  async function handleSetStatus(season, status) {
    if (!token) return;
    setLoading(season.mal_id, true);
    try {
      const currentStatus = userStatuses[season.mal_id];
      const method = currentStatus ? 'PUT' : 'POST';
      const url = currentStatus
        ? `${API}/api/anime/${season.mal_id}`
        : `${API}/api/anime/add`;
      const body = currentStatus
        ? { status }
        : { mal_id: season.mal_id, title: season.title || season.title_japanese, image_url: season.image_url, status };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) onStatusChange(season.mal_id, status);
    } finally {
      setLoading(season.mal_id, false);
    }
  }

  async function handleRemove(season) {
    if (!token || !userStatuses[season.mal_id]) return;
    setLoading(season.mal_id, true);
    try {
      const res = await fetch(`${API}/api/anime/${season.mal_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) onStatusChange(season.mal_id, null);
    } finally {
      setLoading(season.mal_id, false);
    }
  }

  async function handleSetScore(season, score) {
    if (!token || !userStatuses[season.mal_id]) return;
    setLoading(season.mal_id, true);
    try {
      const res = await fetch(`${API}/api/anime/${season.mal_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ score }),
      });
      if (res.ok && onScoreChange) onScoreChange(season.mal_id, score);
    } finally {
      setLoading(season.mal_id, false);
    }
  }

  async function handleMarkAll(status) {
    setMarkingAll(true);
    for (const season of franchise.seasons) {
      await handleSetStatus(season, status);
    }
    setMarkingAll(false);
  }

  // Separa temporadas TV/ONA dos filmes/OVAs para exibir agrupados
  const mainSeasons = franchise.seasons.filter(s => ['TV', 'ONA', null].includes(s.type));
  const movies = franchise.seasons.filter(s => s.type === 'Movie');
  const extras = franchise.seasons.filter(s => ['OVA', 'Special'].includes(s.type));

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(45, 55, 72, 0.45)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          width: '100%', maxWidth: 500,
          maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '1rem',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          flexShrink: 0,
        }}>
          <img
            src={franchise.cover_image}
            alt={franchise.title}
            style={{ width: 56, height: 78, objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0, boxShadow: 'var(--shadow-sm)' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-dark)', lineHeight: 1.3, marginBottom: 8 }}>
              {franchise.title}
            </h2>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {franchise.season_count > 0 && (
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '999px', border: '1px solid var(--border)' }}>
                  {franchise.season_count} Season{franchise.season_count !== 1 ? 's' : ''}
                </span>
              )}
              {franchise.movie_count > 0 && (
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-purple)', background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '999px', border: '1px solid var(--border)' }}>
                  {franchise.movie_count} Film{franchise.movie_count !== 1 ? 's' : ''}
                </span>
              )}
              {franchise.ova_count > 0 && (
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-green)', background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '999px', border: '1px solid var(--border)' }}>
                  {franchise.ova_count} OVA{franchise.ova_count !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: 4, flexShrink: 0, lineHeight: 0 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Seasons list */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {mainSeasons.length > 0 && (
            <SectionGroup label={franchise.season_count > 1 ? 'Temporadas' : null}>
              {mainSeasons.map(s => (
                <SeasonRow
                  key={s.mal_id}
                  season={s}
                  status={userStatuses[s.mal_id] || null}
                  score={userScores[s.mal_id] || null}
                  loading={loadingIds[s.mal_id]}
                  onSetStatus={status => handleSetStatus(s, status)}
                  onRemove={() => handleRemove(s)}
                  onSetScore={score => handleSetScore(s, score)}
                />
              ))}
            </SectionGroup>
          )}
          {movies.length > 0 && (
            <SectionGroup label="Filmes">
              {movies.map(s => (
                <SeasonRow
                  key={s.mal_id}
                  season={s}
                  status={userStatuses[s.mal_id] || null}
                  score={userScores[s.mal_id] || null}
                  loading={loadingIds[s.mal_id]}
                  onSetStatus={status => handleSetStatus(s, status)}
                  onRemove={() => handleRemove(s)}
                  onSetScore={score => handleSetScore(s, score)}
                />
              ))}
            </SectionGroup>
          )}
          {extras.length > 0 && (
            <SectionGroup label="OVAs / Especiais">
              {extras.map(s => (
                <SeasonRow
                  key={s.mal_id}
                  season={s}
                  status={userStatuses[s.mal_id] || null}
                  score={userScores[s.mal_id] || null}
                  loading={loadingIds[s.mal_id]}
                  onSetStatus={status => handleSetStatus(s, status)}
                  onRemove={() => handleRemove(s)}
                  onSetScore={score => handleSetScore(s, score)}
                />
              ))}
            </SectionGroup>
          )}
        </div>

        {/* Footer — marcar tudo */}
        {token && (
          <div style={{
            padding: '0.875rem 1.5rem',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            flexShrink: 0,
          }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginBottom: '0.5rem', letterSpacing: '0.03em' }}>
              MARCAR TUDO COMO
            </p>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleMarkAll(opt.value)}
                  disabled={markingAll}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '999px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    color: markingAll ? 'var(--text-light)' : 'var(--text-dark)',
                    fontSize: '0.78rem',
                    cursor: markingAll ? 'default' : 'pointer',
                    transition: 'var(--transition)',
                  }}
                  onMouseEnter={e => { if (!markingAll) { e.target.style.borderColor = 'var(--accent-purple-light)'; e.target.style.color = 'var(--accent-purple)'; } }}
                  onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = markingAll ? 'var(--text-light)' : 'var(--text-dark)'; }}
                >
                  {markingAll ? '...' : opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionGroup({ label, children }) {
  return (
    <div>
      {label && (
        <p style={{
          fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em',
          color: 'var(--text-light)', textTransform: 'uppercase',
          padding: '0.75rem 1.5rem 0.25rem',
        }}>
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

function SeasonRow({ season, status, score, loading, onSetStatus, onRemove, onSetScore }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [scorePos, setScorePos] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);
  const scoreBtnRef = useRef(null);

  const typeLabel = !['TV', 'ONA', null].includes(season.type) ? season.type : null;

  function openMenu() {
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setMenuOpen(true);
  }

  function openScorePicker() {
    const rect = scoreBtnRef.current.getBoundingClientRect();
    setScorePos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setScoreOpen(true);
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.875rem',
      padding: '0.75rem 1.5rem',
      borderBottom: '1px solid var(--border)',
    }}>
      <img
        src={season.image_url || 'https://via.placeholder.com/40x56?text=?'}
        alt={season.title}
        style={{ width: 38, height: 54, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.83rem', fontWeight: 500, color: 'var(--text-dark)', lineHeight: 1.3, marginBottom: 3 }}>
          {season.title}
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {typeLabel && <span style={{ fontSize: '0.68rem', color: 'var(--accent-blue)' }}>{typeLabel}</span>}
          {season.episodes && <span style={{ fontSize: '0.68rem', color: 'var(--text-light)' }}>{season.episodes} eps</span>}
          {season.year && <span style={{ fontSize: '0.68rem', color: 'var(--text-light)' }}>{season.year}</span>}
          {season.score && <span style={{ fontSize: '0.68rem', color: 'var(--text-light)' }}>★ {season.score}</span>}
        </div>
      </div>

      {/* Nota do usuário — só aparece se o anime está na lista */}
      {status && (
        <div style={{ flexShrink: 0 }}>
          <button
            ref={scoreBtnRef}
            onClick={openScorePicker}
            disabled={loading}
            title={score ? 'Alterar nota' : 'Adicionar nota'}
            style={{
              padding: '4px 9px', borderRadius: '999px',
              border: score ? 'none' : '1px dashed var(--border)',
              background: score ? 'rgba(196,169,107,0.18)' : 'transparent',
              color: score ? '#7a5a10' : 'var(--text-light)',
              fontSize: '0.72rem', fontWeight: score ? 600 : 400,
              cursor: loading ? 'default' : 'pointer', whiteSpace: 'nowrap',
              transition: 'var(--transition)',
            }}
          >
            {loading ? '...' : score ? `★ ${score}/10` : '+ nota'}
          </button>

          {scoreOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 500 }} onClick={() => setScoreOpen(false)} />
              <div style={{
                position: 'fixed', top: scorePos.top, right: scorePos.right,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                padding: '0.65rem', zIndex: 501,
              }}>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-light)', marginBottom: '0.4rem', textAlign: 'center' }}>
                  Sua nota
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.25rem' }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button
                      key={n}
                      onClick={() => { onSetScore(n); setScoreOpen(false); }}
                      style={{
                        width: 32, height: 32, borderRadius: 6,
                        border: score === n ? 'none' : '1px solid var(--border)',
                        background: score === n ? '#c4a96b' : 'transparent',
                        color: score === n ? 'white' : 'var(--text-dark)',
                        fontSize: '0.8rem', fontWeight: score === n ? 700 : 400,
                        cursor: 'pointer', transition: 'var(--transition)',
                      }}
                      onMouseEnter={e => { if (score !== n) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                      onMouseLeave={e => { if (score !== n) e.currentTarget.style.background = 'transparent'; }}
                    >{n}</button>
                  ))}
                </div>
                {score && (
                  <button
                    onClick={() => { onSetScore(null); setScoreOpen(false); }}
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
      )}

      {/* Status button */}
      <div style={{ flexShrink: 0 }}>
        <button
          ref={btnRef}
          onClick={openMenu}
          disabled={loading}
          style={{
            padding: '5px 10px',
            borderRadius: '999px',
            border: status ? 'none' : '1px dashed var(--border)',
            background: status ? 'var(--accent-purple-light)' : 'transparent',
            color: status ? 'var(--accent-purple)' : 'var(--text-light)',
            fontSize: '0.75rem',
            fontWeight: status ? 500 : 400,
            cursor: loading ? 'default' : 'pointer',
            whiteSpace: 'nowrap',
            transition: 'var(--transition)',
          }}
        >
          {loading ? '...' : status ? STATUS_CONFIG[status]?.label : '+ add'}
        </button>

        {menuOpen && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 500 }} onClick={() => setMenuOpen(false)} />
            <div style={{
              position: 'fixed', top: menuPos.top, right: menuPos.right,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)',
              overflow: 'hidden', zIndex: 501, minWidth: 150,
            }}>
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { onSetStatus(opt.value); setMenuOpen(false); }}
                  style={{
                    display: 'block', width: '100%', padding: '7px 12px',
                    textAlign: 'left', fontSize: '0.8rem',
                    color: status === opt.value ? 'var(--accent-purple)' : 'var(--text-dark)',
                    fontWeight: status === opt.value ? 600 : 400,
                    background: status === opt.value ? 'var(--accent-purple-light)' : 'transparent',
                    border: 'none', cursor: 'pointer', transition: 'var(--transition)',
                  }}
                  onMouseEnter={e => { if (status !== opt.value) e.target.style.background = 'var(--bg-secondary)'; }}
                  onMouseLeave={e => { if (status !== opt.value) e.target.style.background = 'transparent'; }}
                >
                  {opt.label}
                </button>
              ))}
              {status && (
                <button
                  onClick={() => { onRemove(); setMenuOpen(false); }}
                  style={{
                    display: 'block', width: '100%', padding: '7px 12px',
                    textAlign: 'left', fontSize: '0.8rem', color: '#b88a8a',
                    background: 'transparent', border: 'none',
                    borderTop: '1px solid var(--border)', cursor: 'pointer',
                    transition: 'var(--transition)',
                  }}
                  onMouseEnter={e => e.target.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={e => e.target.style.background = 'transparent'}
                >
                  Remover
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
