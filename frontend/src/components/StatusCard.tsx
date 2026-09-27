import React from 'react';
import { Server, Database, Activity, RefreshCw } from 'lucide-react';

interface StatusCardProps {
  backendStatus: 'Checking' | 'Connected' | 'Error';
  dbStatus: 'Checking' | 'Connected' | 'Error';
  loading: boolean;
  onRefresh: () => void;
}

export const StatusCard: React.FC<StatusCardProps> = ({
  backendStatus,
  dbStatus,
  loading,
  onRefresh,
}) => {
  const getBadge = (status: 'Checking' | 'Connected' | 'Error') => {
    switch (status) {
      case 'Connected':
        return <span className="badge badge-success">Connected</span>;
      case 'Checking':
        return <span className="badge badge-pending">Checking...</span>;
      case 'Error':
        return <span className="badge badge-error">Disconnected</span>;
    }
  };

  return (
    <div className="glass-card" style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.6rem', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '12px', color: '#60a5fa' }}>
            <Activity size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>System Connection Status</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Live health monitor for NestJS backend & PostgreSQL database</p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--bg-card-border)',
            color: 'var(--text-primary)',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            transition: 'all 0.2s ease',
          }}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {/* Backend Status */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.25)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Server size={20} color="#60a5fa" />
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Backend API</div>
              <div style={{ fontWeight: 600, fontSize: '1rem', marginTop: '0.1rem' }}>Backend</div>
            </div>
          </div>
          <div>{getBadge(backendStatus)}</div>
        </div>

        {/* Database Status */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.25)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Database size={20} color="#34d399" />
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>PostgreSQL Engine</div>
              <div style={{ fontWeight: 600, fontSize: '1rem', marginTop: '0.1rem' }}>Database</div>
            </div>
          </div>
          <div>{getBadge(dbStatus)}</div>
        </div>
      </div>
    </div>
  );
};
