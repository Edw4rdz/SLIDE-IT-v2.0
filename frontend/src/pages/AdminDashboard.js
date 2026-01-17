import React, { useState, useEffect } from "react";
import { notify } from "../utils/notify";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot, limit } from "firebase/firestore";

import { 
  fetchAnalytics, 
  createUser, 
  deleteUser, 
  updateUserRole 
} from "../adminApi";
import "../styles/adminDashboard.css"; 

import { FaSignOutAlt, FaPlus } from "react-icons/fa"; 
import { getAuth, signOut } from "firebase/auth";
import "@fortawesome/fontawesome-free/css/all.min.css";
import ConfirmDialog from "../components/ConfirmDialog";

const INITIAL_NEW_USER_STATE = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "", // Added confirmPassword
  firstName: "",
  lastName: "",
  birthday: "",
  isAdmin: false
};

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [roleStats, setRoleStats] = useState({
    student: 0,
    educator: 0,
    professional: 0,
    other: 0,
    notSet: 0
  });
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [error, setError] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState(INITIAL_NEW_USER_STATE);
  const [loadingAction, setLoadingAction] = useState(false);
  
  // Password Validation Logic
  const [showPassword, setShowPassword] = useState(false);
  const [pwdInfo, setPwdInfo] = useState({
    length: false,
    upper: false,
    lower: false,
    digit: false,
    noSpace: true,
  });

  const evaluatePassword = (pwd) => ({
    length: typeof pwd === 'string' && pwd.length >= 8,
    upper: /[A-Z]/.test(pwd || ''),
    lower: /[a-z]/.test(pwd || ''),
    digit: /\d/.test(pwd || ''),
    noSpace: !/\s/.test(pwd || ''),
  });
  
  // --- Sidebar Logic ---
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const handleLogout = () => {
    setLogoutConfirmOpen(true);
  };
  const confirmLogout = async () => {
    setLogoutConfirmOpen(false);
    setLoggingOut(true);
    try {
      const auth = getAuth();
      await signOut(auth);
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
      setLoggingOut(false);
    }
  };
  
  // --- Real-Time Data Loading ---
  useEffect(() => {
    setLoading(true);
    const loadStaticData = async () => {
      try {
        const analyticsData = await fetchAnalytics();
        setStats(analyticsData);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      }
    };
    loadStaticData();

    const q = query(
      collection(db, "users"), 
      orderBy("lastLogin", "desc"), 
      limit(10) 
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // A. Update Users State
      setUsers(userList);

      // B. Calculate Role Stats Live
      const newRoleStats = { student: 0, educator: 0, professional: 0, other: 0, notSet: 0 };
      userList.forEach(user => {
        const role = user.role ? user.role.toLowerCase() : 'notset';
        if (role === 'student') newRoleStats.student++;
        else if (role === 'educator') newRoleStats.educator++;
        else if (role === 'professional') newRoleStats.professional++;
        else if (role === 'notset') newRoleStats.notSet++;
        else newRoleStats.other++;
      });
      setRoleStats(newRoleStats);

      setLoading(false);
    }, (error) => {
      console.error("Real-time listener error:", error);
      setError(error.message);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Handlers ---

  const handleNewUserChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'password') {
      setPwdInfo(evaluatePassword(value));
    }

    setNewUserData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleNewUserSubmit = async (e) => {
    e.preventDefault();
    if (!newUserData.email || !newUserData.password || !newUserData.confirmPassword || !newUserData.username || !newUserData.firstName || !newUserData.lastName || !newUserData.birthday) {
      return notify("Please fill out all fields.", "error");
    }

    // Email Validation (Strict Gmail/Yahoo)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(newUserData.email)) {
       return notify("Please enter a valid email address.", "error"); 
    }
    const domain = newUserData.email.split('@')[1];
    const allowedDomains = ["gmail.com", "yahoo.com"];
    if (!domain || !allowedDomains.includes(domain.toLowerCase())) {
       return notify("Only Gmail and Yahoo addresses are allowed.", "error");
    }

    if (newUserData.password !== newUserData.confirmPassword) {
      return notify("Passwords do not match.", "error");
    }

    // Password Validation
    const info = evaluatePassword(newUserData.password);
    if (!info.length) return notify("Password must be at least 8 characters.", "error");
    if (!info.upper) return notify("Password must include at least one uppercase letter.", "error");
    if (!info.lower) return notify("Password must include at least one lowercase letter.", "error");
    if (!info.digit) return notify("Password must include at least one number.", "error");
    if (!info.noSpace) return notify("Password must not contain spaces.", "error");

    // Age Check (13+)
    const bDate = new Date(newUserData.birthday);
    const today = new Date();
    let age = today.getFullYear() - bDate.getFullYear();
    const m = today.getMonth() - bDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
      age--;
    }
    if (age < 13) {
      return notify("User must be at least 13 years old.", "error");
    }

    setLoadingAction(true);
    try {
      await createUser(newUserData);
      setIsModalOpen(false);
      setNewUserData(INITIAL_NEW_USER_STATE);
      // Reset pwdInfo for next time
      setPwdInfo({ length: false, upper: false, lower: false, digit: false, noSpace: true });
    } catch (err) {
      notify(`Error creating user: ${err.message}`, "error");
    } finally {
      setLoadingAction(false);
    }
  };

  const [roleConfirm, setRoleConfirm] = useState({ open: false, docId: null, newIsAdmin: false, text: "" });
  const handleRoleChange = (docId, newIsAdmin) => {
    const user = users.find(u => u.id === docId);
    const newRole = newIsAdmin ? "Admin" : "User";
    setRoleConfirm({ open: true, docId, newIsAdmin, text: `Are you sure you want to change ${user.username}'s role to ${newRole}?` });
  };
  const confirmRoleChange = async () => {
    const { docId, newIsAdmin } = roleConfirm;
    setRoleConfirm({ open: false, docId: null, newIsAdmin: false, text: "" });
    try {
      await updateUserRole(docId, newIsAdmin);
      notify("User role updated!", "success");
    } catch (err) {
      notify(`Error updating role: ${err.message}`, "error");
    }
  };
  
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, user: null });
  const requestDeleteUser = (user) => setDeleteConfirm({ open: true, user });
  const handleDeleteUser = async () => {
    const user = deleteConfirm.user;
    setDeleteConfirm({ open: false, user: null });
    setLoadingAction(true); 
    try {
      await deleteUser(user.id, user.authUID);
      notify("User deleted successfully.", "success");
    } catch (err) {
      notify(`Error deleting user: ${err.message}`, "error");
    } finally {
      setLoadingAction(false);
    }
  };
  
  const formatTime = (timestamp) => {
    if (!timestamp) return "N/A";
    if (timestamp.toDate) return timestamp.toDate().toLocaleString();
    return new Date(timestamp).toLocaleString();
  };

  const activeUsersCount = users.filter(user => user.isOnline).length; 

  return (
    <div className="dashboard"> 
      
      {/* --- Admin-Only Sidebar --- */}
      <aside className="sidebar">
        <div className="logo">
          <div>
            <h2>SLIDE-IT</h2>
          </div>
        </div>

        <nav className="sidebar-links">
          <div className="top-links">
            <Link to="/admin" className="admin-link active-admin">
              <i className="fa fa-shield" /> Admin Panel
            </Link>
          </div> 

          <div className="bottom-links">
            <div className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt className="icon" /> Logout
              {loggingOut && <div className="spinner-small"></div>}
            </div>
          </div>
        </nav>
      </aside>

      {/* --- Admin Main Content --- */}
      <main className="main">
        <div className="content">
          <div className="header">
            <h1>Admin Dashboard</h1>
            <p>Real-time user monitoring & analytics</p>
          </div>

          <div className="tools-grid">
  
            <div className="admin-stat-card">
              <div className="tool-icon users"> 
                <i className="fa fa-users" />
              </div>
              <h3 className="tool-title">Total Users</h3>
              <p className="admin-stat-number">{loading ? '...' : users.length}</p>
            </div>

            <div className="admin-stat-card">
              <div className="tool-icon active">
                <i className="fa fa-heartbeat" />
              </div>
              <h3 className="tool-title">Online Now</h3>
              <p className="admin-stat-number">{loading ? '...' : activeUsersCount}</p>
            </div>

            <div className="admin-stat-card">
              <div className="tool-icon conversions">
                <i className="fa fa-cogs" />
              </div>
              <h3 className="tool-title">Total Conversions</h3>
              <p className="admin-stat-number">{loading ? '...' : stats?.totalConversions || 0}</p>
            </div>
          </div>

          {/* Role Statistics Section */}
          <div className="admin-section-header">
            <h2>User Roles Distribution</h2>
          </div>
          <div className="tools-grid role-stats-grid">
            <div className="admin-stat-card role-card">
              <div className="tool-icon student">
                <i className="fa fa-graduation-cap" />
              </div>
              <h3 className="tool-title">Students</h3>
              <p className="admin-stat-number">{loading ? '...' : roleStats?.student || 0}</p>
            </div>

            <div className="admin-stat-card role-card">
              <div className="tool-icon educator">
                <i className="fa fa-university" />
              </div>
              <h3 className="tool-title">Educators</h3>
              <p className="admin-stat-number">{loading ? '...' : roleStats?.educator || 0}</p>
            </div>

            <div className="admin-stat-card role-card">
              <div className="tool-icon professional">
                <i className="fa fa-briefcase" />
              </div>
              <h3 className="tool-title">Professionals</h3>
              <p className="admin-stat-number">{loading ? '...' : roleStats?.professional || 0}</p>
            </div>

            <div className="admin-stat-card role-card">
              <div className="tool-icon other-role">
                <i className="fa fa-user" />
              </div>
              <h3 className="tool-title">Other</h3>
              <p className="admin-stat-number">{loading ? '...' : roleStats?.other || 0}</p>
            </div>

            <div className="admin-stat-card role-card">
              <div className="tool-icon not-set">
                <i className="fa fa-question-circle" />
              </div>
              <h3 className="tool-title">Not Set</h3>
              <p className="admin-stat-number">{loading ? '...' : roleStats?.notSet || 0}</p>
            </div>
          </div>

          <div className="admin-content-card">
            <h2>Feature Usage</h2>
            <h3>Most Used: {loading ? '...' : (stats?.mostUsedFeature?.name || 'N/A')}</h3>
            <ul className="feature-list">
              {loading ? <p>Loading...</p> : (
                stats && Object.entries(stats.allFeatures)
                  .filter(([name]) => name !== 'unknown')
                  .map(([name, count]) => (
                  <li key={name}>
                    <strong>{name}:</strong> {count} uses
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="admin-content-card">
            <div className="user-management-header">
              <h2>Real-Time User Monitoring</h2>
              <button className="add-user-btn" onClick={() => setIsModalOpen(true)}>
                <FaPlus /> Add New User
              </button>
            </div>
            
            {loading ? <p>Loading users...</p> : (
              <div className="user-table-container">
                <table className="user-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Last Login</th>
                      <th>Last Logout</th> 
                      <th>Actions</th> 
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>
                          {/* Real-time Status Indicator */}
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span 
                              style={{
                                height: "10px",
                                width: "10px",
                                borderRadius: "50%",
                                backgroundColor: user.isOnline ? "#2ecc71" : "#95a5a6",
                                display: "inline-block"
                              }}
                            ></span>
                            <span style={{ 
                              color: user.isOnline ? "#2ecc71" : "#7f8c8d",
                              fontWeight: "bold",
                              fontSize: "0.9rem"
                            }}>
                              {user.isOnline ? "Online" : "Offline"}
                            </span>
                          </div>
                        </td>
                        <td>{user.username}</td>
                        <td>{user.email}</td>
                        <td>
                          {/* FIX: Safely handle undefined isAdmin */}
                          <select 
                            className="role-select" 
                            value={(user.isAdmin || false).toString()} 
                            onChange={(e) => handleRoleChange(user.id, e.target.value === 'true')}
                            disabled={loadingAction} 
                          >
                            <option value="false">User</option>
                            <option value="true">Admin</option>
                          </select>
                        </td>
                        <td>{formatTime(user.lastLogin)}</td>
                        <td>{formatTime(user.lastLogout)}</td>
                        <td>
                          <button 
                            className="delete-user-btn"
                            onClick={() => requestDeleteUser(user)}
                            disabled={loadingAction}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal for Creating New User */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Add New User</h2>
            <form onSubmit={handleNewUserSubmit}>
              <div className="input-row"> 
                <div className="input-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={newUserData.firstName}
                    onChange={handleNewUserChange}
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={newUserData.lastName}
                    onChange={handleNewUserChange}
                    required
                  />
                </div>
              </div>
      
              <div className="input-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={newUserData.username}
                  onChange={handleNewUserChange}
                  required
                />
              </div>
              <div className="input-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={newUserData.email}
                  onChange={handleNewUserChange}
                  required
                />
              </div>
              <div className="input-group">
                <label htmlFor="birthday">Birthday</label>
                <input
                  type="date" 
                  id="birthday"
                  name="birthday"
                  value={newUserData.birthday}
                  onChange={handleNewUserChange}
                  required
                />
              </div>
              <div className="input-group">
                <label htmlFor="password">Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={newUserData.password}
                  onChange={handleNewUserChange}
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={newUserData.confirmPassword}
                  onChange={handleNewUserChange}
                  required
                />
                
                {/* Password Criteria Checklist */}
                <div style={{ marginTop: 12, fontSize: 13, color: '#444', lineHeight: 1.45, marginBottom: 12 }}>
                  <div style={{ marginBottom: 4 }}>Password must contain:</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                    {[
                      { key: 'length', label: 'At least 8 characters' },
                      { key: 'upper', label: 'One uppercase letter (A-Z)' },
                      { key: 'lower', label: 'One lowercase letter (a-z)' },
                      { key: 'digit', label: 'One number (0-9)' },
                      { key: 'noSpace', label: 'No spaces' },
                    ].map((rule) => (
                      <li key={rule.key} style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ color: pwdInfo[rule.key] ? '#16a34a' : '#dc2626', fontWeight: 600, minWidth: '15px' }}>
                          {pwdInfo[rule.key] ? '✓' : '✗'}
                        </span>
                        <span style={{ marginLeft: 4 }}>{rule.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="input-group-checkbox" style={{ marginBottom: 0 }}>
                  <input
                    type="checkbox"
                    id="showPassword"
                    checked={showPassword}
                    onChange={() => setShowPassword(!showPassword)}
                  />
                  <label htmlFor="showPassword">Show Password</label>
                </div>
              </div>
              <div className="input-group-checkbox">
                <input
                  type="checkbox"
                  id="isAdmin"
                  name="isAdmin"
                  checked={newUserData.isAdmin}
                  onChange={handleNewUserChange}
                />
                <label htmlFor="isAdmin">Make this user an Admin</label>
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={loadingAction}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={loadingAction}
                >
                  {loadingAction ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Logout"
        message="Are you sure you want to log out?"
        confirmText="Logout"
        cancelText="Cancel"
        onConfirm={confirmLogout}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
      <ConfirmDialog
        open={roleConfirm.open}
        title="Change Role"
        message={roleConfirm.text}
        confirmText="Change"
        cancelText="Cancel"
        onConfirm={confirmRoleChange}
        onCancel={() => setRoleConfirm({ open: false, docId: null, newIsAdmin: false, text: "" })}
      />
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete User"
        message={deleteConfirm.user ? `Delete ${deleteConfirm.user.username} (${deleteConfirm.user.email})? This action cannot be undone.` : "Delete this user?"}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteUser}
        onCancel={() => setDeleteConfirm({ open: false, user: null })}
      />
    </div>
  );
}
