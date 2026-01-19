import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Button, Input } from '@thatsit/ui';
import { db } from '../lib/db';
import { createPortal } from 'react-dom';
import './SettingsPanel.css';
import { X, Cloud, CloudOff, Loader2, AlertCircle, ArrowLeft, Mail } from 'lucide-react';
import { useSync } from '../sync';
import { authStart, authSignup, authSendOtp, authVerifyOtp } from '../sync/api';

type AuthStep = 'email' | 'signup' | 'signin' | 'magic-link-sent' | 'otp-sent';

export function SettingsPanel() {
  const { settingsPanelOpen, setSettingsPanelOpen } = useAppStore();
  const { status, isEnabled, enable, disable, syncNow } = useSync();

  const [syncUrl, setSyncUrl] = useState(() => localStorage.getItem('syncUrl') || 'https://sync.thatsit.app');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [authStep, setAuthStep] = useState<AuthStep>('email');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const resetAuthState = () => {
    setAuthStep('email');
    setEmail('');
    setUsername('');
    setOtpCode('');
    setAuthError(null);
    setIsLoading(false);
  };

  const handleContinue = async () => {
    setAuthError(null);
    setIsLoading(true);

    try {
      localStorage.setItem('syncUrl', syncUrl);
      const result = await authStart(syncUrl, email, 'notes');

      if (result.action === 'signup') {
        setAuthStep('signup');
      } else {
        // Existing user - auto-send OTP
        setAuthStep('signin');
        await authSendOtp(syncUrl, email, 'notes');
        setAuthStep('otp-sent');
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    setAuthError(null);
    setIsLoading(true);

    try {
      await authSignup(syncUrl, email, username, 'notes');
      setAuthStep('magic-link-sent');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setAuthError(null);
    setIsLoading(true);

    try {
      const result = await authVerifyOtp(syncUrl, email, otpCode);
      enable(syncUrl, result.access_token, result.refresh_token);
      resetAuthState();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Invalid code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setAuthError(null);
    setIsLoading(true);

    try {
      await authSendOtp(syncUrl, email, 'notes');
      setOtpCode('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to resend');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    disable();
  };

  const handleDeleteAllData = async () => {
    await db.notes.clear();
    await db.tasks.clear();
    await db.tags.clear();
    await db.syncMeta.clear();
    disable();
    setShowDeleteDialog(false);
    window.location.reload();
  };

  if (!settingsPanelOpen) return null;

  return createPortal(
    <div className="settings-overlay" onClick={() => setSettingsPanelOpen(false)}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2 className="settings-title">Settings</h2>
          <Button
            variant="ghost"
            className="settings-close"
            onClick={() => setSettingsPanelOpen(false)}
          >
            <X size={20} />
          </Button>
        </div>

        <div className="settings-content">
          {/* Sync Section */}
          <section className="settings-section">
            <h3 className="settings-section-title">Sync</h3>

            {isEnabled ? (
              <>
                <div className="sync-status">
                  {status === 'syncing' && (
                    <>
                      <Loader2 size={16} className="sync-icon spinning" />
                      <span>Syncing...</span>
                    </>
                  )}
                  {status === 'idle' && (
                    <>
                      <Cloud size={16} className="sync-icon" />
                      <span>Connected</span>
                    </>
                  )}
                  {status === 'offline' && (
                    <>
                      <CloudOff size={16} className="sync-icon" />
                      <span>Offline</span>
                    </>
                  )}
                  {status === 'error' && (
                    <>
                      <AlertCircle size={16} className="sync-icon error" />
                      <span>Sync error</span>
                    </>
                  )}
                </div>
                <div className="settings-actions">
                  <Button onClick={() => syncNow()}>Sync Now</Button>
                  <Button variant="ghost" onClick={handleLogout}>Logout</Button>
                </div>
              </>
            ) : (
              <>
                {/* Back button for non-email steps */}
                {authStep !== 'email' && (
                  <button
                    className="settings-back-button"
                    onClick={resetAuthState}
                    disabled={isLoading}
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>
                )}

                {/* Step 1: Email entry */}
                {authStep === 'email' && (
                  <>
                    <div className="settings-field">
                      <label className="settings-label">Sync URL</label>
                      <Input
                        type="url"
                        value={syncUrl}
                        onChange={(e) => setSyncUrl(e.target.value)}
                        placeholder="https://sync.thatsit.app"
                      />
                    </div>

                    <div className="settings-field">
                      <label className="settings-label">Email</label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        onKeyDown={(e) => e.key === 'Enter' && email && handleContinue()}
                      />
                    </div>

                    {authError && (
                      <div className="settings-error">{authError}</div>
                    )}

                    <Button onClick={handleContinue} disabled={isLoading || !email}>
                      {isLoading ? 'Checking...' : 'Continue'}
                    </Button>
                  </>
                )}

                {/* Step 2a: Signup - collect username */}
                {authStep === 'signup' && (
                  <>
                    <div className="settings-info">
                      <Mail size={16} />
                      <span>{email}</span>
                    </div>

                    <div className="settings-field">
                      <label className="settings-label">Choose a username</label>
                      <Input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="username"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && username && handleSignup()}
                      />
                    </div>

                    {authError && (
                      <div className="settings-error">{authError}</div>
                    )}

                    <Button onClick={handleSignup} disabled={isLoading || !username}>
                      {isLoading ? 'Sending...' : 'Send Magic Link'}
                    </Button>
                  </>
                )}

                {/* Step 2b: Magic link sent */}
                {authStep === 'magic-link-sent' && (
                  <div className="settings-message">
                    <Mail size={24} />
                    <h4>Check your email</h4>
                    <p>We sent a magic link to <strong>{email}</strong></p>
                    <p className="settings-message-hint">Click the link in the email to complete signup.</p>
                  </div>
                )}

                {/* Step 2c: Signin - sending OTP */}
                {authStep === 'signin' && (
                  <div className="settings-message">
                    <Loader2 size={24} className="spinning" />
                    <p>Sending code to {email}...</p>
                  </div>
                )}

                {/* Step 3: OTP verification */}
                {authStep === 'otp-sent' && (
                  <>
                    <div className="settings-info">
                      <Mail size={16} />
                      <span>{email}</span>
                    </div>

                    <div className="settings-field">
                      <label className="settings-label">Enter the 6-digit code</label>
                      <Input
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && otpCode.length === 6 && handleVerifyOtp()}
                      />
                    </div>

                    {authError && (
                      <div className="settings-error">{authError}</div>
                    )}

                    <Button onClick={handleVerifyOtp} disabled={isLoading || otpCode.length !== 6}>
                      {isLoading ? 'Verifying...' : 'Verify'}
                    </Button>

                    <button
                      className="settings-link-button"
                      onClick={handleResendOtp}
                      disabled={isLoading}
                    >
                      Resend code
                    </button>
                  </>
                )}
              </>
            )}
          </section>

          {/* Danger Zone */}
          <section className="settings-section settings-danger-zone">
            <h3 className="settings-section-title">Danger Zone</h3>
            <p className="settings-danger-description">
              This will permanently delete all your notes, tasks, and settings.
            </p>
            <Button onClick={() => setShowDeleteDialog(true)}>
              Delete All Data
            </Button>
          </section>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteDialog && createPortal(
          <div className="dialog-overlay" onClick={() => setShowDeleteDialog(false)}>
            <div className="dialog" onClick={(e) => e.stopPropagation()}>
              <h3 className="dialog-title">Are you sure?</h3>
              <p className="dialog-message">
                This will permanently delete all your notes, tasks, and settings. This action cannot be undone.
              </p>
              <div className="dialog-actions">
                <Button onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleDeleteAllData}>
                  Delete All Data
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>,
    document.body
  );
}
