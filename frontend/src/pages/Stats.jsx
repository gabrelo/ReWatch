import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL;
const CACHE_KEY = 'rewatch_jikan_cache';

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
function saveCache(c) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {}
}

function computeStats(list, details) {
  const byStatus = { watched: 0, watching: 0, plan_to_watch: 0, dropped: 0 };
  const scores = {};
  let scoreSum = 0, scoreCount = 0;
  let totalEpisodes = 0, totalMinutes = 0;
  const genreCounts = {}, studioCounts = {}, yearCounts = {};

  for (const a of list) {
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    if (a.score) {
      scores[a.score] = (scores[a.score] || 0) + 1;
      scoreSum += a.score;
      scoreCount++;
    }
    const d = details[a.mal_id];
    if (!d) continue;

    if (a.status === 'watched' && d.episodes) {
      totalEpisodes += d.episodes;
      totalMinutes += d.episodes * (d.minutesPerEp || 24);
    }
    if (a.status !== 'plan_to_watch') {
      (d.genres || []).forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; });
      (d.studios || []).forEach(s => { studioCounts[s] = (studioCounts[s] || 0) + 1; });
    }
    if (d.year) yearCounts[d.year] = (yearCounts[d.year] || 0) + 1;
  }

  return {
    total: list.length,
    byStatus,
    totalEpisodes,
    totalHours: Math.round(totalMinutes / 60),
    averageScore: scoreCount > 0 ? (scoreSum / scoreCount).toFixed(1) : null,
    scores,
    topGenres: Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 8),
    topStudios: Object.entries(studioCounts).sort((a, b) => b[1] - a[1]).slice(0, 6),
    yearTimeline: Object.entries(yearCounts).sort((a, b) => +a[0] - +b[0]),
  };
}

export default function Stats() {
  const { getToken } = useAuth();
  const token = getToken();

  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [details, setDetails] = useState(loadCache);
  const [enrichDone, setEnrichDone] = useState(0);
  const [enrichTotal, setEnrichTotal] = useState(0);
  const [enriching, setEnriching] = useState(false);

  const stats = computeStats(list, details);

  // 1. Carregar lista do usuário
  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/anime/my-list`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setList(data); })
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }, [token]);

  // 2. Enriquecer com dados do Jikan (episódios, gêneros, estúdios, ano)
  useEffect(() => {
    if (loadingList || list.length === 0) return;
    const cache = loadCache();
    const missing = list.filter(a => !cache[a.mal_id]);
    if (missing.length === 0) return;

    setEnriching(true);
    setEnrichDone(0);
    setEnrichTotal(missing.length);
    let cancelled = false;

    (async () => {
      const cur = { ...cache };
      for (let i = 0; i < missing.length; i++) {
        if (cancelled) break;
        try {
          const res = await fetch(`${API}/api/jikan/anime/${missing[i].mal_id}`);
          if (res.ok) {
            const d = await res.json();
            cur[missing[i].mal_id] = d;
            saveCache(cur);
            if (!cancelled) {
              setDetails({ ...cur });
              setEnrichDone(i + 1);
            }
          }
        } catch {}
        if (i < missing.length - 1 && !cancelled) {
          await new Promise(r => setTimeout(r, 400));
        }
      }
      if (!cancelled) setEnriching(false);
    })();

    return () => { cancelled = true; };
  }, [loadingList, list]);

  if (loadingList) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 64 }}>
      <Navbar />
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
        <Spinner />
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (list.length === 0) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 64 }}>
      <Navbar />
      <div style={{ textAlign: 'center', padding: '6rem 1.5rem', color: 'var(--text-mid)' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📊</div>
        <p style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-dark)', marginBottom: 8 }}>
          Sem dados ainda
        </p>
        <p style={{ fontSize: '0.875rem' }}>
          Adicione animes à sua lista para ver as estatísticas.
        </p>
      </div>
    </div>
  );

  const hasEnrichedData = stats.topGenres.length > 0 || stats.topStudios.length > 0 || stats.totalEpisodes > 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 64 }}>
      <Navbar />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 500, color: 'var(--text-dark)', marginBottom: 4 }}>
              Suas Estatísticas
            </h1>
            <p style={{ color: 'var(--text-mid)', fontSize: '0.875rem' }}>
              Sua jornada de animes em números.
            </p>
          </div>
          {enriching && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-light)', paddingBottom: 4 }}>
              <SmallSpinner />
              Calculando detalhes… {enrichDone}/{enrichTotal}
            </div>
          )}
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
          <StatCard icon="🎬" value={stats.total} label="Animes na lista" />
          <StatCard
            icon="▶"
            value={stats.totalEpisodes > 0 ? stats.totalEpisodes.toLocaleString('pt-BR') : (enriching ? '…' : '—')}
            label="Episódios assistidos"
          />
          <StatCard
            icon="⏱"
            value={stats.totalHours > 0 ? stats.totalHours.toLocaleString('pt-BR') : (enriching ? '…' : '—')}
            label="Horas assistidas"
          />
          <StatCard icon="★" value={stats.averageScore ?? '—'} label="Nota média" accent />
        </div>

        {/* Status da lista */}
        <Section title="Status da Lista">
          <StatusBars byStatus={stats.byStatus} total={stats.total} />
        </Section>

        {/* Distribuição de notas */}
        {Object.keys(stats.scores).length > 0 && (
          <Section title="Distribuição de Notas">
            <ScoreBars scores={stats.scores} />
          </Section>
        )}

        {/* Gêneros + Estúdios lado a lado */}
        {(stats.topGenres.length > 0 || stats.topStudios.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
            {stats.topGenres.length > 0 && (
              <SectionCard title="Gêneros Favoritos">
                <HorizontalBars items={stats.topGenres} color="var(--accent-purple)" />
              </SectionCard>
            )}
            {stats.topStudios.length > 0 && (
              <SectionCard title="Estúdios Favoritos">
                <HorizontalBars items={stats.topStudios} color="#7c8fa8" />
              </SectionCard>
            )}
          </div>
        )}

        {/* Timeline por ano */}
        {stats.yearTimeline.length > 1 && (
          <Section title="Animes por Ano de Lançamento">
            <YearChart items={stats.yearTimeline} />
          </Section>
        )}

        {/* Carregando dados de Jikan */}
        {enriching && !hasEnrichedData && (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-light)', fontSize: '0.85rem' }}>
            Buscando dados de episódios, gêneros e estúdios…
          </div>
        )}

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

function SmallSpinner() {
  return (
    <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--accent-purple-light)', borderTopColor: 'var(--accent-purple)', animation: 'spin 0.7s linear infinite' }} />
  );
}

function StatCard({ icon, value, label, accent }) {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)', padding: '1.25rem',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ fontSize: '1.4rem', marginBottom: '0.625rem' }}>{icon}</div>
      <div style={{
        fontSize: '1.8rem', fontWeight: 700, lineHeight: 1,
        color: accent ? '#c4a96b' : 'var(--text-dark)',
        marginBottom: 6,
      }}>{value}</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>{label}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)', padding: '1.25rem 1.5rem',
      boxShadow: 'var(--shadow-sm)', marginBottom: '1.75rem',
    }}>
      <SectionLabel>{title}</SectionLabel>
      {children}
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)', padding: '1.25rem 1.5rem',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <SectionLabel>{title}</SectionLabel>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em',
      textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '1rem',
    }}>
      {children}
    </p>
  );
}

const STATUS_CONFIG = [
  { key: 'watched',       label: 'Assistido',      color: '#9db5a0' },
  { key: 'watching',      label: 'Assistindo',     color: '#7c8fa8' },
  { key: 'plan_to_watch', label: 'Quero assistir', color: '#c4a96b' },
  { key: 'dropped',       label: 'Dropado',        color: '#b88a8a' },
];

function StatusBars({ byStatus, total }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {STATUS_CONFIG.map(({ key, label, color }) => {
        const count = byStatus[key] || 0;
        const pct = total > 0 ? Math.round(count / total * 100) : 0;
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 120, fontSize: '0.82rem', color: 'var(--text-mid)', flexShrink: 0 }}>{label}</div>
            <div style={{ flex: 1, height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-mid)', flexShrink: 0, minWidth: 64, textAlign: 'right' }}>
              {count} <span style={{ color: 'var(--text-light)', fontSize: '0.72rem' }}>({pct}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScoreBars({ scores }) {
  const max = Math.max(...Object.values(scores), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(n => {
        const count = scores[n] || 0;
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{
              width: 22, textAlign: 'right', fontSize: '0.82rem',
              fontWeight: count > 0 ? 600 : 400,
              color: count > 0 ? '#c4a96b' : 'var(--border)', flexShrink: 0,
            }}>{n}</div>
            <div style={{ flex: 1, height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${count / max * 100}%`, height: '100%',
                background: '#c4a96b', borderRadius: 4, opacity: count > 0 ? 1 : 0,
              }} />
            </div>
            <div style={{
              width: 24, textAlign: 'right', fontSize: '0.78rem',
              color: count > 0 ? 'var(--text-mid)' : 'transparent', flexShrink: 0,
            }}>{count}</div>
          </div>
        );
      })}
    </div>
  );
}

function HorizontalBars({ items, color }) {
  const max = items.length > 0 ? items[0][1] : 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {items.map(([name, count]) => (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 96, fontSize: '0.8rem', color: 'var(--text-mid)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0,
          }}>{name}</div>
          <div style={{ flex: 1, height: 7, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${count / max * 100}%`, height: '100%', background: color, borderRadius: 4, opacity: 0.7 }} />
          </div>
          <div style={{ width: 20, textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-light)', flexShrink: 0 }}>{count}</div>
        </div>
      ))}
    </div>
  );
}

function YearChart({ items }) {
  const max = Math.max(...items.map(([, c]) => c), 1);
  const BAR_MAX = 80;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.875rem', paddingBottom: '2rem', overflowX: 'auto' }}>
      {items.map(([year, count]) => {
        const h = Math.max(8, Math.round(count / max * BAR_MAX));
        return (
          <div key={year} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>{count}</span>
            <div style={{
              width: 36, height: h,
              background: 'var(--accent-purple)', borderRadius: '4px 4px 0 0', opacity: 0.6,
            }} />
            <span style={{
              fontSize: '0.65rem', color: 'var(--text-light)',
              writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 30,
            }}>{year}</span>
          </div>
        );
      })}
    </div>
  );
}
