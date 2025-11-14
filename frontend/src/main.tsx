import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HauntedApp } from './components/HauntedApp';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './hooks/useToast';
import { NetworkStatusIndicator } from './components/NetworkStatusIndicator';
import { configureAmplify } from './config/amplify';
import './index.css';

// Configure AWS Amplify
configureAmplify();

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <HauntedApp />
          <NetworkStatusIndicator />
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
