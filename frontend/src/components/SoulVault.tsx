// SoulVault - Authentication component with Halloween theme

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Lightning from './Lightning';
import FallingText from './FallingText';
import './SoulVault.css';

type AuthView = 'signin' | 'signup' | 'verify' | 'reset' | 'confirm-reset';

interface SoulVaultProps {
  onAuthenticated?: () => void;
}

export const SoulVault: React.FC<SoulVaultProps> = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<AuthView>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { signIn, signUp, confirmSignUp, resetPassword, confirmResetPassword, error, loading, isAuthenticated } = useAuth();

  // Redirect to dashboard when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMessage('');

    try {
      await signIn(email, password);
      setSuccessMessage('🦇 Welcome back to the darkness!');
      // Force page reload to dashboard to ensure auth state is fully loaded
      window.location.href = '/dashboard';
    } catch (err: any) {
      setLocalError(err.message);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMessage('');

    if (password !== confirmPassword) {
      setLocalError('⚰️ Your passwords do not match. Try again, mortal!');
      return;
    }

    if (password.length < 8) {
      setLocalError('⚰️ Your password must be at least 8 characters long!');
      return;
    }

    try {
      await signUp(email, password);
      setSuccessMessage('📧 A cursed verification code has been sent to your inbox!');
      setView('verify');
    } catch (err: any) {
      setLocalError(err.message);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMessage('');

    try {
      await confirmSignUp(email, verificationCode);
      setSuccessMessage('✅ Your soul is now bound! You may sign in.');
      setView('signin');
      setVerificationCode('');
    } catch (err: any) {
      setLocalError(err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMessage('');

    try {
      await resetPassword(email);
      setSuccessMessage('📧 Password reset code sent to your cursed inbox!');
      setView('confirm-reset');
    } catch (err: any) {
      setLocalError(err.message);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMessage('');

    if (password !== confirmPassword) {
      setLocalError('⚰️ Your passwords do not match. Try again!');
      return;
    }

    try {
      await confirmResetPassword(email, verificationCode, password);
      setSuccessMessage('✅ Password reset successful! You may now sign in.');
      setView('signin');
      setVerificationCode('');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setLocalError(err.message);
    }
  };

  const renderSignIn = () => (
    <form onSubmit={handleSignIn} className="soul-vault-form">
      <div style={{ height: '180px', marginBottom: '1rem' }}>
        <FallingText
          text="🦇 Enter the Crypt.
Sign in to unleash the cursed reviewer"
          highlightWords={["Crypt", "cursed", "reviewer"]}
          trigger="hover"
          backgroundColor="transparent"
          wireframes={false}
          gravity={0.56}
          fontSize="1.5rem"
          mouseConstraintStiffness={0.9}
        />
      </div>

      <div className="soul-vault-field">
        <label htmlFor="email" className="soul-vault-label">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="soul-vault-input"
          placeholder="your.soul@darkness.com"
          required
          disabled={loading}
        />
      </div>

      <div className="soul-vault-field">
        <label htmlFor="password" className="soul-vault-label">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="soul-vault-input"
          placeholder="••••••••"
          required
          disabled={loading}
        />
      </div>

      <button type="submit" className="soul-vault-button" disabled={loading}>
        {loading ? '🕷️ Summoning...' : '💀 Sign In'}
      </button>

      <div className="soul-vault-links">
        <button
          type="button"
          onClick={() => setView('signup')}
          className="soul-vault-link"
          disabled={loading}
        >
          New soul? Join the darkness
        </button>
        <button
          type="button"
          onClick={() => setView('reset')}
          className="soul-vault-link"
          disabled={loading}
        >
          Forgot your cursed password?
        </button>
      </div>
    </form>
  );

  const renderSignUp = () => (
    <form onSubmit={handleSignUp} className="soul-vault-form">
      <h2 className="soul-vault-title">🧛 Bind Your Soul</h2>
      <p className="soul-vault-subtitle">Create an account to join the cursed realm</p>

      <div className="soul-vault-field">
        <label htmlFor="email" className="soul-vault-label">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="soul-vault-input"
          placeholder="your.soul@darkness.com"
          required
          disabled={loading}
        />
      </div>

      <div className="soul-vault-field">
        <label htmlFor="password" className="soul-vault-label">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="soul-vault-input"
          placeholder="••••••••"
          required
          disabled={loading}
        />
        <p className="soul-vault-hint">
          Minimum 8 characters with uppercase, lowercase, numbers, and special characters
        </p>
      </div>

      <div className="soul-vault-field">
        <label htmlFor="confirmPassword" className="soul-vault-label">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="soul-vault-input"
          placeholder="••••••••"
          required
          disabled={loading}
        />
      </div>

      <button type="submit" className="soul-vault-button" disabled={loading}>
        {loading ? '🕷️ Binding...' : '👻 Sign Up'}
      </button>

      <div className="soul-vault-links">
        <button
          type="button"
          onClick={() => setView('signin')}
          className="soul-vault-link"
          disabled={loading}
        >
          Already cursed? Sign in
        </button>
      </div>
    </form>
  );

  const renderVerify = () => (
    <form onSubmit={handleVerify} className="soul-vault-form">
      <h2 className="soul-vault-title">📧 Verify Your Soul</h2>
      <p className="soul-vault-subtitle">Enter the code sent to {email}</p>

      <div className="soul-vault-field">
        <label htmlFor="code" className="soul-vault-label">
          Verification Code
        </label>
        <input
          id="code"
          type="text"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          className="soul-vault-input"
          placeholder="123456"
          required
          disabled={loading}
        />
      </div>

      <button type="submit" className="soul-vault-button" disabled={loading}>
        {loading ? '🕷️ Verifying...' : '✅ Verify'}
      </button>

      <div className="soul-vault-links">
        <button
          type="button"
          onClick={() => setView('signin')}
          className="soul-vault-link"
          disabled={loading}
        >
          Back to sign in
        </button>
      </div>
    </form>
  );

  const renderReset = () => (
    <form onSubmit={handleResetPassword} className="soul-vault-form">
      <h2 className="soul-vault-title">🔮 Reset Password</h2>
      <p className="soul-vault-subtitle">Enter your email to receive a reset code</p>

      <div className="soul-vault-field">
        <label htmlFor="email" className="soul-vault-label">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="soul-vault-input"
          placeholder="your.soul@darkness.com"
          required
          disabled={loading}
        />
      </div>

      <button type="submit" className="soul-vault-button" disabled={loading}>
        {loading ? '🕷️ Sending...' : '📧 Send Reset Code'}
      </button>

      <div className="soul-vault-links">
        <button
          type="button"
          onClick={() => setView('signin')}
          className="soul-vault-link"
          disabled={loading}
        >
          Back to sign in
        </button>
      </div>
    </form>
  );

  const renderConfirmReset = () => (
    <form onSubmit={handleConfirmReset} className="soul-vault-form">
      <h2 className="soul-vault-title">🔑 Confirm Reset</h2>
      <p className="soul-vault-subtitle">Enter the code and your new password</p>

      <div className="soul-vault-field">
        <label htmlFor="code" className="soul-vault-label">
          Reset Code
        </label>
        <input
          id="code"
          type="text"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          className="soul-vault-input"
          placeholder="123456"
          required
          disabled={loading}
        />
      </div>

      <div className="soul-vault-field">
        <label htmlFor="password" className="soul-vault-label">
          New Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="soul-vault-input"
          placeholder="••••••••"
          required
          disabled={loading}
        />
      </div>

      <div className="soul-vault-field">
        <label htmlFor="confirmPassword" className="soul-vault-label">
          Confirm New Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="soul-vault-input"
          placeholder="••••••••"
          required
          disabled={loading}
        />
      </div>

      <button type="submit" className="soul-vault-button" disabled={loading}>
        {loading ? '🕷️ Resetting...' : '🔑 Reset Password'}
      </button>

      <div className="soul-vault-links">
        <button
          type="button"
          onClick={() => setView('signin')}
          className="soul-vault-link"
          disabled={loading}
        >
          Back to sign in
        </button>
      </div>
    </form>
  );

  return (
    <div className="soul-vault-container">
      <div className="fixed inset-0 z-0">
        <Lightning 
          hue={280}
          xOffset={0}
          speed={0.5}
          intensity={2}
          size={3}
        />
      </div>
      <div className="soul-vault-card">
        <div className="soul-vault-header">
          <div className="soul-vault-icon">💀</div>
          <h1 className="soul-vault-brand">Cursed Code Reviewer</h1>
        </div>

        {(error || localError) && (
          <div className="soul-vault-error">
            {error || localError}
          </div>
        )}

        {successMessage && (
          <div className="soul-vault-success">
            {successMessage}
          </div>
        )}

        {view === 'signin' && renderSignIn()}
        {view === 'signup' && renderSignUp()}
        {view === 'verify' && renderVerify()}
        {view === 'reset' && renderReset()}
        {view === 'confirm-reset' && renderConfirmReset()}
      </div>
    </div>
  );
};
