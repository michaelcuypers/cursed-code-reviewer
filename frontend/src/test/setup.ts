// Test setup file
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
vi.stubEnv('VITE_COGNITO_USER_POOL_ID', 'us-east-1_TEST123');
vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id');
vi.stubEnv('VITE_COGNITO_IDENTITY_POOL_ID', 'us-east-1:test-identity-pool');
