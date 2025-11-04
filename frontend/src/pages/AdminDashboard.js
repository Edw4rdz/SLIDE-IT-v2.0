import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchAllUsers, fetchAnalytics } from "../adminApi";
import "./adminDashboard.css"; // We will update this file

// --- Imports needed for the sidebar ---
import { FaSignOutAlt } from "react-icons/fa";
import { getAuth, signOut } from "firebase/auth";
import "font-awesome/css/font-awesome.min.css";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Logic needed for the sidebar ---
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

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        setLoading(true);
        setError(null);
        
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

    loadAdminData();
  }, []);

  // Helper to calculate active users
  const activeUsers = users.filter(user => user.status === 'active').length;

  return (
    // Use the same layout as Dashboard.js
    <div className="dashboard"> 
      
      {/* --- MODIFIED Admin-Only Sidebar --- */}
      <aside className="sidebar">
        <div className="fa fa-magic logo">
          <div>
            <h2>SLIDE-IT</h2>
            <p>Admin Panel</p> 
          </div>
        </div>

        <nav className="sidebar-links">
          <div className="top-links">
            {/* Link 1: The active admin panel link */}
            <Link to="/admin" className="admin-link active-admin">
              <i className="fa fa-shield" /> Admin Panel
            </Link>
            
            {/* "Back to App" link is now REMOVED */}

          </div> 

          <div className="bottom-links">
            <div className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt className="icon" /> Logout
              {loggingOut && <div className="spinner-small"></div>}
            </div>
          </div>
        </nav>
      </aside>
      {/* --- End of Sidebar --- */}

      {/* --- Admin Main Content (Unchanged) --- */}
      <main className="main">
        <div className="content">
          <div className="header">
            <h1>Admin Dashboard</h1>
            <p>App analytics and user management</p>
          </div>

          {/* Analytics "Tool Card" Grid */}
          <div className="tools-grid">
            {/* Card 1: Total Users */}
            <div className="admin-stat-card">
              <div className="tool-icon users"> {/* Re-using 'tool-icon' class */}
                <i className="fa fa-users" />
              </div>
              <h3 className="tool-title">Total Users</h3>
              <p className="admin-stat-number">{loading ? '...' : users.length}</p>
            </div>

            {/* Card 2: Active Users */}
            <div className="admin-stat-card">
              <div className="tool-icon active">
                <i className="fa fa-heartbeat" />
              </div>
              <h3 className="tool-title">Active Users (30d)</h3>
              <p className="admin-stat-number">{loading ? '...' : activeUsers}</p>
            </div>

            {/* Card 3: Total Conversions */}
            <div className="admin-stat-card">
              <div className="tool-icon conversions">
                <i className="fa fa-cogs" />
              </div>
              <h3 className="tool-title">Total Conversions</h3>
              <p className="admin-stat-number">{loading ? '...' : stats?.totalConversions || 0}</p>
            </div>
          </div>

          {/* Feature Breakdown Card */}
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

          {/* User Table Card */}
          <div className="admin-content-card">
            <h2>User Management</h2>
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
                        <td>{user.isAdmin ? <span className="admin-badge">Admin</span> : "User"}</td>
                        <td>
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never"}
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
    </div>
  );
}