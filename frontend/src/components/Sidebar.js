import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaSignOutAlt, FaUpload } from "react-icons/fa";
import { getAuth, signOut } from "firebase/auth";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./Sidebar.css"; // We will create this CSS file next

// We accept 'activePage' and 'isAdmin' as props
export default function Sidebar({ activePage, isAdmin }) {
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

  return (
    <aside className="sidebar">
      <div className="fa fa-magic logo">
        <div>
          <h2>SLIDE-IT</h2>
          <p>Convert & Generate</p>
        </div>
      </div>

      <nav className="sidebar-links">
        <div className="top-links">
          {/* We use the 'activePage' prop to set the "active" class */}
          <Link
            to="/dashboard"
            className={activePage === "dashboard" ? "active" : ""}
          >
            <i className="fa fa-home" /> Dashboard
          </Link>
          <Link
            to="/conversion"
            className={activePage === "drafts" ? "active" : ""}
          >
            <i className="fa fa-history" /> Drafts
          </Link>
          <Link
            to="/settings"
            className={activePage === "settings" ? "active" : ""}
          >
            <i className="fa fa-cog" /> Settings
          </Link>

          {/* We use the 'isAdmin' prop to show/hide the admin link */}
          {isAdmin && (
            <Link to="/admin" className="admin-link">
              <i className="fa fa-shield" /> Admin Panel
            </Link>
          )}

          {/* Upload Template Button */}
          <Link to="/uploadTemplate" className="upload-btn">
            <FaUpload className="icon" /> Upload Template
          </Link>
        </div>

        {/* Logout always at bottom */}
        <div className="bottom-links">
          <div className="logout-btn" onClick={handleLogout}>
            <FaSignOutAlt className="icon" /> Logout
            {loggingOut && <div className="spinner-small"></div>}
          </div>
        </div>
      </nav>
    </aside>
  );
}