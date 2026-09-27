import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserManagement } from '../components/UserManagement';
import { useAuth } from '../auth/AuthContext';
import { ArrowLeft, LogOut, Users } from 'lucide-react';

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout: authLogout } = useAuth();

  const handleLogout = async () => {
    await authLogout();
    navigate('/login');
  };

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
      {/* Top Navbar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingBottom: '1rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--border-glass)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            to="/"
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-glass)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <ArrowLeft size={16} /> Back to Assistant
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                padding: '0.4rem',
                background: 'rgba(16, 185, 129, 0.2)',
                borderRadius: '8px',
                color: '#34d399',
              }}
            >
              <Users size={20} />
            </div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
              Admin Management Portal
            </h1>
          </div>
        </div>

        {/* Right Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.4rem 0.75rem',
              fontSize: '0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-glass)',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* User Governance Component */}
      <UserManagement />
    </div>
  );
};
