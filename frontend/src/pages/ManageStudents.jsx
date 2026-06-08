import React, { useState, useEffect } from 'react';
import { apiFetch, API_BASE } from '../App';
import { Plus, Trash2, Search, X, GraduationCap, ShieldAlert, User, Mail, Lock } from 'lucide-react';

function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [gender, setGender] = useState('Male');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSession, setSelectedSession] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const stdRes = await apiFetch('/api/students/');
      const stdData = await stdRes.json();
      setStudents(stdData);

      const crsRes = await apiFetch('/api/courses/');
      const crsData = await crsRes.json();
      setCourses(crsData);
      if (crsData.length > 0) setSelectedCourse(crsData[0].id);

      const sessRes = await apiFetch('/api/sessions/');
      const sessData = await sessRes.json();
      setSessions(sessData);
      if (sessData.length > 0) setSelectedSession(sessData[0].id);
    } catch (err) {
      console.error("Error loading students data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!username || !email || !password || !regNo) {
      setError('Username, Email, Password, and Registration number are required.');
      return;
    }

    setError('');
    setSuccess('');

    const payload = {
      user: {
        username,
        email,
        password,
        first_name: firstName,
        last_name: lastName
      },
      Registration_number: regNo,
      gender,
      course: selectedCourse ? parseInt(selectedCourse) : null,
      session_year: selectedSession ? parseInt(selectedSession) : null
    };

    try {
      const response = await apiFetch('/api/students/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to onboarding student');
      }

      setSuccess('Student onboarded and registered successfully!');
      // Reset form
      setUsername('');
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setRegNo('');
      
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess('');
        loadData();
      }, 1000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm("Are you sure you want to delete this student? All their evaluation transcripts and attendance sheets will be deleted.")) {
      return;
    }
    try {
      const response = await apiFetch(`/api/students/${id}/`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete student');
      setStudents(students.filter(s => s.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredStudents = students.filter(s => 
    s.user.username.toLowerCase().includes(search.toLowerCase()) ||
    s.Registration_number.toLowerCase().includes(search.toLowerCase()) ||
    (s.user.first_name + ' ' + s.user.last_name).toLowerCase().includes(search.toLowerCase()) ||
    s.course_detail?.course_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in">
      <div className="action-bar">
        <div className="search-input-wrapper">
          <Search size={18} />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search student name, registration no, degree..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          <span>Register Student</span>
        </button>
      </div>

      <div className="glass-card" style={{ padding: '0px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', padding: '60px', justifyContent: 'center' }}>
            <div className="logo-icon" style={{ animation: 'pulse 1.5s infinite' }}>🎓</div>
          </div>
        ) : (
          <div className="table-responsive" style={{ margin: 0, border: 'none' }}>
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Full Name</th>
                  <th>Reg Number</th>
                  <th>Gender</th>
                  <th>Degree Program</th>
                  <th>Session Batch</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No students registered.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(std => (
                    <tr key={std.id}>
                      <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>#STD-{std.id}</td>
                      <td style={{ fontWeight: 600 }}>{std.user.first_name} {std.user.last_name}</td>
                      <td><span className="badge badge-info">{std.Registration_number}</span></td>
                      <td>{std.gender}</td>
                      <td style={{ fontWeight: 500 }}>{std.course_detail?.course_name || 'N/A'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{std.session_year_detail?.display_name || 'N/A'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDeleteStudent(std.id)}
                          className="btn btn-secondary btn-sm" 
                          style={{ color: 'var(--accent-danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="glass-card modal-content" style={{ maxWidth: '680px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GraduationCap size={20} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ fontSize: '20px' }}>Onboard Student profile</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="btn btn-secondary btn-sm"
                style={{ padding: '6px' }}
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="badge badge-danger" style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderRadius: '12px', width: '100%', marginBottom: '20px', textTransform: 'none', justifyContent: 'flex-start', alignItems: 'center' }}>
                <ShieldAlert size={18} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="badge badge-success" style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderRadius: '12px', width: '100%', marginBottom: '20px', textTransform: 'none', justifyContent: 'center' }}>
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleAddStudent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Alice" 
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Smith" 
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                  />
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
                      placeholder="e.g. student_alice" 
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      style={{ paddingLeft: '38px' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="email" 
                      className="form-input" 
                      placeholder="alice@univ.edu" 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      style={{ paddingLeft: '38px' }}
                    />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Security Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="password" 
                      className="form-input" 
                      placeholder="Enter credential password" 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      style={{ paddingLeft: '38px' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Registration Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. REG-1092" 
                    value={regNo}
                    onChange={e => setRegNo(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Gender Classification</label>
                  <select 
                    className="form-input form-select" 
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Degree Academic Program</label>
                  <select 
                    className="form-input form-select" 
                    value={selectedCourse}
                    onChange={e => setSelectedCourse(e.target.value)}
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.course_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ maxWidth: '50%' }}>
                <label className="form-label">Session Batch Year</label>
                <select 
                  className="form-input form-select" 
                  value={selectedSession}
                  onChange={e => setSelectedSession(e.target.value)}
                >
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.display_name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageStudents;
