// Custom hook for authentication management

import { useReducer, useEffect } from 'react';
import {
  signIn,
  signUp,
  signOut,
  confirmSignUp,
  resetPassword,
  confirmResetPassword,
  getCurrentUser,
  fetchAuthSession,
  type SignInInput,
  type SignUpInput,
  type ConfirmSignUpInput,
  type ResetPasswordInput,
  type ConfirmResetPasswordInput,
} from 'aws-amplify/auth';
import type { AuthState, AuthAction, SoulUser, SoulToken } from '@/types/auth';

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: true,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, loading: true, error: null };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...initialState,
        loading: false,
      };
    case 'TOKEN_REFRESH':
      return {
        ...state,
        token: action.payload,
      };
    default:
      return state;
  }
}

export const useAuth = () => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing session on mount
  useEffect(() => {
    checkAuthSession();
  }, []);

  // Auto-refresh token before expiration
  useEffect(() => {
    if (state.token && state.isAuthenticated) {
      const timeUntilExpiry = state.token.expiresAt - Date.now();
      const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 0); // Refresh 5 min before expiry

      const timer = setTimeout(() => {
        refreshAuthToken();
      }, refreshTime);

      return () => clearTimeout(timer);
    }
  }, [state.token, state.isAuthenticated]);

  const checkAuthSession = async () => {
    try {
      dispatch({ type: 'AUTH_START' });
      const user = await getCurrentUser();
      const session = await fetchAuthSession();

      if (session.tokens) {
        const soulUser: SoulUser = {
          soulId: user.userId,
          email: user.signInDetails?.loginId || '',
          curseLevel: session.tokens.idToken?.payload['custom:curseLevel'] as number | undefined,
          totalScans: session.tokens.idToken?.payload['custom:totalScans'] as number | undefined,
        };

        const soulToken: SoulToken = {
          accessToken: session.tokens.accessToken.toString(),
          idToken: session.tokens.idToken?.toString() || '',
          refreshToken: '',
          expiresAt: (session.tokens.accessToken.payload.exp || 0) * 1000,
        };

        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user: soulUser, token: soulToken },
        });
      } else {
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    } catch (error) {
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  const refreshAuthToken = async () => {
    try {
      const session = await fetchAuthSession({ forceRefresh: true });
      
      if (session.tokens) {
        const soulToken: SoulToken = {
          accessToken: session.tokens.accessToken.toString(),
          idToken: session.tokens.idToken?.toString() || '',
          refreshToken: '',
          expiresAt: (session.tokens.accessToken.payload.exp || 0) * 1000,
        };

        dispatch({ type: 'TOKEN_REFRESH', payload: soulToken });
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      await handleSignOut();
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const input: SignInInput = {
        username: email,
        password,
      };

      await signIn(input);
      await checkAuthSession();
    } catch (error: any) {
      const demonicMessage = getDemonicErrorMessage(error.message || 'Sign in failed');
      dispatch({ type: 'AUTH_FAILURE', payload: demonicMessage });
      throw new Error(demonicMessage);
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const input: SignUpInput = {
        username: email,
        password,
        options: {
          userAttributes: {
            email,
          },
        },
      };

      await signUp(input);
      dispatch({ type: 'AUTH_FAILURE', payload: 'Verification code sent to your cursed inbox' });
    } catch (error: any) {
      const demonicMessage = getDemonicErrorMessage(error.message || 'Sign up failed');
      dispatch({ type: 'AUTH_FAILURE', payload: demonicMessage });
      throw new Error(demonicMessage);
    }
  };

  const handleConfirmSignUp = async (email: string, code: string) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const input: ConfirmSignUpInput = {
        username: email,
        confirmationCode: code,
      };

      await confirmSignUp(input);
      dispatch({ type: 'AUTH_LOGOUT' });
    } catch (error: any) {
      const demonicMessage = getDemonicErrorMessage(error.message || 'Verification failed');
      dispatch({ type: 'AUTH_FAILURE', payload: demonicMessage });
      throw new Error(demonicMessage);
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      const input: ResetPasswordInput = {
        username: email,
      };

      await resetPassword(input);
    } catch (error: any) {
      const demonicMessage = getDemonicErrorMessage(error.message || 'Password reset failed');
      throw new Error(demonicMessage);
    }
  };

  const handleConfirmResetPassword = async (
    email: string,
    code: string,
    newPassword: string
  ) => {
    try {
      const input: ConfirmResetPasswordInput = {
        username: email,
        confirmationCode: code,
        newPassword,
      };

      await confirmResetPassword(input);
    } catch (error: any) {
      const demonicMessage = getDemonicErrorMessage(error.message || 'Password reset confirmation failed');
      throw new Error(demonicMessage);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      dispatch({ type: 'AUTH_LOGOUT' });
      // Force page reload to clear all state and redirect to login
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
      dispatch({ type: 'AUTH_LOGOUT' });
      // Force page reload even on error
      window.location.href = '/';
    }
  };

  return {
    ...state,
    signIn: handleSignIn,
    signUp: handleSignUp,
    confirmSignUp: handleConfirmSignUp,
    resetPassword: handleResetPassword,
    confirmResetPassword: handleConfirmResetPassword,
    signOut: handleSignOut,
    refreshToken: refreshAuthToken,
  };
};

// Helper function to convert errors to demonic messages
function getDemonicErrorMessage(error: string): string {
  const errorMap: Record<string, string> = {
    'User does not exist': '🦇 Your soul is not bound to our crypt. Sign up to join the darkness!',
    'Incorrect username or password': '💀 The spirits reject your credentials. Try again, mortal!',
    'User is not confirmed': '👻 Your soul awaits verification. Check your cursed inbox!',
    'Invalid verification code': '🕷️ The runes you provided are incorrect. Try again!',
    'Password did not conform': '⚰️ Your password is too weak for the underworld. Make it stronger!',
    'User already exists': '🧛 This soul is already claimed by the darkness!',
    'Attempt limit exceeded': '🔥 Too many failed attempts! The gates are temporarily sealed.',
  };

  for (const [key, value] of Object.entries(errorMap)) {
    if (error.includes(key)) {
      return value;
    }
  }

  return `💀 A dark force prevents your passage: ${error}`;
}
