import React, { useState } from 'react';
import { Boxes, KeyRound, Mail, Lock, User as UserIcon, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

export const AuthPage: React.FC = () => {
  const { login, signup } = useAuth();
  const toast = useToast();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'inventory_manager' | 'warehouse_staff'>('inventory_manager');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [generatedOtpHint, setGeneratedOtpHint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldError, setFieldError] = useState<{ field?: string; message?: string }>({});

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError({});
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success('Authenticated to StockSense Ledger');
    } catch (err: any) {
      setFieldError({ field: err.field, message: err.message });
      toast.error(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError({});
    setIsLoading(true);
    try {
      await signup({ name, email, password, role });
      toast.success('Account created successfully');
    } catch (err: any) {
      setFieldError({ field: err.field, message: err.message });
      toast.error(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError({});
    setIsLoading(true);
    try {
      const res = await api.auth.requestOtp(email);
      toast.success(res.message);
      if (res.otpCode) {
        setGeneratedOtpHint(res.otpCode);
      }
      setMode('reset');
    } catch (err: any) {
      setFieldError({ field: err.field, message: err.message });
      toast.error(err.message || 'Failed to request OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError({});
    setIsLoading(true);
    try {
      const res = await api.auth.resetPassword({ email, otp, newPassword });
      toast.success(res.message);
      setMode('login');
      setPassword(newPassword);
    } catch (err: any) {
      setFieldError({ field: err.field, message: err.message });
      toast.error(err.message || 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickDemo = (roleChoice: 'manager' | 'staff') => {
    if (roleChoice === 'manager') {
      setEmail('manager@stocksense.com');
      setPassword('admin123');
    } else {
      setEmail('staff@stocksense.com');
      setPassword('staff123');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-3)',
      backgroundColor: '#09090b',
      position: 'relative'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        padding: '36px',
        backgroundColor: '#121215',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-elevated)'
      }}>
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#ffffff',
            color: '#000000',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            boxShadow: '0 0 24px rgba(255, 255, 255, 0.2)'
          }}>
            <Boxes size={24} />
          </div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em' }}>
            StockSense
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginTop: 4 }}>
            Immutable Stock Ledger & Inventory Engine
          </p>
        </div>

        {/* Demo Fast Fill Pills */}
        <div style={{
          backgroundColor: '#18181b',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 12px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 'var(--text-xs)'
        }}>
          <span style={{ color: 'var(--text-muted)' }}>Quick Demo:</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => fillQuickDemo('manager')}
              style={{
                background: '#ffffff',
                color: '#09090b',
                border: 'none',
                padding: '3px 9px',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 600
              }}
            >
              Manager
            </button>
            <button
              type="button"
              onClick={() => fillQuickDemo('staff')}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                border: '1px solid var(--border-subtle)',
                padding: '3px 9px',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 500
              }}
            >
              Staff
            </button>
          </div>
        </div>

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="var(--text-dim)" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: 38 }}
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Password</label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  style={{ background: 'none', border: 'none', color: '#a1a1aa', fontSize: 'var(--text-xs)', cursor: 'pointer' }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="var(--text-dim)" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: 38 }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {fieldError.message && (
                <span className="form-error-inline">{fieldError.message}</span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 8 }}
              disabled={isLoading}
            >
              {isLoading ? <RefreshCw className="animate-spin" size={15} /> : <ArrowRight size={15} />}
              <span>Sign In</span>
            </button>

            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                style={{ background: 'none', border: 'none', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
              >
                Sign Up
              </button>
            </div>
          </form>
        )}

        {/* SIGNUP FORM */}
        {mode === 'signup' && (
          <form onSubmit={handleSignup}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <UserIcon size={15} color="var(--text-dim)" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: 38 }}
                  placeholder="Alex Mercer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="var(--text-dim)" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: 38 }}
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="var(--text-dim)" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: 38 }}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
              >
                <option value="inventory_manager">Inventory Manager (Full Access)</option>
                <option value="warehouse_staff">Warehouse Staff (Assigned Facility)</option>
              </select>
            </div>

            {fieldError.message && (
              <span className="form-error-inline">{fieldError.message}</span>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 8 }}
              disabled={isLoading}
            >
              {isLoading ? <RefreshCw className="animate-spin" size={15} /> : <ShieldCheck size={15} />}
              <span>Create Account</span>
            </button>

            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{ background: 'none', border: 'none', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {mode === 'forgot' && (
          <form onSubmit={handleRequestOtp}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: '#ffffff' }}>
                Password Recovery
              </h2>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4 }}>
                Enter your account email to receive a secure 6-digit OTP code.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="var(--text-dim)" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: 38 }}
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {fieldError.message && (
                <span className="form-error-inline">{fieldError.message}</span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 8 }}
              disabled={isLoading}
            >
              {isLoading ? <RefreshCw className="animate-spin" size={15} /> : <KeyRound size={15} />}
              <span>Generate 6-Digit OTP</span>
            </button>

            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 'var(--text-xs)' }}>
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* RESET PASSWORD FORM */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPassword}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: '#ffffff' }}>
                Enter Verification OTP
              </h2>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4 }}>
                Enter the 6-digit code for <strong>{email}</strong>
              </p>
            </div>

            {generatedOtpHint && (
              <div style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-medium)',
                marginBottom: 16,
                fontSize: 'var(--text-xs)',
                color: '#ffffff'
              }}>
                🔑 <strong>Generated OTP:</strong> <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700 }}>{generatedOtpHint}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">6-Digit Code</label>
              <input
                type="text"
                className="form-input"
                style={{ textAlign: 'center', letterSpacing: '0.25em', fontSize: 18, fontFamily: 'var(--font-mono)' }}
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="var(--text-dim)" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: 38 }}
                  placeholder="New password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              {fieldError.message && (
                <span className="form-error-inline">{fieldError.message}</span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 8 }}
              disabled={isLoading}
            >
              {isLoading ? <RefreshCw className="animate-spin" size={15} /> : <ShieldCheck size={15} />}
              <span>Reset & Sign In</span>
            </button>

            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 'var(--text-xs)' }}>
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
