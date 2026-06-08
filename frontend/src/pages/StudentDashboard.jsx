import React, { useState, useEffect } from 'react';
import { apiFetch } from '../App';
import { GraduationCap, Calendar, Award, CheckSquare, ShieldCheck, ShieldAlert, Award as MedalIcon } from 'lucide-react';

function StudentDashboard() {
  const [profileStats, setProfileStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/dashboard/stats/')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load student dashboard context');
        return res.json();
      })
      .then(data => setProfileStats(data))
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

  const { registration_number, gender, course_name, session_year_name, counts, subjects_stats } = profileStats;
  const overallPct = counts.overall_percentage;
  
  // Calculate SVG stroke offset: circumference = 2 * PI * R (R=70, circumference = 439.8, round to 440)
  const strokeOffset = 440 - (440 * Math.min(overallPct, 100)) / 100;
  
  // Roster status classification
  const isSafe = overallPct >= 75;

  return (
    <div className="fade-in" style={{ textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800 }}>Student Workspace</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome to your academic tracking portal.</p>
        </div>
        <div className={`badge ${isSafe ? 'badge-success' : 'badge-danger'}`} style={{ display: 'flex', gap: '8px', padding: '8px 16px', borderRadius: '10px' }}>
          {isSafe ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
          <span>{isSafe ? 'Attendance Regular' : 'Attendance Shortage Alert'}</span>
        </div>
      </div>

      {/* Profile Details Bar */}
      <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px', background: 'rgba(30, 41, 59, 0.25)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Degree Program</span>
          <strong style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}><GraduationCap size={16} style={{ color: 'var(--accent-primary)' }} /> {course_name}</strong>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Session Batch</span>
          <strong style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16} style={{ color: 'var(--accent-warning)' }} /> {session_year_name}</strong>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Registration ID</span>
          <strong style={{ fontSize: '16px' }}><span className="badge badge-info">{registration_number}</span></strong>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Gender Registry</span>
          <strong style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>{gender}</strong>
        </div>
      </div>

      {/* Main Grid: Left is Attendance Breakdown, Right is circular Gauge */}
      <div className="portal-grid" style={{ marginBottom: '32px' }}>
        {/* Attendance breakdown */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare size={18} style={{ color: 'var(--accent-secondary)' }} />
            <span>Attendance Breakdown by Subject</span>
          </h3>

          <div className="table-responsive" style={{ margin: 0, border: 'none', background: 'transparent' }}>
            <table className="premium-table" style={{ background: 'transparent' }}>
              <thead>
                <tr>
                  <th>Subject Course</th>
                  <th>Hours Held</th>
                  <th>Hours Attended</th>
                  <th>Satisfaction Rate</th>
                </tr>
              </thead>
              <tbody>
                {subjects_stats.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No curriculum mappings found.</td>
                  </tr>
                ) : (
                  subjects_stats.map((sub, idx) => {
                    const isSubSafe = sub.percentage >= 75;
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{sub.subject_name}</td>
                        <td>{sub.held} hrs</td>
                        <td>{sub.attended} hrs</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', minWidth: '80px' }}>
                              <div style={{ 
                                width: `${Math.min(sub.percentage, 100)}%`, 
                                height: '100%', 
                                background: isSubSafe ? 'var(--accent-secondary)' : 'var(--accent-danger)', 
                                borderRadius: '10px' 
                              }}></div>
                            </div>
                            <span style={{ fontWeight: 700, color: isSubSafe ? 'var(--accent-secondary)' : 'var(--accent-danger)' }}>{sub.percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Circular Gauge */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px' }}>Aggregate Attendance</h3>
          
          <div className="attendance-gauge-container">
            <svg className="circular-gauge">
              <circle className="circular-gauge-bg" cx="80" cy="80" r="70" />
              <circle 
                className="circular-gauge-fill" 
                cx="80" 
                cy="80" 
                r="70" 
                style={{ 
                  strokeDashoffset: strokeOffset, 
                  stroke: isSafe ? 'var(--accent-secondary)' : 'var(--accent-danger)' 
                }} 
              />
            </svg>
            <div className="gauge-center-text">
              <span className="gauge-percentage" style={{ color: isSafe ? 'var(--accent-secondary)' : 'var(--accent-danger)' }}>{overallPct}%</span>
              <span className="gauge-label">Roster Attendance</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {isSafe ? (
              <p style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>✅ Your attendance satisfies the institutional 75% requirement.</p>
            ) : (
              <p style={{ color: 'var(--accent-danger)', fontWeight: 600 }}>⚠️ Attendance shortage! You must attend classes to reach 75% standard.</p>
            )}
          </div>
        </div>
      </div>

      {/* Term Grade-Sheet Transcript */}
      <div className="glass-card fade-in">
        <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={18} style={{ color: 'var(--accent-warning)' }} />
          <span>Term Evaluation Academic Transcript</span>
        </h3>

        <div className="table-responsive" style={{ margin: 0, border: 'none', background: 'transparent' }}>
          <table className="premium-table" style={{ background: 'transparent' }}>
            <thead>
              <tr>
                <th>Subject Curriculum</th>
                <th>Marks Obtained (100)</th>
                <th>Grading Classification Badge</th>
              </tr>
            </thead>
            <tbody>
              {subjects_stats.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No curriculum mappings found.</td>
                </tr>
              ) : (
                subjects_stats.map((sub, idx) => {
                  let statusText = 'Ungraded';
                  let statusClass = 'badge-info';
                  
                  if (sub.marks !== null) {
                    const score = parseFloat(sub.marks);
                    if (score >= 85) { statusText = 'Distinction'; statusClass = 'badge-success'; }
                    else if (score >= 40) { statusText = 'Pass'; statusClass = 'badge-warning'; }
                    else { statusText = 'Fail'; statusClass = 'badge-danger'; }
                  }

                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{sub.subject_name}</td>
                      <td style={{ fontWeight: 700, fontSize: '16px', color: sub.marks !== null ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {sub.marks !== null ? `${sub.marks}` : 'N/A'}
                      </td>
                      <td>
                        <span className={`badge ${statusClass}`}>{statusText}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
