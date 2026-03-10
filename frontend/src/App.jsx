import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Profile from './pages/Profile';
import AuthCallback from './pages/AuthCallback';
import Stats from './pages/Stats';
import AnimeDetail from './pages/AnimeDetail';
import Trivia from './pages/Trivia';
import Lists from './pages/Lists';
import ListDetail from './pages/ListDetail';
import Discover from './pages/Discover';
import Schedule from './pages/Schedule';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-mid)' }}>Carregando...</div>;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/home" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/profile/:id" element={<Profile />} />
      <Route path="/u/:username" element={<Profile />} />
      <Route path="/stats" element={<ProtectedRoute><Stats /></ProtectedRoute>} />
      <Route path="/anime/:id" element={<AnimeDetail />} />
      <Route path="/trivia" element={<ProtectedRoute><Trivia /></ProtectedRoute>} />
      <Route path="/lists" element={<ProtectedRoute><Lists /></ProtectedRoute>} />
      <Route path="/lists/:id" element={<ListDetail />} />
      <Route path="/discover" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
      <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
