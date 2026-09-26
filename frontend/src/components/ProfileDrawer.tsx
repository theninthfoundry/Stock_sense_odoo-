import React, { useState } from 'react';
import {
  X,
  User as UserIcon,
  Shield,
  Building2,
  KeyRound,
  LogOut,
  CheckCircle2,
  Lock,
  RefreshCw,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({ isOpen, onClose }) => {
  const { user, isManager, logout } = useAuth();
  const toast = useToast();

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !user) return null;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsSaving(true);
    try {
      // Trigger OTP request for self
      const otpRes = await api.auth.requestOtp(user.email);
      if (otpRes.otpCode) {
        // Auto-fulfill if local/demo
        await api.auth.resetPassword({
          email: user.email,
          otp: otpRes.otpCode,
          newPassword
        });
        toast.success('Security credentials updated successfully');
        setIsChangingPassword(false);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.info('Verification code sent to email');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update credentials');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div style={{
          padding: '24px 28px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>Account Profile</span>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ width: 32, height: 32, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Body */}
        <div style={{ padding: '28px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* User Identity Card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '20px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--bg-canvas)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              color: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--text-lg)',
              fontWeight: 800
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: '#ffffff' }}>
                {user.name}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                {user.email}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: '#ffffff',
                  color: '#000000'
                }}>
                  {isManager ? 'Inventory Manager' : 'Warehouse Staff'}
                </span>
              </div>
            </div>
          </div>

          {/* Role & Permissions Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Permissions & Scope
            </span>

            <div style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              fontSize: 'var(--text-xs)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Shield size={14} /> System Role
                </span>
                <span style={{ fontWeight: 600, color: '#ffffff' }}>
                  {isManager ? 'Global Manager (All Warehouses)' : 'Restricted Warehouse Staff'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={14} /> Assigned Warehouse
                </span>
                <span style={{ fontWeight: 600, color: '#ffffff' }}>
                  {user.warehouse_id ? 'Assigned Facility' : 'Global Organization Scope'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} /> Session Engine
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#a1a1aa' }}>
                  SQLite WAL (Immutable Ledger)
                </span>
              </div>
            </div>
          </div>

          {/* Security Credentials */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Security & Password
              </span>
              {!isChangingPassword && (
                <button
                  type="button"
                  onClick={() => setIsChangingPassword(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Change Password
                </button>
              )}
            </div>

            {isChangingPassword ? (
              <form onSubmit={handlePasswordChange} style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-canvas)',
                border: '1px solid var(--border-medium)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => setIsChangingPassword(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    disabled={isSaving}
                  >
                    {isSaving ? <RefreshCw className="animate-spin" size={14} /> : 'Update Password'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 'var(--text-xs)'
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>Password Authentication</span>
                <span style={{ color: '#ffffff', fontWeight: 600 }}>Active (Bcrypt)</span>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer with Logout */}
        <div style={{
          padding: '20px 28px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface-elevated)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="btn btn-danger"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <LogOut size={16} />
            <span>Sign Out of Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
