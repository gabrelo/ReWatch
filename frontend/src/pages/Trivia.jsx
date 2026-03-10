import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';

const API = import.meta.env.VITE_API_URL;

const GRADIENTS = [
  ['#6c3fa0', '#9b5de5'],
  ['#1a6b4a', '#2ec27e'],
  ['#8a2c2c', '#d9534f'],
  ['#1a4a7a', '#3a8fd9'],
  ['#7a4a1a', '#d98c3a'],
  ['#4a1a7a', '#9b3ad9'],
];

function charGradient(name) {
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % GRADIENTS.length;
  return GRADIENTS[idx];
}

export default function Trivia() {
  const [question, setQuestion] = useState(null);
  const [loadingQ, setLoadingQ] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [streak, setStreak] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('rewatch_trivia_streak') || '{}');
      return s.count || 0;
    } catch { return 0; }
  });

  const fetchQuestion = useCallback(async () => {
    setLoadingQ(true);
    setError(null);
    setSelected(null);
    setAnswered(false);
    setQuestion(null);
    try {
      const res = await fetch(`${API}/api/jikan/trivia`);
      if (!res.ok) throw new Error('Erro ao carregar');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQuestion(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingQ(false);
    }
  }, []);

  useEffect(() => { fetchQuestion(); }, [fetchQuestion]);

  function handleAnswer(name) {
    if (answered) return;
    setSelected(name);
    setAnswered(true);
    const isCorrect = name === question.correct;
    const newStreak = isCorrect ? streak + 1 : 0;
    setStreak(newStreak);
    localStorage.setItem('rewatch_trivia_streak', JSON.stringify({
      count: newStreak,
      lastDate: new Date().toISOString().slice(0, 10),
    }));
  }

  const isCorrect = answered && selected === question?.correct;

  // Painel placeholder (loading / erro) — mantém a forma do card principal
  const Placeholder = ({ children }) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)',
      height: 420,
    }}>
      {children}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 64 }}>
      <Navbar />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--text-dark)', marginBottom: '0.2rem' }}>Trivia</h1>
            <p style={{ color: 'var(--text-mid)', fontSize: '0.875rem' }}>Teste seus conhecimentos sobre animes.</p>
          </div>
          {streak > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              background: 'rgba(255,120,0,0.1)', color: '#c45000',
              border: '1px solid rgba(255,120,0,0.25)',
              borderRadius: '999px', padding: '5px 14px',
              fontSize: '0.875rem', fontWeight: 700,
            }}>
              🔥 {streak} em sequência
            </span>
          )}
        </div>

        {/* Loading */}
        {loadingQ && (
          <Placeholder>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--accent-purple-light)', borderTopColor: 'var(--accent-purple)', animation: 'spin 0.7s linear infinite' }} />
              <p style={{ color: 'var(--text-light)', fontSize: '0.82rem' }}>Carregando imagens...</p>
            </div>
          </Placeholder>
        )}

        {/* Error */}
        {error && (
          <Placeholder>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-mid)', marginBottom: '1rem', fontSize: '0.9rem' }}>Não foi possível carregar uma pergunta.</p>
              <button
                onClick={fetchQuestion}
                style={{ padding: '0.55rem 1.4rem', borderRadius: 'var(--radius-sm)', background: 'var(--accent-purple)', color: 'white', border: 'none', fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer' }}
              >Tentar novamente</button>
            </div>
          </Placeholder>
        )}

        {/* Main layout */}
        {question && !loadingQ && (
          <div style={{
            display: 'flex',
            alignItems: 'stretch',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden',
          }}>

            {/* ── Painel esquerdo: pergunta ────────────────────── */}
            <div style={{
              width: 230,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              padding: '1.25rem',
              borderRight: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
            }}>
              {/* Anime banner */}
              {question.anime.image && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
                    <img
                      src={question.anime.image}
                      alt={question.anime.title}
                      style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.5rem 0.625rem' }}>
                      <p style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
                        Pergunta sobre
                      </p>
                      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'white', lineHeight: 1.25 }}>
                        {question.anime.title}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ height: 1, background: 'var(--border)', marginBottom: '1rem' }} />

              {/* Pergunta */}
              <p style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-dark)', lineHeight: 1.65, flex: 1 }}>
                {question.question}
              </p>

              {/* Feedback após responder */}
              {answered && (
                <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)', marginTop: '1rem' }}>
                  <p style={{
                    fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.75rem',
                    color: isCorrect ? '#3a6b43' : '#8a3a3a', lineHeight: 1.4,
                  }}>
                    {isCorrect
                      ? '✓ Correto!'
                      : <>✗ Errado.<br /><span style={{ fontWeight: 400 }}>Resposta: </span>{question.correct}</>
                    }
                  </p>
                  <button
                    onClick={fetchQuestion}
                    style={{
                      width: '100%', padding: '0.55rem',
                      borderRadius: 'var(--radius-sm)',
                      background: isCorrect ? 'var(--accent-green)' : 'var(--accent-purple)',
                      color: 'white', border: 'none',
                      fontWeight: 500, fontSize: '0.82rem',
                      cursor: 'pointer', transition: 'var(--transition)',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                  >
                    {isCorrect ? 'Próxima →' : 'Tentar novamente'}
                  </button>
                </div>
              )}
            </div>

            {/* ── Painel direito: grid 2×2 ─────────────────────── */}
            <div style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: '0.75rem',
              padding: '0.75rem',
            }}>
              {question.options.map(opt => {
                const isOptCorrect = answered && opt.name === question.correct;
                const isOptWrong   = answered && opt.name === selected && opt.name !== question.correct;

                let borderColor = 'var(--border)';
                if (isOptCorrect) borderColor = 'var(--accent-green)';
                if (isOptWrong)   borderColor = '#b88a8a';

                return (
                  <button
                    key={opt.name}
                    onClick={() => handleAnswer(opt.name)}
                    disabled={answered}
                    style={{
                      padding: 0,
                      position: 'relative',
                      height: 220,
                      border: `1.5px solid ${borderColor}`,
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      cursor: answered ? 'default' : 'pointer',
                      transition: 'border-color 0.15s',
                      background: 'var(--bg-secondary)',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                    onMouseEnter={e => { if (!answered) e.currentTarget.style.borderColor = 'var(--accent-purple)'; }}
                    onMouseLeave={e => { if (!answered) e.currentTarget.style.borderColor = 'var(--border)'; }}
                  >
                    {/* Imagem de fundo */}
                    {opt.image ? (
                      <img
                        src={opt.image}
                        alt={opt.name}
                        onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                        style={{
                          position: 'absolute', inset: 0,
                          width: '100%', height: '100%',
                          objectFit: 'cover', objectPosition: 'center center',
                        }}
                      />
                    ) : null}
                    {/* Fallback: gradiente + iniciais */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: opt.image ? 'none' : 'flex',
                      flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      background: `linear-gradient(135deg, ${charGradient(opt.name)[0]} 0%, ${charGradient(opt.name)[1]} 100%)`,
                    }}>
                      <span style={{ fontSize: '2rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.02em', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                        {opt.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                      </span>
                    </div>

                    {/* Nome overlay */}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.3) 65%, transparent 100%)',
                      padding: '1.25rem 0.5rem 0.4rem',
                      fontSize: '0.7rem', fontWeight: 600,
                      color: 'white', textAlign: 'center', lineHeight: 1.2,
                    }}>
                      {opt.name}
                    </div>

                    {/* Overlay correto/errado */}
                    {(isOptCorrect || isOptWrong) && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: isOptCorrect ? 'rgba(40,100,50,0.5)' : 'rgba(130,40,40,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: '2rem', fontWeight: 700, color: 'white', textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>
                          {isOptCorrect ? '✓' : '✗'}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
