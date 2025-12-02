import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaSignOutAlt, FaUpload } from "react-icons/fa";
import { getAuth, signOut } from "firebase/auth";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./Sidebar.css";

// Unified imports (Removed duplicates)
import { 
  getFirestore, 
  doc, 
  updateDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  getDocs 
} from "firebase/firestore";
import ConfirmDialog from "../components/ConfirmDialog";
import { notify } from "../utils/notify";

// We accept 'activePage' and 'isAdmin' as props
export default function Sidebar({ activePage, isAdmin }) {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const handleLogout = () => setConfirmOpen(true);
  const confirmLogout = async () => {
    setConfirmOpen(false);
    setLoggingOut(true);
    const auth = getAuth();
    const db = getFirestore();
    const user = auth.currentUser;
    try {
      if (user) {
        let userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDocs(query(collection(db, "users"), where("authUID", "==", user.uid)));
        if (!userDocSnap.empty) {
          userDocRef = doc(db, "users", userDocSnap.docs[0].id);
        }
        await updateDoc(userDocRef, { isOnline: false, lastLogout: serverTimestamp() });
      }
      await signOut(auth);
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");
      notify("Logged out successfully.", "success");
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
      try { await signOut(auth); } catch {}
      localStorage.removeItem("user");
      navigate("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <aside className="sidebar">
      <div className="logo">
        <div>
          <h2>SLIDE-IT</h2>
          <p className="subtext">Convert & Generate</p>
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
            <FaUpload className="icon" /> Manage Template
          </Link>
        </div>

        {/* Logout always at bottom */}
        <div className="bottom-links">
          <button
            className="logout-btn"
            type="button"
            onClick={handleLogout}
            aria-label="Logout"
          >
            <FaSignOutAlt className="icon" />
            <span className="logout-text">Logout</span>
            {loggingOut && <div className="spinner-small" aria-hidden="true"></div>}
          </button>
        </div>
      </nav>
      <ConfirmDialog
        open={confirmOpen}
        title="Logout"
        message="Are you sure you want to log out?"
        confirmText="Logout"
        cancelText="Cancel"
        onConfirm={confirmLogout}
        onCancel={() => setConfirmOpen(false)}
      />
    </aside>
  );
}

// Render confirm dialog near component root
// eslint-disable-next-line react/no-unknown-property
//