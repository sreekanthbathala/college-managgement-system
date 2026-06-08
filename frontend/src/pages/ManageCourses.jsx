import React, { useState, useEffect } from 'react';
import { apiFetch } from '../App';
import { Plus, Trash2, Search, X, BookOpen, ShieldAlert } from 'lucide-react';

function ManageCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCourses = () => {
    setLoading(true);
    apiFetch('/api/courses/')
      .then(res => res.json())
      .then(data => setCourses(data))
      .catch(err => console.error("Error fetching courses:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!newCourseName.trim()) {
      setError('Please enter a course name.');
      return;
    }
    setError('');
    setSuccess('');

    try {
      const response = await apiFetch('/api/courses/', {
        method: 'POST',
        body: JSON.stringify({ course_name: newCourseName })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.course_name || 'Failed to add course');
      }

      setSuccess('Course added successfully!');
      setNewCourseName('');
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess('');
        fetchCourses();
      }, 1000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCourse = async (id) => {
    if (!window.confirm("Are you sure you want to delete this course? All associated subjects and students will be modified/deleted.")) {
      return;
    }
    try {
      const response = await apiFetch(`/api/courses/${id}/`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete course');
      
      // Update list
      setCourses(courses.filter(c => c.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredCourses = courses.filter(c => 
    c.course_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in">
      <div className="action-bar">
        <div className="search-input-wrapper">
          <Search size={18} />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search courses..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          <span>Add Course</span>
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
                  <th>Course ID</th>
                  <th>Course Name</th>
                  <th>Created Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No academic programs found.
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map(course => (
                    <tr key={course.id}>
                      <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>#CRS-{course.id}</td>
                      <td style={{ fontWeight: 600 }}>{course.course_name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{new Date(course.created_at).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDeleteCourse(course.id)}
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

      {/* Add Course Glass Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="glass-card modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={20} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ fontSize: '20px' }}>Create Academic Program</h3>
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

            <form onSubmit={handleAddCourse} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Course Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Computer Science Engineering" 
                  value={newCourseName}
                  onChange={e => setNewCourseName(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageCourses;
