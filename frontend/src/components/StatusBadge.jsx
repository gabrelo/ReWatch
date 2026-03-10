const STATUS_CONFIG = {
  watched: { label: 'Assistido', color: '#9db5a0', bg: '#edf4ef' },
  watching: { label: 'Assistindo', color: '#7c8fa8', bg: '#edf1f6' },
  plan_to_watch: { label: 'Quero assistir', color: '#c4a96b', bg: '#f6f1e8' },
  dropped: { label: 'Dropado', color: '#b88a8a', bg: '#f6ecec' },
};

export default function StatusBadge({ status, small = false }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  return (
    <span style={{
      display: 'inline-block',
      padding: small ? '2px 8px' : '4px 10px',
      borderRadius: '999px',
      background: cfg.bg,
      color: cfg.color,
      fontSize: small ? '0.68rem' : '0.75rem',
      fontWeight: 500,
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

export { STATUS_CONFIG };
