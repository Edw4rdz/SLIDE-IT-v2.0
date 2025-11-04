import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchAllUsers, fetchAnalytics } from "../adminApi"; // Our new API helper
import "./adminDashboard.css"; // We will create this CSS file next

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch both sets of data in parallel
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

  if (loading) {
    return <div className="admin-container"><h1>Loading Admin Dashboard...</h1></div>;
  }

  // If we get an error (e.g., user is not an admin), show it.
  if (error) {
    return (
      <div className="admin-container">
        <h1>Access Denied</h1>
        <p>{error}</p>
        <Link to="/dashboard">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <Link to="/dashboard">Back to Main Dashboard</Link>
      </header>
      
      {/* Feature Usage Insights */}
      <section className="admin-section">
        <h2>App Usage Analytics</h2>
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Conversions</h3>
              <p>{stats.totalConversions}</p>
            </div>
            <div className="stat-card">
              <h3>Most Used Feature</h3>
              <p>{stats.mostUsedFeature?.name} ({stats.mostUsedFeature?.count} uses)</p>
            </div>
            <div className="stat-card full-width">
              <h3>Feature Breakdown</h3>
              <ul className="feature-list">
                {Object.entries(stats.allFeatures).map(([name, count]) => (
                  <li key={name}>
                    <strong>{name}:</strong> {count} uses
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* User List */}
      <section className="admin-section">
        <h2>Registered Users ({users.length})</h2>
        <div className="user-table-container">
          <table className="user-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Auth UID</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.isAdmin ? <span className="admin-badge">Admin</span> : "User"}</td>
                  <td>{user.authUID}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}