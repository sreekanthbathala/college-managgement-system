import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE, apiFetch } from '../App';
import { User, Mail, Lock, ShieldAlert, ArrowLeft, ArrowRight } from 'lucide-react';

function Signup() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  
  // Form State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('3'); // Default to Student (3)
  
  // Student-specific Form State
  const [regNo, setRegNo] = useState('');
  const [gender, setGender] = useState('Male');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSession, setSelectedSession] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch courses and sessions to populate options
    fetch(`${API_BASE}/api/courses/`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch courses");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setCourses(data);
          if (data.length > 0) setSelectedCourse(data[0].id);
        }
      })
      .catch(err => console.error("Error loading courses:", err));

    fetch(`${API_BASE}/api/sessions/`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch sessions");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setSessions(data);
          if (data.length > 0) setSelectedSession(data[0].id);
        }
      })
      .catch(err => console.error("Error loading sessions:", err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setError('Please fill in all basic fields.');
      return;
    }
    if (userType === '3' && !regNo) {
      setError('Please enter your registration number.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    const payload = {
      username,
      email,
      password,
      user_type: parseInt(userType),
      ...(userType === '3' && {
        reg_no: regNo,
        gender,
        course: selectedCourse ? parseInt(selectedCourse) : null,
        session_year: selectedSession ? parseInt(selectedSession) : null
      })
    };

    try {
      const response = await fetch(`${API_BASE}/api/auth/signup/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to register account');
      }

      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-gate fade-in">
      <div className="glass-card auth-card" style={{ maxWidth: '520px' }}>
        <div className="auth-header" style={{ marginBottom: '24px' }}>
          <div className="logo-icon" style={{ margin: '0 auto', width: '48px', height: '48px', fontSize: '24px' }}>🎓</div>
          <h1 className="auth-title" style={{ fontSize: '26px' }}>Onboard Registry</h1>
          <p className="auth-subtitle">Create your Institutional CMS Profile</p>
        </div>

        {error && (
          <div className="badge badge-danger" style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderRadius: '12px', width: '100%', marginBottom: '20px', textTransform: 'none', justifyContent: 'flex-start', alignItems: 'center' }}>
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="badge badge-success" style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderRadius: '12px', width: '100%', marginBottom: '20px', textTransform: 'none', justifyContent: 'center' }}>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">Role Classification</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button 
                type="button"
                className={`btn ${userType === '3' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setUserType('3')}
                style={{ padding: '10px' }}
                disabled={loading}
              >
                🎓 Student
              </button>
              <button 
                type="button"
                className={`btn ${userType === '2' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setUserType('2')}
                style={{ padding: '10px' }}
                disabled={loading}
              >
                👨‍🏫 Faculty
              </button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Username</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. alice_dev" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  style={{ paddingLeft: '38px', paddingRight: '12px', fontSize: '14px' }}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="alice@univ.edu" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ paddingLeft: '38px', paddingRight: '12px', fontSize: '14px' }}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                className="form-input" 
                placeholder="Choose a strong password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingLeft: '38px', fontSize: '14px' }}
                disabled={loading}
              />
            </div>
          </div>

          {/* Student specific fields */}
          {userType === '3' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Reg Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. REG-1082" 
                    value={regNo}
                    onChange={e => setRegNo(e.target.value)}
                    style={{ fontSize: '14px' }}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select 
                    className="form-input form-select" 
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    style={{ fontSize: '14px' }}
                    disabled={loading}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Enrolling Course</label>
                  <select 
                    className="form-input form-select" 
                    value={selectedCourse}
                    onChange={e => setSelectedCourse(e.target.value)}
                    style={{ fontSize: '14px' }}
                    disabled={loading}
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.course_name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Session Batch</label>
                  <select 
                    className="form-input form-select" 
                    value={selectedSession}
                    onChange={e => setSelectedSession(e.target.value)}
                    style={{ fontSize: '14px' }}
                    disabled={loading}
                  >
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{s.session_start_year} to {s.session_end_year}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={loading}>
            {loading ? 'Creating Account...' : 'Submit Profile'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: '20px' }}>
          Already have an account? <Link to="/login" style={{ fontWeight: 600 }}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}

export default Signup;
