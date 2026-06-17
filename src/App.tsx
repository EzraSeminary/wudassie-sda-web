import React, { useEffect, useState } from 'react';
import MusicDashboard from './components/MusicDashboard';
import LoginPage from './components/LoginPage';
import PublicLandingPage from './components/PublicLandingPage';
import ToastProvider from './components/ui/Toaster';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { hymnalService } from './services/hymnalService';

const AppContent: React.FC = () => {
  const { user, token, loading } = useAuth();
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  // Keep hymnalService token in sync
  useEffect(() => {
    hymnalService.setToken(token);
  }, [token]);

  if (loading) {
    return (
      <div className="admin-surface min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-purple-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-gray-500 text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    if (showAdminLogin) {
      return <LoginPage onBack={() => setShowAdminLogin(false)} />;
    }

    return <PublicLandingPage onAdminLogin={() => setShowAdminLogin(true)} />;
  }

  return (
    <div className="admin-surface min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <MusicDashboard />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
