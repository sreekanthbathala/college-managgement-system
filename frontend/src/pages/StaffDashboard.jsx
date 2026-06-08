import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../App';
import { BookOpen, CheckSquare, Award, PlayCircle, Layers, Calendar, ChevronRight } from 'lucide-react';

function StaffDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/dashboard/stats/')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load instructor dashboard stats');
        return res.json();
      })
      .then(data => setStats(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '50vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="logo-icon" style={{ animation: 'pulse 1.5s infinite' }}>🎓</div>
      </div>
    );
  }

  if (error) {
    return <div className="badge badge-danger" style={{ padding: '16px', borderRadius: '12px' }}>{error}</div>;
  }

  const { counts, subjects } = stats;

  const cardStats = [
    { label: 'Assigned Courses', value: counts.subjects, icon: BookOpen, color: 'var(--accent-primary)' },
    { label: 'Attendance Records', value: counts.attendance, icon: CheckSquare, color: 'var(--accent-secondary)' },
    { label: 'Graded Results', value: counts.results, icon: Award, color: 'var(--accent-warning)' },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '32px', textAlign: 'left' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800 }}>Faculty Lecturer Desk</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Welcome to your curriculum operations panel.</p>
      </div>

      {/* Faculty Summary Cards */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {cardStats.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="glass-card metric-card">
              <div className="metric-icon" style={{ color: card.color }}>
                <Icon size={24} />
              </div>
              <div className="metric-details">
                <div className="metric-value">{card.value}</div>
                <div className="metric-label">{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Curriculum list */}
      <div style={{ textAlign: 'left', marginTop: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Layers size={20} style={{ color: 'var(--accent-primary)' }} />
          <h2 style={{ fontSize: '20px' }}>Your Assigned Subject Curriculum Courses</h2>
        </div>

        {subjects.length === 0 ? (
          <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            You are not currently assigned to teach any subjects. Please contact the Admin HOD.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {subjects.map((sub, idx) => (
              <div key={idx} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <span className="badge badge-info" style={{ marginBottom: '8px' }}>
                    {sub.course_detail?.course_name || 'Generic Degree'}
                  </span>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>{sub.subject_name}</h3>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', paddingBottom: '12px', borderBottom: '1px solid var(--border-glass)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subject Code:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>#SUB-{sub.id}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Created Date:</span>
                    <strong>{new Date(sub.created_at).toLocaleDateString()}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <Link 
                    to={`/staff/attendance?subject=${sub.id}`} 
                    className="btn btn-primary btn-sm" 
                    style={{ flex: 1, gap: '4px' }}
                  >
                    <CheckSquare size={14} />
                    <span>Attendance</span>
                  </Link>
                  <Link 
                    to={`/staff/marks?subject=${sub.id}`} 
                    className="btn btn-secondary btn-sm" 
                    style={{ flex: 1, gap: '4px' }}
                  >
                    <Award size={14} />
                    <span>Grading</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StaffDashboard;
