import React, { useState, useEffect } from 'react';
import { apiFetch, API_BASE } from '../App';
import { Plus, Trash2, Search, X, GraduationCap, ShieldAlert } from 'lucide-react';

function ManageSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const subRes = await apiFetch('/api/subjects/');
      const subData = await subRes.json();
      setSubjects(subData);

      const crsRes = await apiFetch('/api/courses/');
      const crsData = await crsRes.json();
      setCourses(crsData);
      if (crsData.length > 0) setSelectedCourse(crsData[0].id);

      const staffRes = await apiFetch('/api/staff/');
      const staffData = await staffRes.json();
      setStaffList(staffData);
      if (staffData.length > 0) setSelectedStaff(staffData[0].user.id); // CustomeUser ID is linked on Subject staff FK
    } catch (err) {
      console.error("Error loading subjects data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!subjectName.trim()) {
      setError('Please enter a subject name.');
      return;
    }
    if (!selectedCourse) {
      setError('Please select a course.');
      return;
    }
    if (!selectedStaff) {
      setError('Please assign a faculty instructor.');
      return;
    }

    setError('');
    setSuccess('');

    const payload = {
      subject_name: subjectName,
      course: parseInt(selectedCourse),
      staff: parseInt(selectedStaff)
    };

    try {
      const response = await apiFetch('/api/subjects/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add subject');
      }

      setSuccess('Subject created and mapped successfully!');
      setSubjectName('');
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess('');
        loadData();
      }, 1000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteSubject = async (id) => {
    if (!window.confirm("Are you sure you want to delete this subject? All academic marks and reports associated will be deleted.")) {
      return;
    }
    try {
      const response = await apiFetch(`/api/subjects/${id}/`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete subject');
      setSubjects(subjects.filter(s => s.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredSubjects = subjects.filter(s => 
    s.subject_name.toLowerCase().includes(search.toLowerCase()) ||
    s.course_detail?.course_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.staff_detail?.first_name + ' ' + s.staff_detail?.last_name).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in">
      <div className="action-bar">
        <div className="search-input-wrapper">
          <Search size={18} />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search subjects, programs, instructors..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          <span>Add Subject</span>
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
                  <th>Subject ID</th>
                  <th>Subject Name</th>
                  <th>Academic Program</th>
                  <th>Assigned Faculty</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No subject curriculums mapped.
                    </td>
                  </tr>
                ) : (
                  filteredSubjects.map(sub => (
                    <tr key={sub.id}>
                      <td style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>#SUB-{sub.id}</td>
                      <td style={{ fontWeight: 600 }}>{sub.subject_name}</td>
                      <td>
                        <span className="badge badge-info">{sub.course_detail?.course_name}</span>
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {sub.staff_detail ? `${sub.staff_detail.first_name || sub.staff_detail.username} ${sub.staff_detail.last_name || ''}` : 'Unassigned'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDeleteSubject(sub.id)}
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

      {/* Add Subject Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="glass-card modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GraduationCap size={20} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ fontSize: '20px' }}>Create Subject Curriculum</h3>
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

            <form onSubmit={handleAddSubject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Subject Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Database Management Systems" 
                  value={subjectName}
                  onChange={e => setSubjectName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Parent Degree Program</label>
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

              <div className="form-group">
                <label className="form-label">Teaching Faculty Instructor</label>
                <select 
                  className="form-input form-select" 
                  value={selectedStaff}
                  onChange={e => setSelectedStaff(e.target.value)}
                >
                  {staffList.map(s => (
                    <option key={s.id} value={s.user.id}>
                      {s.user.first_name || s.user.username} {s.user.last_name || ''} ({s.user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageSubjects;
