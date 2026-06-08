import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { apiFetch, API_BASE } from '../App';
import { CheckSquare, Calendar, Users, ShieldAlert, CheckCircle } from 'lucide-react';

function StaffTakeAttendance() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialSubject = queryParams.get('subject') || '';

  // Options
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);

  // Selections
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [selectedSession, setSelectedSession] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // Roster state
  const [students, setStudents] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [alreadyLogged, setAlreadyLogged] = useState(false);
  const [statusMap, setStatusMap] = useState({}); // student.id -> boolean (true=present, false=absent)

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Fetch subjects assigned to staff
    apiFetch('/api/dashboard/stats/')
      .then(res => res.json())
      .then(data => {
        setSubjects(data.subjects || []);
        if (data.subjects && data.subjects.length > 0 && !initialSubject) {
          setSelectedSubject(data.subjects[0].id);
        }
      })
      .catch(err => console.error("Error loading staff subjects:", err));

    // Fetch sessions
    apiFetch('/api/sessions/')
      .then(res => res.json())
      .then(data => {
        setSessions(data || []);
        if (data && data.length > 0) {
          setSelectedSession(data[0].id);
        }
      })
      .catch(err => console.error("Error loading sessions:", err));
  }, [initialSubject]);

  const loadStudentRoster = async () => {
    if (!selectedSubject || !selectedSession || !attendanceDate) {
      setError('Please select a subject, session year cohort, and attendance date.');
      return;
    }
    setError('');
    setSuccess('');
    setLoadingRoster(true);

    try {
      const response = await apiFetch(
        `/api/attendance/students/?subject=${selectedSubject}&session_year=${selectedSession}&attendance_date=${attendanceDate}`
      );
      if (!response.ok) throw new Error('Failed to load active student roster.');

      const data = await response.json();
      setStudents(data.students);
      setAlreadyLogged(data.already_logged);
      
      // Initialize checkboxes mapping (present vs absent)
      const initialMap = {};
      data.students.forEach(std => {
        initialMap[std.id] = std.is_present || false;
      });
      setStatusMap(initialMap);

      if (data.already_logged) {
        setSuccess('Attendance records already exist for this date. You may modify the logs.');
      }
    } catch (err) {
      setError(err.message);
      setStudents([]);
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleToggle = (id) => {
    setStatusMap(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleMarkAll = (value) => {
    const nextMap = {};
    students.forEach(std => {
      nextMap[std.id] = value;
    });
    setStatusMap(nextMap);
  };

  const handleSaveAttendance = async () => {
    setError('');
    setSuccess('');
    
    // Extract present IDs
    const presentStudentIds = Object.keys(statusMap).filter(id => statusMap[id]);

    const payload = {
      subject: parseInt(selectedSubject),
      session_year: parseInt(selectedSession),
      attendance_date: attendanceDate,
      student_status: presentStudentIds
    };

    try {
      const response = await apiFetch('/api/attendance/save/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit attendance logs');

      setSuccess('Class Attendance logs submitted successfully!');
      setAlreadyLogged(true);
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fade-in" style={{ textAlign: 'left' }}>
      <div className="glass-card" style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={18} style={{ color: 'var(--accent-primary)' }} />
          <span>Roster Query Criteria</span>
        </h3>
        
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Subject Course</label>
            <select 
              className="form-input form-select" 
              value={selectedSubject}
              onChange={e => { setSelectedSubject(e.target.value); setStudents([]); }}
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.subject_name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Session Batch Cohort</label>
            <select 
              className="form-input form-select" 
              value={selectedSession}
              onChange={e => { setSelectedSession(e.target.value); setStudents([]); }}
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.display_name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Roll Call Date</label>
            <input 
              type="date" 
              className="form-input" 
              value={attendanceDate}
              onChange={e => { setAttendanceDate(e.target.value); setStudents([]); }}
            />
          </div>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={loadStudentRoster}
          style={{ marginTop: '16px' }}
        >
          Load Student Roster
        </button>
      </div>

      {error && (
        <div className="badge badge-danger" style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderRadius: '12px', width: '100%', marginBottom: '24px', textTransform: 'none', justifyContent: 'flex-start', alignItems: 'center' }}>
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="badge badge-success" style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderRadius: '12px', width: '100%', marginBottom: '24px', textTransform: 'none', justifyContent: 'flex-start', alignItems: 'center' }}>
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Roster list */}
      {students.length > 0 && (
        <div className="glass-card fade-in" style={{ padding: '0px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} style={{ color: 'var(--accent-secondary)' }} />
              <h3 style={{ fontSize: '18px', margin: 0 }}>Roster Presence Logs</h3>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => handleMarkAll(true)}>
                Mark All Present
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleMarkAll(false)}>
                Clear Selection
              </button>
            </div>
          </div>

          <div className="table-responsive" style={{ margin: 0, border: 'none' }}>
            <table className="premium-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Status</th>
                  <th>Student Name</th>
                  <th>Reg Number</th>
                  <th>Gender</th>
                  <th>Academic Program</th>
                </tr>
              </thead>
              <tbody>
                {students.map(std => (
                  <tr key={std.id} style={{ cursor: 'pointer' }} onClick={() => handleToggle(std.id)}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={statusMap[std.id] || false}
                        onChange={() => {}} // Handled by tr onClick
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-secondary)' }}
                      />
                    </td>
                    <td style={{ fontWeight: 600 }}>{std.user.first_name} {std.user.last_name}</td>
                    <td><span className="badge badge-info">{std.Registration_number}</span></td>
                    <td>{std.gender}</td>
                    <td>{std.course_detail?.course_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button className="btn btn-primary" onClick={handleSaveAttendance}>
              {alreadyLogged ? 'Update Attendance Sheet' : 'Save Attendance Logs'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffTakeAttendance;
