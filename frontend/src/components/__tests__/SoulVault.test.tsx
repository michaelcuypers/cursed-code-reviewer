// Tests for SoulVault component - UI integration with authentication flows

import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SoulVault } from '../SoulVault';
import * as amplifyAuth from 'aws-amplify/auth';

vi.mock('aws-amplify/auth');

describe('SoulVault Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(amplifyAuth.getCurrentUser).mockRejectedValue(new Error('Not authenticated'));
    vi.mocked(amplifyAuth.fetchAuthSession).mockRejectedValue(new Error('Not authenticated'));
  });

  it('should render sign in form by default', async () => {
    render(<SoulVault />);
    
    await waitFor(() => {
      expect(screen.getByText(/Enter the Crypt/i)).toBeInTheDocument();
    });
    
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /💀 Sign In/i })).toBeInTheDocument();
  });

  it('should handle successful sign in', async () => {
    const mockOnAuthenticated = vi.fn();
    const mockUser = {
      userId: 'soul-123',
      signInDetails: { loginId: 'test@darkness.com' },
    };
    
    const mockSession = {
      tokens: {
        accessToken: {
          toString: () => 'mock-token',
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

    vi.mocked(amplifyAuth.signIn).mockResolvedValue({ isSignedIn: true } as any);
    vi.mocked(amplifyAuth.getCurrentUser).mockResolvedValue(mockUser as any);
    vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValue(mockSession as any);

    render(<SoulVault onAuthenticated={mockOnAuthenticated} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /💀 Sign In/i })).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const signInButton = screen.getByRole('button', { name: /💀 Sign In/i });

    fireEvent.change(emailInput, { target: { value: 'test@darkness.com' } });
    fireEvent.change(passwordInput, { target: { value: 'CursedPass123!' } });
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(mockOnAuthenticated).toHaveBeenCalled();
    });
  });

  it('should display error for invalid credentials', async () => {
    const error = new Error('Incorrect username or password');
    vi.mocked(amplifyAuth.signIn).mockRejectedValue(error);

    render(<SoulVault />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /💀 Sign In/i })).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const signInButton = screen.getByRole('button', { name: /💀 Sign In/i });

    fireEvent.change(emailInput, { target: { value: 'test@darkness.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(screen.getByText(/spirits reject your credentials/i)).toBeInTheDocument();
    });
  });

  it('should switch to sign up view', async () => {
    render(<SoulVault />);

    await waitFor(() => {
      expect(screen.getByText(/New soul\? Join the darkness/i)).toBeInTheDocument();
    });

    const signUpLink = screen.getByText(/New soul\? Join the darkness/i);
    fireEvent.click(signUpLink);

    await waitFor(() => {
      expect(screen.getByText(/🧛 Bind Your Soul/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
  });

  it('should validate password match on sign up', async () => {
    render(<SoulVault />);

    await waitFor(() => {
      expect(screen.getByText(/New soul\? Join the darkness/i)).toBeInTheDocument();
    });

    const signUpLink = screen.getByText(/New soul\? Join the darkness/i);
    fireEvent.click(signUpLink);

    await waitFor(() => {
      expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const confirmInput = screen.getByLabelText(/Confirm Password/i);
    const signUpButton = screen.getByRole('button', { name: /👻 Sign Up/i });

    fireEvent.change(emailInput, { target: { value: 'new@darkness.com' } });
    fireEvent.change(passwordInput, { target: { value: 'CursedPass123!' } });
    fireEvent.change(confirmInput, { target: { value: 'DifferentPass123!' } });
    fireEvent.click(signUpButton);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('should handle sign up and show verification view', async () => {
    vi.mocked(amplifyAuth.signUp).mockResolvedValue({
      isSignUpComplete: false,
      nextStep: { signUpStep: 'CONFIRM_SIGN_UP' },
    } as any);

    render(<SoulVault />);

    await waitFor(() => {
      expect(screen.getByText(/New soul\? Join the darkness/i)).toBeInTheDocument();
    });

    const signUpLink = screen.getByText(/New soul\? Join the darkness/i);
    fireEvent.click(signUpLink);

    await waitFor(() => {
      expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const confirmInput = screen.getByLabelText(/Confirm Password/i);
    const signUpButton = screen.getByRole('button', { name: /👻 Sign Up/i });

    fireEvent.change(emailInput, { target: { value: 'new@darkness.com' } });
    fireEvent.change(passwordInput, { target: { value: 'CursedPass123!' } });
    fireEvent.change(confirmInput, { target: { value: 'CursedPass123!' } });
    fireEvent.click(signUpButton);

    await waitFor(() => {
      expect(screen.getByText(/📧 Verify Your Soul/i)).toBeInTheDocument();
    });
  });

  it('should handle password reset flow', async () => {
    vi.mocked(amplifyAuth.resetPassword).mockResolvedValue({
      isPasswordReset: false,
      nextStep: { resetPasswordStep: 'CONFIRM_RESET_PASSWORD_WITH_CODE' },
    } as any);

    render(<SoulVault />);

    await waitFor(() => {
      expect(screen.getByText(/Forgot your cursed password\?/i)).toBeInTheDocument();
    });

    const resetLink = screen.getByText(/Forgot your cursed password\?/i);
    fireEvent.click(resetLink);

    await waitFor(() => {
      expect(screen.getByText(/🔮 Reset Password/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Email Address/i);
    const resetButton = screen.getByRole('button', { name: /Send Reset Code/i });

    fireEvent.change(emailInput, { target: { value: 'test@darkness.com' } });
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(screen.getByText(/🔑 Confirm Reset/i)).toBeInTheDocument();
    });
  });

  it('should disable inputs while loading', async () => {
    vi.mocked(amplifyAuth.signIn).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<SoulVault />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /💀 Sign In/i })).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Email Address/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
    const signInButton = screen.getByRole('button', { name: /💀 Sign In/i });

    fireEvent.change(emailInput, { target: { value: 'test@darkness.com' } });
    fireEvent.change(passwordInput, { target: { value: 'CursedPass123!' } });
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(emailInput.disabled).toBe(true);
      expect(passwordInput.disabled).toBe(true);
    });
  });
});
