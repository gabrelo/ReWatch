import { useEffect, useRef, useState } from 'react';
import Logo from '../components/Logo';

// MAL IDs dos animes de preview
const PREVIEW_MAL_IDS = [
  { id: 52991,  title: 'Frieren' },
  { id: 269,    title: 'Bleach' },
  { id: 40748,  title: 'Jujutsu Kaisen' },
  { id: 38000,  title: 'Demon Slayer' },
  { id: 527,    title: 'Pokemon' },
  { id: 813,    title: 'Dragon Ball Z' },
  { id: 51009,  title: "Hell's Paradise" },
  { id: 57058,  title: 'Gachiakuta' },
];

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function Landing() {
  const floatRef = useRef(null);
  const [previewAnimes, setPreviewAnimes] = useState(
    PREVIEW_MAL_IDS.map(a => ({ ...a, img: null }))
  );

  useEffect(() => {
    async function fetchImages() {
      const results = await Promise.allSettled(
        PREVIEW_MAL_IDS.map(a =>
          fetch(`https://api.jikan.moe/v4/anime/${a.id}`)
            .then(r => { if (!r.ok) throw new Error('jikan'); return r.json(); })
            .then(d => ({ id: a.id, title: a.title, img: d.data?.images?.jpg?.large_image_url || d.data?.images?.jpg?.image_url || null }))
        )
      );
      setPreviewAnimes(results.map((r, i) =>
        r.status === 'fulfilled' ? r.value : { ...PREVIEW_MAL_IDS[i], img: null }
      ));
    }
    fetchImages();
  }, []);

  useEffect(() => {
    const el = floatRef.current;
    if (!el) return;
    let pos = 0;
    const id = setInterval(() => {
      pos += 0.3;
      el.style.transform = `translateY(${Math.sin(pos * 0.05) * 8}px)`;
    }, 30);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f3ef 0%, #ede9e4 40%, #e8e2f0 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      padding: '2rem',
    }}>
      {/* Background decorativo */}
      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        {/* Orbs decorativos */}
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(184,169,201,0.25) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-5%', right: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(157,181,160,0.2) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', top: '40%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,143,168,0.15) 0%, transparent 70%)' }} />

        {/* Preview cards ao fundo */}
        <div ref={floatRef} style={{
          position: 'absolute',
          right: '-2%',
          top: '5%',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 100px)',
          gap: 10,
          opacity: 0.18,
          transform: 'rotate(8deg)',
          filter: 'blur(1px)',
        }}>
          {previewAnimes.map(a => (
            <div key={a.id} style={{ borderRadius: 10, overflow: 'hidden', aspectRatio: '2/3', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', background: 'rgba(0,0,0,0.2)' }}>
              {a.img && <img src={a.img} alt={a.title} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Conteúdo central */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2.5rem',
        textAlign: 'center',
        maxWidth: 500,
      }}>
        <Logo size="xl" tagline />

        <p style={{
          color: 'var(--text-mid)',
          fontSize: '1rem',
          fontWeight: 300,
          lineHeight: 1.7,
          maxWidth: 360,
        }}>
          Seu portfólio de animes. Registre o que você assistiu, está assistindo e quer assistir — e compartilhe sua jornada.
        </p>

        <a
          href={`${import.meta.env.VITE_API_URL}/api/auth/google`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.9rem 2rem',
            borderRadius: '999px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            color: 'var(--text-dark)',
            fontWeight: 500,
            fontSize: '0.95rem',
            textDecoration: 'none',
            transition: 'var(--transition)',
            cursor: 'pointer',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            e.currentTarget.style.transform = 'none';
          }}
        >
          <GoogleIcon />
          Entrar com Google
        </a>

        <p style={{ color: 'var(--text-light)', fontSize: '0.78rem' }}>
          Sua conta Google. Nenhuma senha extra.
        </p>
      </div>

      {/* Linha decorativa inferior */}
      <div style={{
        position: 'absolute',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        opacity: 0.4,
      }}>
        <div style={{ width: 32, height: 1, background: 'var(--accent-purple)' }} />
        <span style={{ fontSize: '0.7rem', color: 'var(--accent-purple)', letterSpacing: '0.1em' }}>ReWatch</span>
        <div style={{ width: 32, height: 1, background: 'var(--accent-purple)' }} />
      </div>
    </div>
  );
}
