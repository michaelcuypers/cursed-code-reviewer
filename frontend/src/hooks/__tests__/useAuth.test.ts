// Tests for useAuth hook - Cognito integration flows, token validation, and error handling

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuth } from '../useAuth';
import * as amplifyAuth from 'aws-amplify/auth';

// Mock AWS Amplify auth functions
vi.mock('aws-amplify/auth', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  confirmSignUp: vi.fn(),
  resetPassword: vi.fn(),
  confirmResetPassword: vi.fn(),
  getCurrentUser: vi.fn(),
  fetchAuthSession: vi.fn(),
}));

describe('useAuth - Cognito Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with unauthenticated state', async () => {
    vi.mocked(amplifyAuth.getCurrentUser).mockRejectedValue(new Error('Not authenticated'));
    
    const { result } = renderHook(() => useAuth());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });

  it('should authenticate user on successful sign in', async () => {
    const mockUser = {
      userId: 'soul-123',
      signInDetails: { loginId: 'test@darkness.com' },
    };
    
    const mockSession = {
      tokens: {
        accessToken: {
          toString: () => 'mock-access-token',
          payload: { exp: Math.floor(Date.now() / 1000) + 3600 },
        },
        idToken: {
          toString: () => 'mock-id-token',
          payload: {
            'custom:curseLevel': 5,
            'custom:totalScans': 10,
          },
        },
        refreshToken: {
          toString: () => 'mock-refresh-token',
        },
      },
    };

    vi.mocked(amplifyAuth.signIn).mockResolvedValue({ isSignedIn: true } as any);
    vi.mocked(amplifyAuth.getCurrentUser).mockResolvedValue(mockUser as any);
    vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValue(mockSession as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn('test@darkness.com', 'CursedPass123!');
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(result.current.user).toEqual({
      soulId: 'soul-123',
      email: 'test@darkness.com',
      curseLevel: 5,
      totalScans: 10,
    });
    expect(result.current.token?.accessToken).toBe('mock-access-token');
  });

  it('should handle invalid credentials error', async () => {
    const error = new Error('Incorrect username or password');
    vi.mocked(amplifyAuth.signIn).mockRejectedValue(error);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let thrownError: unknown = null;
    await act(async () => {
      try {
        await result.current.signIn('test@darkness.com', 'wrongpass');
      } catch (e) {
        thrownError = e;
      }
    });

    expect(thrownError).not.toBeNull();
    expect((thrownError as Error).message).toMatch(/spirits reject your credentials/);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should handle user not confirmed error', async () => {
    const error = new Error('User is not confirmed');
    vi.mocked(amplifyAuth.signIn).mockRejectedValue(error);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let thrownError: unknown = null;
    await act(async () => {
      try {
        await result.current.signIn('test@darkness.com', 'password');
      } catch (e) {
        thrownError = e;
      }
    });

    expect(thrownError).not.toBeNull();
    expect((thrownError as Error).message).toMatch(/awaits verification/);
  });

  it('should refresh token before expiration', async () => {
    const mockUser = {
      userId: 'soul-123',
      signInDetails: { loginId: 'test@darkness.com' },
    };

    const expiresIn = 10; // 10 seconds from now
    const mockSession = {
      tokens: {
        accessToken: {
          toString: () => 'mock-access-token',
          payload: { exp: Math.floor(Date.now() / 1000) + expiresIn },
        },
        idToken: {
          toString: () => 'mock-id-token',
          payload: {},
        },
        refreshToken: {
          toString: () => 'mock-refresh-token',
        },
      },
    };

    const refreshedSession = {
      tokens: {
        accessToken: {
          toString: () => 'new-access-token',
          payload: { exp: Math.floor(Date.now() / 1000) + 3600 },
        },
        idToken: {
          toString: () => 'new-id-token',
          payload: {},
        },
        refreshToken: {
          toString: () => 'new-refresh-token',
        },
      },
    };

    vi.mocked(amplifyAuth.getCurrentUser).mockResolvedValue(mockUser as any);
    vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValue(mockSession as any);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    // Mock the refreshed session for the next call
    vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValue(refreshedSession as any);

    // Manually trigger refresh
    await act(async () => {
      await result.current.refreshToken();
    });

    await waitFor(() => {
      expect(result.current.token?.accessToken).toBe('new-access-token');
    });

    expect(amplifyAuth.fetchAuthSession).toHaveBeenCalledWith({ forceRefresh: true });
  });

  it('should sign out user and clear state', async () => {
    const mockUser = {
      userId: 'soul-123',
      signInDetails: { loginId: 'test@darkness.com' },
    };

    const mockSession = {
      tokens: {
        accessToken: {
          toString: () => 'mock-access-token',
          payload: { exp: Math.floor(Date.now() / 1000) + 3600 },
        },
        idToken: {
          toString: () => 'mock-id-token',
          payload: {},
        },
        refreshToken: {
          toString: () => 'mock-refresh-token',
        },
      },
    };

    vi.mocked(amplifyAuth.getCurrentUser).mockResolvedValue(mockUser as any);
    vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValue(mockSession as any);
    vi.mocked(amplifyAuth.signOut).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });

  it('should handle sign up flow', async () => {
    vi.mocked(amplifyAuth.signUp).mockResolvedValue({
      isSignUpComplete: false,
      nextStep: { signUpStep: 'CONFIRM_SIGN_UP' },
    } as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.signUp('new@darkness.com', 'CursedPass123!');
      } catch (e) {
        // Expected to throw with verification message
      }
    });

    expect(amplifyAuth.signUp).toHaveBeenCalledWith({
      username: 'new@darkness.com',
      password: 'CursedPass123!',
      options: {
        userAttributes: {
          email: 'new@darkness.com',
        },
      },
    });
  });

  it('should confirm sign up with verification code', async () => {
    vi.mocked(amplifyAuth.confirmSignUp).mockResolvedValue({
      isSignUpComplete: true,
      nextStep: { signUpStep: 'DONE' },
    } as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.confirmSignUp('test@darkness.com', '123456');
    });

    expect(amplifyAuth.confirmSignUp).toHaveBeenCalledWith({
      username: 'test@darkness.com',
      confirmationCode: '123456',
    });
  });

  it('should handle password reset flow', async () => {
    vi.mocked(amplifyAuth.resetPassword).mockResolvedValue({
      isPasswordReset: false,
      nextStep: { resetPasswordStep: 'CONFIRM_RESET_PASSWORD_WITH_CODE' },
    } as any);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.resetPassword('test@darkness.com');
    });

    expect(amplifyAuth.resetPassword).toHaveBeenCalledWith({
      username: 'test@darkness.com',
    });
  });

  it('should confirm password reset', async () => {
    vi.mocked(amplifyAuth.confirmResetPassword).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.confirmResetPassword('test@darkness.com', '123456', 'NewPass123!');
    });

    expect(amplifyAuth.confirmResetPassword).toHaveBeenCalledWith({
      username: 'test@darkness.com',
      confirmationCode: '123456',
      newPassword: 'NewPass123!',
    });
  });
});
