import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FinancialAssistant } from '../components/FinancialAssistant';
import { useAuth } from '../auth/AuthContext';
import { Sparkles, Users, LogOut, User, LogIn } from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user: sessionUser, logout: authLogout } = useAuth();

  const handleLogout = async () => {
    await authLogout();
    navigate('/login');
  };

  const isAdmin = sessionUser?.role?.name?.toUpperCase() === 'ADMIN';

  return (
    <div className="container" style={{ paddingTop: '1rem', paddingBottom: '2rem' }}>
      {/* Top Navbar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingBottom: '1rem',
          marginBottom: '1rem',
          borderBottom: '1px solid var(--border-glass)',
        }}
      >
        {/* App Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              padding: '0.45rem',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
              borderRadius: '12px',
              color: '#60a5fa',
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }} className="gradient-text">
              AI Financial Insights
            </h1>
          </div>
        </div>

        {/* User Session & Admin Link Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* User Management Link for Admins */}
          {isAdmin && (
            <Link
              to="/admin"
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.85rem',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <Users size={15} /> Users
            </Link>
          )}

          {/* User badge & Logout */}
          {sessionUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <User size={13} /> {sessionUser.name || sessionUser.email}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-glass)',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <LogOut size={13} /> Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border-glass)',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                textDecoration: 'none',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <LogIn size={15} /> Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Main Clean Chat Assistant */}
      <FinancialAssistant />
    </div>
  );
};
