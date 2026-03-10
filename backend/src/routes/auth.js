const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('../database');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, (accessToken, refreshToken, profile, done) => {
  const googleId = profile.id;
  const email = profile.emails[0].value;
  const name = profile.displayName;
  const avatar = profile.photos[0]?.value || null;

  let user = db.findUserByGoogleId(googleId);
  if (!user) {
    user = db.createUser({ google_id: googleId, email, name, avatar });
  } else {
    user = db.updateUser(googleId, { name, avatar });
  }

  return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => done(null, db.findUserById(id)));

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}?error=auth_failed`,
  }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email, name: req.user.name, avatar: req.user.avatar },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback#token=${token}`);
  }
);

router.get('/me', authMiddleware, (req, res) => {
  const user = db.findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  const { google_id, ...safeUser } = user;
  res.json(safeUser);
});

router.put('/profile', authMiddleware, (req, res) => {
  const { bio, cover_type, cover_value, pinned_mal_ids, username } = req.body;

  if (cover_type === 'custom' && cover_value && cover_value.length > 3_000_000) {
    return res.status(400).json({ error: 'Imagem muito grande. Máximo ~2MB.' });
  }

  let validatedUsername = undefined;
  if (username !== undefined) {
    const lower = username.toLowerCase().trim();
    if (!/^[a-z0-9_]{3,20}$/.test(lower)) {
      return res.status(400).json({ error: 'Username inválido. Use 3–20 caracteres: letras, números ou _' });
    }
    const existing = db.findUserByUsername(lower);
    if (existing && existing.id !== req.user.id) {
      return res.status(400).json({ error: 'Este username já está em uso.' });
    }
    validatedUsername = lower;
  }

  const user = db.updateProfile(req.user.id, {
    bio: typeof bio === 'string' ? bio.slice(0, 300) : undefined,
    cover_type,
    cover_value,
    pinned_mal_ids: Array.isArray(pinned_mal_ids)
      ? pinned_mal_ids.slice(0, 5).map(Number).filter(id => Number.isInteger(id) && id > 0)
      : undefined,
    username: validatedUsername,
  });

  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  const { google_id, ...safeUser } = user;
  res.json(safeUser);
});

module.exports = router;
