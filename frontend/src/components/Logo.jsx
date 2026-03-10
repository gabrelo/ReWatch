import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Logo({ size = 'md', tagline = false }) {
  const { user } = useAuth();
  const sizes = {
    sm: { font: '1.4rem', w: '1.6rem', tag: '0.65rem' },
    md: { font: '2rem', w: '2.2rem', tag: '0.8rem' },
    lg: { font: '3.5rem', w: '4rem', tag: '1rem' },
    xl: { font: '5rem', w: '5.8rem', tag: '1.2rem' },
  };
  const s = sizes[size];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <Link to={user ? '/home' : '/'} style={{ display: 'flex', alignItems: 'baseline', gap: 0, lineHeight: 1 }}>
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 300,
          fontSize: s.font,
          color: 'var(--text-dark)',
          letterSpacing: '-0.02em',
        }}>Re</span>
        <span style={{
          fontFamily: "'Cinzel Decorative', serif",
          fontWeight: 700,
          fontSize: s.w,
          color: 'var(--accent-purple)',
          letterSpacing: '-0.01em',
          display: 'inline-block',
          transform: 'translateY(0.04em)',
        }}>W</span>
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 300,
          fontSize: s.font,
          color: 'var(--text-dark)',
          letterSpacing: '-0.02em',
        }}>atch</span>
      </Link>
      {tagline && (
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 300,
          fontSize: s.tag,
          color: 'var(--text-mid)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}>your anime journey</span>
      )}
    </div>
  );
}
