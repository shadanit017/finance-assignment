import React, { useState, useEffect, useCallback } from 'react';
import { usersApi } from '../services/api';
import {
  ShieldAlert,
  Users,
  UserCheck,
  RefreshCw,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

interface UserManagementProps { }

interface UserItem {
  id: string;
  email: string;
  name?: string;
  googleId?: string;
  createdAt?: string;
  role?: {
    id: string;
    name: string;
    permissions?: Array<{
      permission: {
        name: string;
        description?: string;
      };
    }>;
  };
}

export const UserManagement: React.FC<UserManagementProps> = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & Pagination States
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsersAndRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const usersRes = await usersApi.getAll({ page, limit, search });

      let userList: UserItem[] = [];
      if (Array.isArray(usersRes)) {
        userList = usersRes;
        setTotal(usersRes.length);
        setTotalPages(1);
      } else if (usersRes && Array.isArray(usersRes.users)) {
        userList = usersRes.users;
        setTotal(usersRes.total || 0);
        setTotalPages(usersRes.totalPages || 1);
      }

      setUsers(userList);

      // Initialize selected dropdown roles
      const initialMap: Record<string, string> = {};
      userList.forEach((u: UserItem) => {
        initialMap[u.id] = u.role?.name || 'VIEWER';
      });
      setSelectedRoles(initialMap);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Access Denied: Only Admin users can view and manage user roles.';
      setError(msg);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    fetchUsersAndRoles();
  }, [fetchUsersAndRoles]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsersAndRoles();
  };

  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    setSelectedRoles((prev) => ({ ...prev, [userId]: newRole }));
  };

  const handleSaveRole = async (userId: string) => {
    const newRole = selectedRoles[userId];
    if (!newRole) return;

    setUpdatingId(userId);
    setError(null);
    setSuccessMsg(null);

    try {
      const updatedUser = await usersApi.updateRole(userId, newRole);
      setSuccessMsg(`Successfully updated role for ${updatedUser.email} to ${newRole}`);
      await fetchUsersAndRoles();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update user role.';
      setError(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="glass-card" style={{ marginBottom: '2.5rem', padding: '1.75rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--border-glass)',
          paddingBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              padding: '0.5rem',
              background: 'rgba(16, 185, 129, 0.15)',
              borderRadius: '10px',
              color: '#34d399',
            }}
          >
            <Users size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
              User Administration
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Manage registered users and assign permissions (Admin users are hidden)
            </p>
          </div>
        </div>

        <button
          onClick={fetchUsersAndRoles}
          disabled={loading}
          style={{
            padding: '0.4rem 0.85rem',
            fontSize: '0.85rem',
            borderRadius: '8px',
            border: '1px solid var(--border-glass)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--text-primary)',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div
          style={{
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            fontSize: '0.875rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <UserCheck size={16} /> {successMsg}
        </div>
      )}

      {/* Access Denied / Error Warning Banner */}
      {error && (
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
          }}
        >
          <div
            style={{
              padding: '0.5rem',
              background: 'rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              color: '#f87171',
            }}
          >
            <ShieldAlert size={24} />
          </div>
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f87171', margin: '0 0 0.35rem 0' }}>
              Admin Authorization Error
            </h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Search Bar & Stats */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: 1, maxWidth: '400px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users by name or email..."
              style={{
                width: '100%',
                padding: '0.5rem 2.2rem 0.5rem 2.2rem',
                fontSize: '0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border-glass)',
                background: 'rgba(15, 23, 42, 0.8)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="submit"
            style={{
              padding: '0.5rem 0.85rem',
              fontSize: '0.85rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Search
          </button>
        </form>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{users.length}</strong> of <strong>{total}</strong> users
        </div>
      </div>

      {/* User Table */}
      {users.length > 0 ? (
        <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.05)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-glass)', color: '#94a3b8' }}>User</th>
                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-glass)', color: '#94a3b8' }}>Email</th>
                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-glass)', color: '#94a3b8' }}>Assigned Role</th>
                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-glass)', color: '#94a3b8' }}>Capabilities & Permissions</th>
                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-glass)', color: '#94a3b8' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const currentRoleName = (u.role?.name || 'VIEWER').toUpperCase();
                const selectedRoleName = selectedRoles[u.id] || currentRoleName;
                const isSaving = updatingId === u.id;

                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {/* User Name / ID */}
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 500 }}>
                      <div style={{ color: 'var(--text-primary)' }}>{u.name || 'User'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        ID: {u.id.substring(0, 8)}...
                      </div>
                    </td>

                    {/* Email */}
                    <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>{u.email}</td>

                    {/* Assigned Role */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        className={
                          currentRoleName === 'ADMIN'
                            ? 'badge badge-success'
                            : currentRoleName === 'ANALYST'
                              ? 'badge badge-pending'
                              : 'badge badge-blue'
                        }
                      >
                        {currentRoleName}
                      </span>
                    </td>

                    {/* Permissions list */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {u.role?.permissions && u.role.permissions.length > 0 ? (
                          u.role.permissions.map((p, pIdx) => (
                            <span
                              key={pIdx}
                              style={{
                                fontSize: '0.7rem',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '6px',
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#a78bfa',
                              }}
                            >
                              {p.permission.name}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>None</span>
                        )}
                      </div>
                    </td>

                    {/* Action Selector & Save Button */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <select
                          value={selectedRoleName.toUpperCase()}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={isSaving}
                          style={{
                            padding: '0.4rem 0.6rem',
                            fontSize: '0.85rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-glass)',
                            background: 'rgba(15, 23, 42, 0.8)',
                            color: 'var(--text-primary)',
                            outline: 'none',
                          }}
                        >
                          <option value="VIEWER">VIEWER</option>
                          <option value="ANALYST">ANALYST</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleSaveRole(u.id)}
                          disabled={isSaving}
                          style={{
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#ffffff',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            opacity: isSaving ? 0.7 : 1,
                          }}
                        >
                          {isSaving ? (
                            <>
                              <Loader2 size={14} className="spin" /> Updating...
                            </>
                          ) : (
                            'Assign Role'
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        !loading && (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            No matching non-admin users found.
          </div>
        )
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            style={{
              padding: '0.45rem 0.75rem',
              fontSize: '0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-glass)',
              background: page <= 1 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.08)',
              color: page <= 1 ? 'var(--text-secondary)' : 'var(--text-primary)',
              cursor: page <= 1 || loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <ChevronLeft size={16} /> Previous
          </button>

          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
          </span>

          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            style={{
              padding: '0.45rem 0.75rem',
              fontSize: '0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-glass)',
              background: page >= totalPages ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.08)',
              color: page >= totalPages ? 'var(--text-secondary)' : 'var(--text-primary)',
              cursor: page >= totalPages || loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}


    </div>
  );
};
