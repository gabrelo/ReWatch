import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import SeasonModal from './SeasonModal';

const STATUS_LABELS = {
  watched: 'Assistido',
  watching: 'Assistindo',
  plan_to_watch: 'Quero assistir',
  dropped: 'Dropado',
};

// Calcula o status agregado da franquia com base nos status individuais das temporadas
function getAggregateStatus(seasons, userStatuses) {
  const added = seasons.filter(s => userStatuses[s.mal_id]);
  if (added.length === 0) return null;
  const statuses = added.map(s => userStatuses[s.mal_id]);
  if (statuses.every(s => s === 'watched')) return 'watched';
  if (statuses.every(s => s === 'dropped')) return 'dropped';
  if (statuses.every(s => s === 'plan_to_watch')) return 'plan_to_watch';
  return 'watching'; // misto: parcialmente assistido
}

export default function AnimeCard({ franchise, userStatuses, onStatusChange, token, userScores = {}, onScoreChange }) {
  const [hovered, setHovered] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  const aggregateStatus = getAggregateStatus(franchise.seasons, userStatuses);

  // Badge de contagem de temporadas/filmes
  const parts = [];
  if (franchise.season_count > 0) parts.push(`${franchise.season_count} Season${franchise.season_count !== 1 ? 's' : ''}`);
  if (franchise.movie_count > 0) parts.push(`${franchise.movie_count} Film${franchise.movie_count !== 1 ? 's' : ''}`);
  const badgeText = (franchise.season_count + franchise.movie_count + franchise.ova_count) > 1
    ? parts.join(' · ')
    : '';

  return (
    <>
      <div
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
          transform: hovered ? 'translateY(-4px)' : 'none',
          transition: 'var(--transition)',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Imagem — clica para abrir página de detalhes */}
        <div
          style={{ position: 'relative', aspectRatio: '2/3', overflow: 'hidden', cursor: 'pointer' }}
          onClick={() => navigate(`/anime/${franchise.mal_id}`)}
        >
          <img
            src={franchise.cover_image || 'https://via.placeholder.com/225x318?text=No+Image'}
            alt={franchise.title}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transition: 'transform 0.4s ease',
              transform: hovered ? 'scale(1.04)' : 'scale(1)',
            }}
          />

          {/* Overlay "Ver detalhes" ao hover */}
          {hovered && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(45, 55, 72, 0.38)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                background: 'rgba(245,243,239,0.93)',
                color: 'var(--text-dark)',
                borderRadius: '999px',
                padding: '6px 14px',
                fontSize: '0.75rem',
                fontWeight: 500,
                boxShadow: 'var(--shadow-sm)',
              }}>
                Ver detalhes
              </span>
            </div>
          )}

          {/* Status badge — topo esquerdo */}
          {aggregateStatus && (
            <div style={{ position: 'absolute', top: 8, left: 8 }}>
              <StatusBadge status={aggregateStatus} small />
            </div>
          )}

          {/* Score — topo direito */}
          {franchise.score && (
            <div style={{
              position: 'absolute', top: 8, right: 8,
              background: 'rgba(245,243,239,0.92)',
              borderRadius: '999px', padding: '2px 8px',
              fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-dark)',
            }}>
              ★ {franchise.score}
            </div>
          )}

          {/* Badge de seasons — fundo esquerdo, dentro da imagem */}
          {badgeText && (
            <div style={{
              position: 'absolute', bottom: 8, left: 8,
              background: 'rgba(30, 36, 48, 0.72)',
              backdropFilter: 'blur(4px)',
              borderRadius: '999px', padding: '2px 8px',
              fontSize: '0.68rem', fontWeight: 500, color: '#e8e4f0',
              letterSpacing: '0.02em',
            }}>
              {badgeText}
            </div>
          )}
        </div>

        {/* Info — altura fixa para todos os cards ficarem alinhados */}
        <div style={{
          padding: '0.75rem 0.875rem 0.875rem',
          display: 'flex', flexDirection: 'column', gap: '0.6rem',
        }}>
          <p style={{
            fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-dark)',
            lineHeight: 1.3,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            height: '2.6em', // 2 linhas × lineHeight 1.3
          }}>
            {franchise.title}
          </p>

          {/* Botão sempre na mesma posição */}
          {token && (
            <button
              onClick={() => setModalOpen(true)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                border: aggregateStatus ? 'none' : '1px dashed var(--border)',
                background: aggregateStatus ? 'var(--accent-purple-light)' : 'transparent',
                color: aggregateStatus ? 'var(--accent-purple)' : 'var(--text-light)',
                fontSize: '0.78rem', fontWeight: 500,
                cursor: 'pointer', textAlign: 'center',
                transition: 'var(--transition)',
              }}
            >
              {aggregateStatus ? STATUS_LABELS[aggregateStatus] : '+ Adicionar à lista'}
            </button>
          )}
        </div>
      </div>

      {modalOpen && (
        <SeasonModal
          franchise={franchise}
          userStatuses={userStatuses}
          userScores={userScores}
          token={token}
          onStatusChange={onStatusChange}
          onScoreChange={onScoreChange}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
