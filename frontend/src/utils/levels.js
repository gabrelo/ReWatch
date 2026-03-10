export const LEVELS = [
  { min: 1,    name: 'Curioso(a)',                emoji: '🌱', tier: 'green'  },
  { min: 5,    name: 'Explorador(a) de Animes',  emoji: '🗺️',  tier: 'green'  },
  { min: 10,   name: 'Otaku Iniciante',           emoji: '✨',  tier: 'green'  },
  { min: 25,   name: 'Maratonista',               emoji: '🏃',  tier: 'yellow' },
  { min: 50,   name: 'Senpai',                    emoji: '⭐',  tier: 'yellow' },
  { min: 75,   name: 'Otaku Veterano',            emoji: '🌟',  tier: 'yellow' },
  { min: 100,  name: 'Otaku Lendário',            emoji: '💫',  tier: 'yellow' },
  { min: 150,  name: 'Guardião de Arcos',         emoji: '🛡️',  tier: 'orange' },
  { min: 200,  name: 'Mestre das Temporadas',     emoji: '🎭',  tier: 'orange' },
  { min: 300,  name: 'Entidade Interdimensional', emoji: '🌀',  tier: 'orange' },
  { min: 400,  name: 'Guardião do Multiverso',    emoji: '⚡',  tier: 'orange' },
  { min: 500,  name: 'ReWatcher Eterno',          emoji: '♾️',  tier: 'red'    },
  { min: 750,  name: 'Grão-Mestre dos Animes',    emoji: '👑',  tier: 'red'    },
  { min: 1000, name: 'Arquivo Vivo',              emoji: '📚',  tier: 'red'    },
  { min: 1500, name: 'A Lenda Viva do ReWatch',   emoji: '🌌',  tier: 'legend' },
];

export const TIER_COLORS = {
  green:  { text: '#2d6e4e', bg: 'rgba(157,181,160,0.18)', bar: '#9db5a0', glow: 'rgba(157,181,160,0.35)' },
  yellow: { text: '#7a5a10', bg: 'rgba(196,169,107,0.18)', bar: '#c4a96b', glow: 'rgba(196,169,107,0.35)' },
  orange: { text: '#8a3e10', bg: 'rgba(212,135,90,0.18)',  bar: '#d4875a', glow: 'rgba(212,135,90,0.35)'  },
  red:    { text: '#8a2a2a', bg: 'rgba(184,138,138,0.18)', bar: '#b88a8a', glow: 'rgba(184,138,138,0.35)' },
  legend: { text: '#5a4a8a', bg: 'rgba(184,169,201,0.22)', bar: '#b8a9c9', glow: 'rgba(184,169,201,0.45)' },
};

/**
 * Retorna informações de level baseado no número de animes assistidos.
 * @param {number} watchedCount
 * @returns {{ current, next, progress, levelIndex } | null}
 */
export function getLevel(watchedCount) {
  if (watchedCount < 1) return null;

  let currentIndex = -1;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (watchedCount >= LEVELS[i].min) {
      currentIndex = i;
      break;
    }
  }

  if (currentIndex === -1) return null;

  const current = LEVELS[currentIndex];
  const next = LEVELS[currentIndex + 1] || null;

  const progress = next
    ? Math.min(100, ((watchedCount - current.min) / (next.min - current.min)) * 100)
    : 100;

  return { current, next, progress, levelIndex: currentIndex };
}
