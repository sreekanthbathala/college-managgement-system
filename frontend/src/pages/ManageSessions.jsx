import React, { useState, useEffect } from 'react';
import { apiFetch } from '../App';
import { Plus, Trash2, Calendar, X, ShieldAlert } from 'lucide-react';

function ManageSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSessions = () => {
    setLoading(true);
    apiFetch('/api/sessions/')
      .then(res => res.json())
      .then(data => setSessions(data))
      .catch(err => console.error("Error fetching sessions:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleAddSession = async (e) => {
    e.preventDefault();
    if (!startYear || !endYear) {
      setError('Please select both start and end dates.');
      return;
    }
    setError('');
    setSuccess('');

    try {
      const response = await apiFetch('/api/sessions/', {
        method: 'POST',
        body: JSON.stringify({
          session_start_year: startYear,
          session_end_year: endYear
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create academic session');
      }

      setSuccess('Academic session added successfully!');
      setStartYear('');
      setEndYear('');
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess('');
        fetchSessions();
      }, 1000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteSession = async (id) => {
    if (!window.confirm("Are you sure you want to delete this session? All students in this cohort and their transcripts will be affected.")) {
      return;
    }
    try {
      const response = await apiFetch(`/api/sessions/${id}/`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete session');
      setSessions(sessions.filter(s => s.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="fade-in">
      <div className="action-bar" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          <span>Add Academic Session</span>
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
                  <th>Session ID</th>
                  <th>Cohort Timeline Range</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No session cohorts established.
                    </td>
                  </tr>
                ) : (
                  sessions.map(sess => (
                    <tr key={sess.id}>
                      <td style={{ fontWeight: 700, color: 'var(--accent-warning)' }}>#SES-{sess.id}</td>
                      <td style={{ fontWeight: 600 }}>
                        <span className="badge badge-info">{sess.display_name}</span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{new Date(sess.session_start_year).toLocaleDateString()}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{new Date(sess.session_end_year).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDeleteSession(sess.id)}
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

      {/* Add Session Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="glass-card modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ fontSize: '20px' }}>Setup Academic Session</h3>
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

            <form onSubmit={handleAddSession} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Session Start Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={startYear}
                  onChange={e => setStartYear(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Session End Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={endYear}
                  onChange={e => setEndYear(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageSessions;
