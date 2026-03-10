import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API = import.meta.env.VITE_API_URL;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('rewatch_token');
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error('auth'); return r.json(); })
      .then(data => {
        if (data.id) setUser(data);
        else localStorage.removeItem('rewatch_token');
      })
      .catch(() => localStorage.removeItem('rewatch_token'))
      .finally(() => setLoading(false));
  }, []);

  function login(token) {
    localStorage.setItem('rewatch_token', token);
    fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error('auth'); return r.json(); })
      .then(data => { if (data.id) setUser(data); })
      .catch(() => {});
  }

  function logout() {
    localStorage.removeItem('rewatch_token');
    setUser(null);
  }

  function getToken() {
    return localStorage.getItem('rewatch_token');
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
