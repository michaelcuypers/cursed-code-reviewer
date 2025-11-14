// Authentication types for the Cursed Code Reviewer

export interface SoulCredentials {
  email: string;
  password: string;
}

export interface SoulToken {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface SoulUser {
  soulId: string;
  email: string;
  curseLevel?: number;
  totalScans?: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: SoulUser | null;
  token: SoulToken | null;
  loading: boolean;
  error: string | null;
}

export type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: SoulUser; token: SoulToken } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'TOKEN_REFRESH'; payload: SoulToken };
