import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { apiFetch, API_BASE } from '../App';
import { Award, Calendar, Users, ShieldAlert, CheckCircle } from 'lucide-react';

function StaffManageMarks() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialSubject = queryParams.get('subject') || '';

  // Options
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);

  // Selections
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [selectedSession, setSelectedSession] = useState('');

  // Marks roster state
  const [studentsData, setStudentsData] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [marksMap, setMarksMap] = useState({}); // student_id -> mark value

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
    if (!selectedSubject || !selectedSession) {
      setError('Please select both subject and session year cohort.');
      return;
    }
    setError('');
    setSuccess('');
    setLoadingRoster(true);

    try {
      const response = await apiFetch(
        `/api/marks/students/?subject=${selectedSubject}&session_year=${selectedSession}`
      );
      if (!response.ok) throw new Error('Failed to load active grade sheet.');

      const data = await response.json();
      setStudentsData(data.students_data);
      
      // Initialize marks mapping
      const initialMap = {};
      data.students_data.forEach(std => {
        initialMap[std.student_id] = std.marks;
      });
      setMarksMap(initialMap);

    } catch (err) {
      setError(err.message);
      setStudentsData([]);
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleMarkChange = (studentId, value) => {
    // Validate value ranges (0 to 100)
    if (value !== '' && (parseFloat(value) < 0 || parseFloat(value) > 100)) {
      return;
    }
    setMarksMap(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  const handleSaveMarks = async () => {
    setError('');
    setSuccess('');

    // Ensure all scores are validated
    let isValid = true;
    Object.values(marksMap).forEach(val => {
      if (val !== '' && (isNaN(val) || parseFloat(val) < 0 || parseFloat(val) > 100)) {
        isValid = false;
      }
    });

    if (!isValid) {
      setError('Please ensure all numerical scores are between 0 and 100.');
      return;
    }

    const payload = {
      subject: parseInt(selectedSubject),
      session_year: parseInt(selectedSession),
      marks_data: marksMap
    };

    try {
      const response = await apiFetch('/api/marks/save/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit grade evaluation');

      setSuccess('Student academic evaluation scores updated successfully!');
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
          <Award size={18} style={{ color: 'var(--accent-primary)' }} />
          <span>Curriculum evaluation Criteria</span>
        </h3>
        
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Subject Course</label>
            <select 
              className="form-input form-select" 
              value={selectedSubject}
              onChange={e => { setSelectedSubject(e.target.value); setStudentsData([]); }}
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
              onChange={e => { setSelectedSession(e.target.value); setStudentsData([]); }}
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.display_name}</option>
              ))}
            </select>
          </div>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={loadStudentRoster}
          style={{ marginTop: '16px' }}
        >
          Load Evaluation Grid
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

      {/* Grade spreadsheet */}
      {studentsData.length > 0 && (
        <div className="glass-card fade-in" style={{ padding: '0px', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} style={{ color: 'var(--accent-secondary)' }} />
              <h3 style={{ fontSize: '18px', margin: 0 }}>Spreadsheet Evaluation Grade-Sheet</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Enter numerical term exam scores (0 - 100) on the grid below. Unentered rows will not be recorded.
            </p>
          </div>

          <div className="table-responsive" style={{ margin: 0, border: 'none' }}>
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Registration No</th>
                  <th style={{ width: '220px' }}>Term Score (0 - 100)</th>
                  <th>Letter Grade Status</th>
                </tr>
              </thead>
              <tbody>
                {studentsData.map(std => {
                  const currentVal = marksMap[std.student_id];
                  let letterGrade = 'N/A';
                  let badgeClass = 'badge-info';
                  
                  if (currentVal !== '' && !isNaN(currentVal)) {
                    const score = parseFloat(currentVal);
                    if (score >= 85) { letterGrade = 'Distinction'; badgeClass = 'badge-success'; }
                    else if (score >= 40) { letterGrade = 'Pass'; badgeClass = 'badge-warning'; }
                    else { letterGrade = 'Fail'; badgeClass = 'badge-danger'; }
                  }

                  return (
                    <tr key={std.student_id}>
                      <td style={{ fontWeight: 600 }}>{std.first_name} {std.last_name}</td>
                      <td><span className="badge badge-info">{std.reg_no}</span></td>
                      <td>
                        <input 
                          type="number" 
                          className="form-input" 
                          min="0" 
                          max="100" 
                          step="0.5" 
                          placeholder="Grade points"
                          value={currentVal}
                          onChange={e => handleMarkChange(std.student_id, e.target.value)}
                          style={{ padding: '8px 12px', fontSize: '14px', width: '120px' }}
                        />
                      </td>
                      <td>
                        <span className={`badge ${badgeClass}`}>{letterGrade}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button className="btn btn-primary" onClick={handleSaveMarks}>
              Submit Grade Evaluations
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffManageMarks;
