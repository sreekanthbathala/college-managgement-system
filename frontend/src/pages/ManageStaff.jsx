import React, { useState, useEffect } from 'react';
import { apiFetch } from '../App';
import { Plus, Trash2, Search, X, Users, ShieldAlert, Mail, User, Lock } from 'lucide-react';

function ManageStaff() {
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [info, setInfo] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchStaffs = () => {
    setLoading(true);
    apiFetch('/api/staff/')
      .then(res => res.json())
      .then(data => setStaffs(data))
      .catch(err => console.error("Error fetching staff:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStaffs();
  }, []);

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setError('Username, Email, and Password are required fields.');
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
      additional_info: info
    };

    try {
      const response = await apiFetch('/api/staff/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to onboard staff member');
      }

      setSuccess('Faculty Staff registered and onboarded successfully!');
      // Reset form
      setUsername('');
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setInfo('');
      
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess('');
        fetchStaffs();
      }, 1000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm("Are you sure you want to delete this faculty member? All their teaching schedules will be affected.")) {
      return;
    }
    try {
      const response = await apiFetch(`/api/staff/${id}/`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete staff member');
      setStaffs(staffs.filter(s => s.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredStaffs = staffs.filter(s => 
    s.user.username.toLowerCase().includes(search.toLowerCase()) ||
    s.user.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.user.first_name + ' ' + s.user.last_name).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in">
      <div className="action-bar">
        <div className="search-input-wrapper">
          <Search size={18} />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search faculty name, username, email..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          <span>Register Lecturer</span>
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
                  <th>Faculty ID</th>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Biography/Info</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaffs.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No faculty staff members registered.
                    </td>
                  </tr>
                ) : (
                  filteredStaffs.map(staff => (
                    <tr key={staff.id}>
                      <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>#STF-{staff.id}</td>
                      <td style={{ fontWeight: 600 }}>{staff.user.first_name} {staff.user.last_name}</td>
                      <td><span className="badge badge-info">{staff.user.username}</span></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{staff.user.email}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{staff.additional_info || 'N/A'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDeleteStaff(staff.id)}
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

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="glass-card modal-content" style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ fontSize: '20px' }}>Onboard Faculty Instructor</h3>
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

            <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Alan" 
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Turing" 
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
                      placeholder="e.g. prof_alan" 
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
                      placeholder="alan@univ.edu" 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      style={{ paddingLeft: '38px' }}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Security Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="Enter onboarding password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ paddingLeft: '38px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Biography / Teaching Specializations</label>
                <textarea 
                  className="form-input" 
                  rows="3" 
                  placeholder="e.g. Professor of Computing Theory & Algorithms" 
                  value={info}
                  onChange={e => setInfo(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Instructor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageStaff;
