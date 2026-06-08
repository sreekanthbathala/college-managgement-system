import React, { useState, useEffect } from 'react';
import { apiFetch } from '../App';
import { BookOpen, Users, Calendar, GraduationCap, Clock, Award, ShieldCheck } from 'lucide-react';

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/dashboard/stats/')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load dashboard metrics');
        return res.json();
      })
      .then(data => {
        setStats(data);
      })
      .catch(err => {
        setError(err.message);
      })
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

  const { counts, recents } = stats;

  const cardStats = [
    { label: 'Academic Programs', value: counts.courses, icon: BookOpen, sub: 'Active degrees' },
    { label: 'Faculty Lecturers', value: counts.staff, icon: Users, sub: 'Teaching instructors' },
    { label: 'Enrolled Students', value: counts.students, icon: GraduationCap, sub: 'Active directory' },
    { label: 'Curriculum Subjects', value: counts.subjects, icon: Award, sub: 'Lectures mapped' },
    { label: 'Session Timeline', value: counts.sessions, icon: Calendar, sub: 'Active cohorts' },
  ];

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800 }}>Institutional Overview</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome to the Administrative Control Center.</p>
        </div>
        <div className="badge badge-success" style={{ display: 'flex', gap: '8px', padding: '8px 16px', borderRadius: '10px' }}>
          <ShieldCheck size={16} />
          <span>System Online</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="metrics-grid">
        {cardStats.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="glass-card metric-card">
              <div className="metric-icon">
                <Icon size={24} />
              </div>
              <div className="metric-details">
                <div className="metric-value">{card.value}</div>
                <div className="metric-label">{card.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{card.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recents Grids */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '32px', marginTop: '32px', textAlign: 'left' }}>
        {/* Recent Students */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Clock size={18} style={{ color: 'var(--accent-secondary)' }} />
            <h3 style={{ fontSize: '18px' }}>Recently Registered Students</h3>
          </div>
          <div className="table-responsive" style={{ margin: 0, border: 'none', background: 'transparent' }}>
            <table className="premium-table" style={{ background: 'transparent' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px 16px' }}>Student</th>
                  <th style={{ padding: '12px 16px' }}>Reg No</th>
                  <th style={{ padding: '12px 16px' }}>Program</th>
                </tr>
              </thead>
              <tbody>
                {recents.students.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>No student records found.</td>
                  </tr>
                ) : (
                  recents.students.map((std, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{std.user.first_name} {std.user.last_name}</td>
                      <td style={{ padding: '12px 16px' }}><span className="badge badge-info">{std.Registration_number}</span></td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{std.course_detail?.course_name || 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Faculty Staff */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Clock size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '18px' }}>Recently Onboarded Faculty</h3>
          </div>
          <div className="table-responsive" style={{ margin: 0, border: 'none', background: 'transparent' }}>
            <table className="premium-table" style={{ background: 'transparent' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px 16px' }}>Instructor</th>
                  <th style={{ padding: '12px 16px' }}>Email</th>
                  <th style={{ padding: '12px 16px' }}>Display ID</th>
                </tr>
              </thead>
              <tbody>
                {recents.staff.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>No faculty records found.</td>
                  </tr>
                ) : (
                  recents.staff.map((fac, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{fac.user.first_name || fac.user.username} {fac.user.last_name}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{fac.user.email}</td>
                      <td style={{ padding: '12px 16px' }}><span className="badge badge-success">STAFF-{fac.id}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
