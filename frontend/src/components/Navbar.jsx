import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      height: '64px',
      background: 'rgba(245, 243, 239, 0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <Logo size="sm" />

      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link to="/home" style={{ color: 'var(--text-mid)', fontSize: '0.9rem', fontWeight: 500, transition: 'var(--transition)' }}
            onMouseEnter={e => e.target.style.color = 'var(--text-dark)'}
            onMouseLeave={e => e.target.style.color = 'var(--text-mid)'}
          >Explorar</Link>

          <Link to="/stats" style={{ color: 'var(--text-mid)', fontSize: '0.9rem', fontWeight: 500, transition: 'var(--transition)' }}
            onMouseEnter={e => e.target.style.color = 'var(--text-dark)'}
            onMouseLeave={e => e.target.style.color = 'var(--text-mid)'}
          >Estatísticas</Link>

          <Link to="/trivia" style={{ color: 'var(--text-mid)', fontSize: '0.9rem', fontWeight: 500, transition: 'var(--transition)' }}
            onMouseEnter={e => e.target.style.color = 'var(--text-dark)'}
            onMouseLeave={e => e.target.style.color = 'var(--text-mid)'}
          >Trivia</Link>

          <Link to="/lists" style={{ color: 'var(--text-mid)', fontSize: '0.9rem', fontWeight: 500, transition: 'var(--transition)' }}
            onMouseEnter={e => e.target.style.color = 'var(--text-dark)'}
            onMouseLeave={e => e.target.style.color = 'var(--text-mid)'}
          >Listas</Link>

          <Link to="/discover" style={{ color: 'var(--text-mid)', fontSize: '0.9rem', fontWeight: 500, transition: 'var(--transition)' }}
            onMouseEnter={e => e.target.style.color = 'var(--text-dark)'}
            onMouseLeave={e => e.target.style.color = 'var(--text-mid)'}
          >Descobrir</Link>

          <Link to="/schedule" style={{ color: 'var(--text-mid)', fontSize: '0.9rem', fontWeight: 500, transition: 'var(--transition)' }}
            onMouseEnter={e => e.target.style.color = 'var(--text-dark)'}
            onMouseLeave={e => e.target.style.color = 'var(--text-mid)'}
          >Calendário</Link>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: '999px',
                padding: '4px 12px 4px 4px',
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${user.id}`}
                alt={user.name}
                referrerPolicy="no-referrer"
                onError={e => { e.currentTarget.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${user.id}`; }}
                style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
              />
              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-dark)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name.split(' ')[0]}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-mid)" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-md)',
                  overflow: 'hidden',
                  minWidth: 160,
                }}
                onMouseLeave={() => setMenuOpen(false)}
              >
                <Link
                  to={user.username ? `/u/${user.username}` : `/profile/${user.id}`}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'block',
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                    color: 'var(--text-dark)',
                    transition: 'var(--transition)',
                  }}
                  onMouseEnter={e => e.target.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={e => e.target.style.background = 'transparent'}
                >
                  Meu perfil
                </Link>
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.875rem',
                    color: '#b88a8a',
                    background: 'none',
                    border: 'none',
                    borderTop: '1px solid var(--border)',
                    transition: 'var(--transition)',
                  }}
                  onMouseEnter={e => e.target.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={e => e.target.style.background = 'transparent'}
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
