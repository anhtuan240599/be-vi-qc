import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function UserModal({ user, onClose, onSaved }) {
  const isEdit = !!user?.id;
  const [form, setForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'user',
    status: user?.status || 'active',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form };
      if (isEdit && !payload.password) delete payload.password;
      if (isEdit) {
        await api.put(`/users/${user.id}`, payload);
      } else {
        await api.post('/users', payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Operation failed');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? 'Edit User' : 'Create User'}</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="m-username">Username</label>
            <input id="m-username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </div>
          <div className="form-group">
            <label htmlFor="m-email">Email</label>
            <input id="m-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label htmlFor="m-password">Password {isEdit && '(leave blank to keep)'}</label>
            <input id="m-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} {...(!isEdit && { required: true })} />
          </div>
          <div className="form-group">
            <label htmlFor="m-role">Role</label>
            <select id="m-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="m-status">Status</label>
            <select id="m-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="btn-group" style={{ marginTop: 16 }}>
            <button type="submit" className="btn btn-primary">{isEdit ? 'Update' : 'Create'}</button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | {} (create) | user (edit)
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchUsers = useCallback(async (page = 1) => {
    try {
      const { data } = await api.get('/users', { params: { page, limit: 10, search } });
      setUsers(data.data);
      setPagination(data.pagination);
    } catch {
      // 401 handled by interceptor
    }
  }, [search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers(pagination.page);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Delete failed');
    }
  };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // ignore
    }
    localStorage.clear();
    navigate('/login');
  };

  return (
    <>
      <div className="header">
        <h1>Admin Panel</h1>
        <div className="btn-group">
          <span style={{ lineHeight: '36px', marginRight: 8 }}>Hi, {currentUser.username}</span>
          <button className="btn btn-danger btn-sm" onClick={handleLogout}>Logout</button>
        </div>
      </div>
      <div className="container">
        <div className="card">
          <div className="search-bar">
            <input
              placeholder="Search by username or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn btn-primary" onClick={() => fetchUsers(1)}>Search</button>
            <button className="btn btn-success" onClick={() => setModal({})}>+ New User</button>
          </div>

          <table>
            <thead>
              <tr>
                <th>ID</th><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.username}</td>
                  <td>{u.email}</td>
                  <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                  <td><span className={`badge badge-${u.status}`}>{u.status}</span></td>
                  <td>
                    <div className="btn-group">
                      <button className="btn btn-primary btn-sm" onClick={() => setModal(u)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 24 }}>No users found</td></tr>
              )}
            </tbody>
          </table>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-secondary btn-sm" disabled={pagination.page <= 1} onClick={() => fetchUsers(pagination.page - 1)}>Prev</button>
              <span>Page {pagination.page} / {pagination.totalPages}</span>
              <button className="btn btn-secondary btn-sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchUsers(pagination.page + 1)}>Next</button>
            </div>
          )}
        </div>
      </div>

      {modal !== null && (
        <UserModal
          user={modal.id ? modal : null}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchUsers(pagination.page); }}
        />
      )}
    </>
  );
}
