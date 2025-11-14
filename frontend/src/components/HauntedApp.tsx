import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { SoulVault } from './SoulVault';
import { Dashboard } from '@/pages/Dashboard';
import { Scanner } from '@/pages/Scanner';
import { Button, Spinner } from './ui';
import Lightning from './Lightning';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const Navigation: React.FC = () => {
  const location = useLocation();
  const { signOut, user } = useAuth();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '🏚️' },
    { path: '/scanner', label: 'Scanner', icon: '👻' },
  ];

  return (
    <nav className="bg-graveyard-gray border-b border-phantom-purple/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <span className="text-2xl">💀</span>
              <span className="text-xl font-bold cursed-title">
                Cursed Code Reviewer
              </span>
            </Link>
            
            <div className="flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium
                    transition-all duration-200
                    ${
                      location.pathname === item.path
                        ? 'bg-phantom-purple text-ghostly-white'
                        : 'text-ghostly-white/70 hover:bg-phantom-purple/20 hover:text-ghostly-white'
                    }
                  `}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user && (
              <div className="text-sm text-ghostly-white/70">
                <span className="text-ghostly-white">{user.email}</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
            >
              Sign Out 🚪
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, loading, user } = useAuth();

  // Force re-render when authentication state changes
  React.useEffect(() => {
    // This effect will run whenever isAuthenticated changes
  }, [isAuthenticated, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cursed-black flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-ghostly-white text-lg font-creepster animate-pulse">
            Awakening the spirits...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SoulVault key="soul-vault" />;
  }

  return (
    <div className="min-h-screen bg-cursed-black relative">
      <div className="fixed inset-0 z-0">
        <Lightning 
          hue={280}
          xOffset={0}
          speed={0.5}
          intensity={2}
          size={3}
        />
      </div>
      <div className="relative z-10">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/scanner" element={<Scanner />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const HauntedApp: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
};
