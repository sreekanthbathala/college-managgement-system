import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, API_BASE } from '../App';
import { Lock, User, ArrowRight, ShieldAlert } from 'lucide-react';

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.non_field_errors || data.error || 'Invalid credentials');
      }

      // Successful login
      const profileUser = {
        id: data.user_id,
        username: data.username,
        email: data.email,
        user_type: data.user_type,
        user_type_display: data.user_type_display,
        first_name: data.first_name,
        last_name: data.last_name,
        profile_id: data.profile_id
      };
      
      login(profileUser, data.token);

      // Redirect based on role
      if (data.user_type === 1) navigate('/admin');
      else if (data.user_type === 2) navigate('/staff');
      else navigate('/student');

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (roleUser, rolePass) => {
    setUsername(roleUser);
    setPassword(rolePass);
    setError('');
  };

  return (
    <div className="auth-gate fade-in">
      <div className="glass-card auth-card">
        <div className="auth-header">
          <div className="logo-icon" style={{ margin: '0 auto', width: '56px', height: '56px', fontSize: '28px' }}>🎓</div>
          <h1 className="auth-title">Excel University</h1>
          <p className="auth-subtitle">College Management ERP System</p>
        </div>

        {error && (
          <div className="badge badge-danger" style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderRadius: '12px', width: '100%', marginBottom: '20px', textTransform: 'none', justifyContent: 'flex-start', alignItems: 'center' }}>
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Username / Login ID</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Enter username" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={{ paddingLeft: '44px' }}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                className="form-input" 
                placeholder="Enter password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingLeft: '44px' }}
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        {/* Quick Demo Login Grid */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-glass)' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '12px', textAlign: 'center' }}>
            ⚡ Operational Demo Accounts
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button 
              onClick={() => handleQuickLogin('admin', 'admin123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '8px 4px', whiteSpace: 'nowrap' }}
            >
              👑 Admin HOD
            </button>
            <button 
              onClick={() => handleQuickLogin('prof_alan', 'staff123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '8px 4px', whiteSpace: 'nowrap' }}
            >
              👨‍🏫 Faculty
            </button>
            <button 
              onClick={() => handleQuickLogin('student_alice', 'student123')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '8px 4px', whiteSpace: 'nowrap' }}
            >
              🎓 Student
            </button>
          </div>
        </div>

        <div className="auth-footer">
          Don't have an account? <Link to="/signup" style={{ fontWeight: 600 }}>Create an account</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
