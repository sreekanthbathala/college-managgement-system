import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  BookOpen, Users, Calendar, GraduationCap, LogOut, 
  Layers, CheckSquare, Award, Plus, Trash2, Search, User, Menu, X, ArrowRight
} from 'lucide-react';

// Authentication Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// Global API Fetch helper
export const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Token ${token}` }),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  return response;
};

// Route Guard for Protected Pages
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="logo-icon" style={{ animation: 'pulse 1.5s infinite' }}>🎓</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.user_type)) {
    // Redirect to correct dashboard based on role
    if (user.user_type === 1) return <Navigate to="/admin" replace />;
    if (user.user_type === 2) return <Navigate to="/staff" replace />;
    if (user.user_type === 3) return <Navigate to="/student" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Sidebar Component
const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);

  if (!user) return null;

  const adminMenu = [
    { name: 'Dashboard', path: '/admin', icon: Layers },
    { name: 'Courses', path: '/admin/courses', icon: BookOpen },
    { name: 'Subjects', path: '/admin/subjects', icon: GraduationCap },
    { name: 'Sessions', path: '/admin/sessions', icon: Calendar },
    { name: 'Faculty Staff', path: '/admin/staff', icon: Users },
    { name: 'Students', path: '/admin/students', icon: GraduationCap },
  ];

  const staffMenu = [
    { name: 'Dashboard', path: '/staff', icon: Layers },
    { name: 'Take Attendance', path: '/staff/attendance', icon: CheckSquare },
    { name: 'Manage Marks', path: '/staff/marks', icon: Award },
  ];

  const studentMenu = [
    { name: 'My Dashboard', path: '/student', icon: Layers },
  ];

  const menuItems = user.user_type === 1 ? adminMenu : user.user_type === 2 ? staffMenu : studentMenu;

  return (
    <div className={`sidebar ${isOpen ? '' : 'collapsed'}`}>
      <div className="sidebar-header">
        <div className="logo-icon">🎓</div>
        <span className="logo-text">Excel University</span>
      </div>

      <ul className="sidebar-menu">
        {menuItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <li key={idx} className={`sidebar-item ${isActive ? 'active' : ''}`}>
              <Link to={item.path}>
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="sidebar-footer">
        <div className="user-badge">
          <div className="user-avatar">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <div className="user-name">{user.first_name || user.username}</div>
            <div className="user-role">{user.user_type_display}</div>
          </div>
        </div>
        <button onClick={logout} className="btn btn-secondary btn-sm" style={{ width: '100%', gap: '8px' }}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

// Navbar Component
const Navbar = ({ title }) => {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="navbar">
      <h2 className="page-title">{title}</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Welcome back, <strong style={{ color: 'var(--text-primary)' }}>{user.first_name || user.username}</strong>
        </div>
      </div>
    </div>
  );
};

// Lazy loaded page imports (placeholders mapped to actual pages we will write)
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/AdminDashboard';
import ManageCourses from './pages/ManageCourses';
import ManageSubjects from './pages/ManageSubjects';
import ManageSessions from './pages/ManageSessions';
import ManageStaff from './pages/ManageStaff';
import ManageStudents from './pages/ManageStudents';
import StaffDashboard from './pages/StaffDashboard';
import StaffTakeAttendance from './pages/StaffTakeAttendance';
import StaffManageMarks from './pages/StaffManageMarks';
import StudentDashboard from './pages/StudentDashboard';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user has active token
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      setLoading(false);
    } else if (token) {
      // Sync user profile from API
      apiFetch('/api/auth/user/')
        .then(res => res.json())
        .then(data => {
          const profileUser = {
            ...data.user,
            profile_id: data.profile ? data.profile.profile_id : null
          };
          localStorage.setItem('user', JSON.stringify(profileUser));
          setUser(profileUser);
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      <Router>
        <div className="app-layout">
          <Sidebar />
          <div className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* HOD Admin Portal */}
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={[1]}>
                  <Navbar title="Administrator Control Panel" />
                  <div className="workspace"><AdminDashboard /></div>
                </ProtectedRoute>
              } />
              <Route path="/admin/courses" element={
                <ProtectedRoute allowedRoles={[1]}>
                  <Navbar title="Academic Programs (Courses)" />
                  <div className="workspace"><ManageCourses /></div>
                </ProtectedRoute>
              } />
              <Route path="/admin/subjects" element={
                <ProtectedRoute allowedRoles={[1]}>
                  <Navbar title="Curriculum Disciplines (Subjects)" />
                  <div className="workspace"><ManageSubjects /></div>
                </ProtectedRoute>
              } />
              <Route path="/admin/sessions" element={
                <ProtectedRoute allowedRoles={[1]}>
                  <Navbar title="Session Timeline Batches" />
                  <div className="workspace"><ManageSessions /></div>
                </ProtectedRoute>
              } />
              <Route path="/admin/staff" element={
                <ProtectedRoute allowedRoles={[1]}>
                  <Navbar title="Faculty Instructors Directory" />
                  <div className="workspace"><ManageStaff /></div>
                </ProtectedRoute>
              } />
              <Route path="/admin/students" element={
                <ProtectedRoute allowedRoles={[1]}>
                  <Navbar title="Registered Students Directory" />
                  <div className="workspace"><ManageStudents /></div>
                </ProtectedRoute>
              } />

              {/* Faculty Portal */}
              <Route path="/staff" element={
                <ProtectedRoute allowedRoles={[2]}>
                  <Navbar title="Faculty Instructor ERP" />
                  <div className="workspace"><StaffDashboard /></div>
                </ProtectedRoute>
              } />
              <Route path="/staff/attendance" element={
                <ProtectedRoute allowedRoles={[2]}>
                  <Navbar title="Interactive Class Attendance" />
                  <div className="workspace"><StaffTakeAttendance /></div>
                </ProtectedRoute>
              } />
              <Route path="/staff/marks" element={
                <ProtectedRoute allowedRoles={[2]}>
                  <Navbar title="Subject Term Evaluation" />
                  <div className="workspace"><StaffManageMarks /></div>
                </ProtectedRoute>
              } />

              {/* Student Portal */}
              <Route path="/student" element={
                <ProtectedRoute allowedRoles={[3]}>
                  <Navbar title="Student ERP Console" />
                  <div className="workspace"><StudentDashboard /></div>
                </ProtectedRoute>
              } />

              {/* Fallbacks */}
              <Route path="*" element={
                user ? (
                  user.user_type === 1 ? <Navigate to="/admin" replace /> :
                  user.user_type === 2 ? <Navigate to="/staff" replace /> :
                  <Navigate to="/student" replace />
                ) : <Navigate to="/login" replace />
              } />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
