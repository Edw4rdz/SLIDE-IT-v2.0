import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import { 
  fetchAllUsers, 
  fetchAnalytics, 
  createUser, 
  deleteUser, 
  updateUserRole 
} from "../adminApi";
import "./adminDashboard.css"; 


import { FaSignOutAlt, FaPlus } from "react-icons/fa"; 
import { getAuth, signOut } from "firebase/auth";
import "font-awesome/css/font-awesome.min.css";


const INITIAL_NEW_USER_STATE = {
  username: "",
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  birthday: "",
  isAdmin: false
};

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // --- New State for Modal ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState(INITIAL_NEW_USER_STATE);
  const [loadingAction, setLoadingAction] = useState(false); // For modal/delete
  
  // --- Sidebar Logic ---
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");
    if (!confirmLogout) return;

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
  // --- End of sidebar logic ---
  
  const loadAdminData = async () => {
    setLoading(true); 
    setError(null);
    try {
      const [usersData, analyticsData] = await Promise.all([
        fetchAllUsers(),
        fetchAnalytics()
      ]);
      setUsers(usersData.users || []);
      setStats(analyticsData);
    } catch (err) {
      console.error("Failed to load admin data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to only refresh the user list
  const refreshUsers = async () => {
    try {
      const usersData = await fetchAllUsers();
      setUsers(usersData.users || []);
    } catch (err) {
      alert(`Error refreshing users: ${err.message}`);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // --- Modal Handlers ---
  const handleNewUserChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewUserData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleNewUserSubmit = async (e) => {
    e.preventDefault();
    // --- MODIFIED: Updated validation ---
    if (!newUserData.email || !newUserData.password || !newUserData.username || !newUserData.firstName || !newUserData.lastName || !newUserData.birthday) {
      return alert("Please fill out all fields.");
    }
    setLoadingAction(true);
    try {
      const newUser = await createUser(newUserData);
      setUsers(prevUsers => [newUser, ...prevUsers]); 
      setIsModalOpen(false);
      setNewUserData(INITIAL_NEW_USER_STATE);
    } catch (err) {
      alert(`Error creating user: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  // --- Table Action Handlers ---
  const handleRoleChange = async (docId, newIsAdmin) => {
 
    const user = users.find(u => u.id === docId);
    const newRole = newIsAdmin ? "Admin" : "User";
    
    if (!window.confirm(`Are you sure you want to change ${user.username}'s role to ${newRole}?`)) {
    
      refreshUsers();
      return;
    }
    
    try {
      await updateUserRole(docId, newIsAdmin);

      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === docId ? { ...u, isAdmin: newIsAdmin } : u
        )
      );
      alert("User role updated!");
    } catch (err) {
      alert(`Error updating role: ${err.message}`);
      refreshUsers(); 
    }
  };
  
  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete ${user.username} (${user.email})? This action cannot be undone.`)) {
      return;
    }
    
    setLoadingAction(true); 
    try {
      await deleteUser(user.id, user.authUID);
     
      setUsers(prevUsers => prevUsers.filter(u => u.id !== user.id));
      alert("User deleted successfully.");
    } catch (err) {
      alert(`Error deleting user: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };
  

  
  const activeUsers = users.filter(user => user.status === 'active').length;

  return (

    <div className="dashboard"> 
      
      {/* --- Admin-Only Sidebar --- */}
      <aside className="sidebar">
        <div className="fa fa-magic logo">
          <div>
            <h2>SLIDE-IT</h2>
            <p>Admin Panel</p> 
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
            <p>App analytics and user management</p>
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
              <h3 className="tool-title">Active Users (30d)</h3>
              <p className="admin-stat-number">{loading ? '...' : activeUsers}</p>
            </div>

            <div className="admin-stat-card">
              <div className="tool-icon conversions">
                <i className="fa fa-cogs" />
              </div>
              <h3 className="tool-title">Total Conversions</h3>
              <p className="admin-stat-number">{loading ? '...' : stats?.totalConversions || 0}</p>
            </div>
          </div>
          <div className="admin-content-card">
            <h2>Feature Usage</h2>
            <h3>Most Used: {loading ? '...' : (stats?.mostUsedFeature?.name || 'N/A')}</h3>
            <ul className="feature-list">
              {loading ? <p>Loading...</p> : (
                stats && Object.entries(stats.allFeatures).map(([name, count]) => (
                  <li key={name}>
                    <strong>{name}:</strong> {count} uses
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="admin-content-card">
            <div className="user-management-header">
              <h2>User Management</h2>
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
                      <th>Actions</th> 
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <span className={`status-dot ${user.status}`}></span>
                          {user.status}
                        </td>
                        <td>{user.username}</td>
                        <td>{user.email}</td>
                        <td>
                          <select 
                            className="role-select" 
                            value={user.isAdmin.toString()}
                            onChange={(e) => handleRoleChange(user.id, e.target.value === 'true')}
                            disabled={loadingAction} 
                          >
                            <option value="false">User</option>
                            <option value="true">Admin</option>
                          </select>
                        </td>
                        <td>
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never"}
                        </td>
                        <td>
                          <button 
                            className="delete-user-btn"
                            onClick={() => handleDeleteUser(user)}
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

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Add New User</h2>
            <form onSubmit={handleNewUserSubmit}>

              {/* --- NEW: First and Last Name Inputs --- */}
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
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={newUserData.password}
                  onChange={handleNewUserChange}
                  required
                />
              </div>

              {/* --- Birthday Input --- */}
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
    </div>
  );
}