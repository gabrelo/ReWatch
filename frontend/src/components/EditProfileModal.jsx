import { useState, useRef } from 'react';

export const COVER_TEMPLATES = [
  { id: 'frieren',  label: 'Frieren',        gradient: 'linear-gradient(135deg, #c8d8e8 0%, #b8a9c9 45%, #d4cce3 100%)' },
  { id: 'aurora',   label: 'Aurora',          gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'sakura',   label: 'Sakura',          gradient: 'linear-gradient(135deg, #fce4ec 0%, #f48fb1 50%, #ad1457 100%)' },
  { id: 'forest',   label: 'Floresta',        gradient: 'linear-gradient(135deg, #1b4332 0%, #52b788 60%, #b7e4c7 100%)' },
  { id: 'ocean',    label: 'Oceano',          gradient: 'linear-gradient(135deg, #023e8a 0%, #0096c7 50%, #90e0ef 100%)' },
  { id: 'sunset',   label: 'Pôr do sol',      gradient: 'linear-gradient(135deg, #f7971e 0%, #ffd200 40%, #ff6b6b 100%)' },
  { id: 'night',    label: 'Noite Estrelada', gradient: 'linear-gradient(135deg, #0d0221 0%, #1a0545 50%, #3d0066 100%)' },
  { id: 'mint',     label: 'Menta',           gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
  { id: 'crimson',  label: 'Rubi',            gradient: 'linear-gradient(135deg, #2d0034 0%, #8b0000 55%, #c0392b 100%)' },
  { id: 'gold',     label: 'Dourado',         gradient: 'linear-gradient(135deg, #7b4f12 0%, #c8860a 45%, #ffd700 100%)' },
];

export function getCoverStyle(user) {
  if (user?.cover_type === 'custom' && user?.cover_value) {
    return { backgroundImage: `url(${user.cover_value})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  }
  const tpl = COVER_TEMPLATES.find(t => t.id === (user?.cover_value || 'frieren')) || COVER_TEMPLATES[0];
  return { background: tpl.gradient };
}

export default function EditProfileModal({ user, onSave, onClose }) {
  const [bio, setBio] = useState(user.bio || '');
  const [coverType, setCoverType] = useState(user.cover_type || 'template');
  const [coverValue, setCoverValue] = useState(user.cover_value || 'frieren');
  const [username, setUsername] = useState(user.username || '');
  const [usernameError, setUsernameError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef();

  function handleUsernameChange(val) {
    setUsername(val);
    const lower = val.toLowerCase().trim();
    if (lower && !/^[a-z0-9_]{3,20}$/.test(lower)) {
      setUsernameError('Use 3–20 caracteres: letras, números ou _');
    } else {
      setUsernameError('');
    }
  }

  const previewStyle = coverType === 'custom' && coverValue
    ? { backgroundImage: `url(${coverValue})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: (COVER_TEMPLATES.find(t => t.id === coverValue) || COVER_TEMPLATES[0]).gradient };

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError('');

    if (!file.type.startsWith('image/')) {
      setUploadError('Selecione uma imagem (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Imagem muito grande. Máximo 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setCoverType('custom');
      setCoverValue(ev.target.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (usernameError) return;
    setSaving(true);
    const payload = { bio, cover_type: coverType, cover_value: coverValue };
    if (username.trim()) payload.username = username.toLowerCase().trim();
    const serverError = await onSave(payload);
    if (serverError) setUsernameError(serverError);
    setSaving(false);
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(45, 55, 72, 0.5)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        width: '100%', maxWidth: 540,
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          flexShrink: 0,
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-dark)' }}>Editar perfil</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', lineHeight: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '1.5rem' }}>
          {/* Preview da capa */}
          <div style={{
            ...previewStyle,
            height: 120, borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            position: 'relative',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)',
              padding: '0.5rem 0.75rem',
            }}>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.72rem', letterSpacing: '0.08em' }}>PRÉVIA DA CAPA</p>
            </div>
          </div>

          {/* Templates */}
          <p style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-light)', marginBottom: '0.75rem' }}>
            TEMPLATES
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
            {COVER_TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                title={tpl.label}
                onClick={() => { setCoverType('template'); setCoverValue(tpl.id); }}
                style={{
                  height: 48,
                  borderRadius: 'var(--radius-sm)',
                  background: tpl.gradient,
                  border: (coverType === 'template' && coverValue === tpl.id)
                    ? '2px solid var(--accent-purple)'
                    : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  boxShadow: (coverType === 'template' && coverValue === tpl.id) ? '0 0 0 3px var(--accent-purple-light)' : 'none',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {coverType === 'template' && coverValue === tpl.id && (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.2)',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {COVER_TEMPLATES.map(tpl => (
              <p key={tpl.id} style={{
                fontSize: '0.6rem', textAlign: 'center', color: 'var(--text-light)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {tpl.label}
              </p>
            ))}
          </div>

          {/* Upload personalizado */}
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-light)', marginBottom: '0.75rem' }}>
              OU ENVIE UMA IMAGEM DO SEU PC
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current.click()}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                border: coverType === 'custom' ? '1px solid var(--accent-purple)' : '1px solid var(--border)',
                background: coverType === 'custom' ? 'var(--accent-purple-light)' : 'var(--bg-secondary)',
                color: coverType === 'custom' ? 'var(--accent-purple)' : 'var(--text-mid)',
                fontSize: '0.82rem', fontWeight: 500,
                cursor: 'pointer', transition: 'var(--transition)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              {coverType === 'custom' ? 'Imagem carregada ✓' : 'Escolher arquivo'}
            </button>
            {uploadError && <p style={{ fontSize: '0.75rem', color: '#b88a8a', marginTop: 6 }}>{uploadError}</p>}
            {coverType === 'custom' && (
              <button
                onClick={() => { setCoverType('template'); setCoverValue('frieren'); }}
                style={{ marginLeft: 10, fontSize: '0.75rem', color: 'var(--text-light)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Voltar aos templates
              </button>
            )}
          </div>

          {/* Username */}
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-light)', marginBottom: '0.75rem' }}>
              USERNAME PÚBLICO
            </p>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-light)', fontSize: '0.875rem', pointerEvents: 'none',
              }}>@</span>
              <input
                value={username}
                onChange={e => handleUsernameChange(e.target.value)}
                placeholder="seunome"
                maxLength={20}
                style={{
                  width: '100%', padding: '0.65rem 0.875rem 0.65rem 1.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${usernameError ? '#b88a8a' : 'var(--border)'}`,
                  background: 'var(--bg-secondary)',
                  fontSize: '0.875rem', color: 'var(--text-dark)',
                  fontFamily: 'DM Sans, sans-serif',
                  outline: 'none', transition: 'var(--transition)',
                }}
                onFocus={e => e.target.style.borderColor = usernameError ? '#b88a8a' : 'var(--accent-purple-light)'}
                onBlur={e => e.target.style.borderColor = usernameError ? '#b88a8a' : 'var(--border)'}
              />
            </div>
            {usernameError
              ? <p style={{ fontSize: '0.7rem', color: '#b88a8a', marginTop: 4 }}>{usernameError}</p>
              : <p style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: 4 }}>
                  Permite compartilhar seu perfil como <strong>rewatch.app/u/{username || 'seunome'}</strong>
                </p>
            }
          </div>

          {/* Bio */}
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-light)', marginBottom: '0.75rem' }}>
              BIO
            </p>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Fale um pouco sobre você e seus animes favoritos..."
              style={{
                width: '100%', padding: '0.65rem 0.875rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                fontSize: '0.875rem', color: 'var(--text-dark)',
                fontFamily: 'DM Sans, sans-serif',
                resize: 'none', outline: 'none',
                transition: 'var(--transition)',
                lineHeight: 1.6,
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent-purple-light)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <p style={{ fontSize: '0.7rem', color: 'var(--text-light)', textAlign: 'right', marginTop: 4 }}>
              {bio.length}/300
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          display: 'flex', gap: '0.75rem', justifyContent: 'flex-end',
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px', borderRadius: '999px',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-mid)', fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !!usernameError}
            style={{
              padding: '8px 24px', borderRadius: '999px',
              border: 'none',
              background: (saving || usernameError) ? 'var(--accent-purple-light)' : 'var(--accent-purple)',
              color: 'white', fontSize: '0.875rem', fontWeight: 500,
              cursor: (saving || usernameError) ? 'default' : 'pointer',
              transition: 'var(--transition)',
            }}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
