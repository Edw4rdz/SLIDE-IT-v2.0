import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaSignOutAlt, FaUpload } from "react-icons/fa";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase"; // adjust path if needed
import "./dashboard.css";
import "font-awesome/css/font-awesome.min.css";

const tools = [
  { title: "AI PowerPoint Generator", desc: "Create professional slides from any topic using AI.", icon: "fa-cogs", colorClass: "plus", path: "/ai-generator" },
  { title: "PDF to PPT", desc: "Convert PDF files into editable PowerPoint presentations.", icon: "fa-file-pdf-o", colorClass: "pdf", path: "/pdftoppt" },
  { title: "Word to PPT", desc: "Convert Word documents into engaging presentations.", icon: "fa-file-word-o", colorClass: "word", path: "/wordtoppt" },
  { title: "Text to PPT", desc: "Turn plain text files into styled slides quickly.", icon: "fa-file-text-o", colorClass: "text", path: "/texttoppt" },
  { title: "Excel to PPT", desc: "Convert Excel data into presentation-ready charts and tables.", icon: "fa-file-excel-o", colorClass: "excel", path: "/exceltoppt" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [userName, setUserName] = useState("Loading...");
  const [isAdmin, setIsAdmin] = useState(false); // <-- NEW: Added isAdmin STATE

  // <-- FIX: RE-ADDED THE MISSING FUNCTION -->
  // Try to read cached user first (fast)
  const tryCachedUser = () => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // We return the full parsed object now
      if (parsed) return parsed; 
    } catch (e) {
      // ignore parse errors
    }
    return null;
  };
  // <-- END OF FIX -->

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserName("Unknown User");
        setIsAdmin(false); // <-- NEW: Make sure to reset
        return;
      }

      // 1️⃣ Quick: try cached localStorage user
      const cached = tryCachedUser(); // <-- This call will now work
      if (cached && cached.username) {
        setUserName(cached.username);
      } else {
        setUserName("Loading...");
      }

      // <-- NEW: Check cache for admin flag -->
      if (cached?.isAdmin === true) {
        setIsAdmin(true);
      }
      // <-- End of new logic -->

      try {
        // 2️⃣ Try to get a document with ID = auth.uid
        const byUidRef = doc(db, "users", user.uid);
        const byUidSnap = await getDoc(byUidRef);

        if (byUidSnap.exists()) {
          const data = byUidSnap.data();
          if (data.isAdmin === true) setIsAdmin(true); // <-- NEW: SET ADMIN
          const username =
            data.username ||
            data.name ||
            data.fullName ||
            data.displayName ||
            "User";
          setUserName(username);
          // cache for faster load next time
          localStorage.setItem(
            "user",
            JSON.stringify({
              username,
              email: data.email || user.email,
              user_id: user.uid,
              isAdmin: data.isAdmin || false // <-- NEW: Cache admin status
            })
          );
          return;
        }

        // 3️⃣ If not found, query where authUID == user.uid
        const usersCol = collection(db, "users");
        const q = query(usersCol, where("authUID", "==", user.uid));
        const qSnap = await getDocs(q);

        if (!qSnap.empty) {
          const docSnap = qSnap.docs[0];
          const data = docSnap.data();
          if (data.isAdmin === true) setIsAdmin(true); // <-- NEW: SET ADMIN
          const username =
            data.username ||
            data.name ||
            data.fullName ||
            data.displayName ||
            "User";
          setUserName(username);
          // cache
          localStorage.setItem(
            "user",
            JSON.stringify({
              username,
              email: data.email || user.email,
              user_id: docSnap.id,
              isAdmin: data.isAdmin || false // <-- NEW: Cache admin status
            })
          );
          return;
        }

        // 4️⃣ Fallback
        setIsAdmin(false); // <-- NEW: Fallback, not an admin
        const fallback = user.displayName || user.email || "User";
        setUserName(fallback);
        localStorage.setItem(
          "user",
          JSON.stringify({
            username: fallback,
            email: user.email,
            user_id: user.uid,
            isAdmin: false // <-- NEW: Cache admin status
          })
        );
      } catch (err) {
        console.error("Error fetching user info for dashboard:", err);
        if (!userName || userName === "Loading...") {
          setUserName(user.displayName || user.email || "User");
        }
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="fa fa-magic logo">
          <div>
            <h2>SLIDE-IT</h2>
            <p>Convert & Generate</p>
          </div>
        </div>

        <nav className="sidebar-links">
          <div className="top-links">
            <Link to="/dashboard" className="active">
              <i className="fa fa-home" /> Dashboard
            </Link>
            <Link to="/conversion">
              <i className="fa fa-history" /> Drafts
            </Link>
            <Link to="/settings">
              <i className="fa fa-cog" /> Settings
            </Link>

            {/* <-- NEW: ADD THE CONDITIONAL ADMIN LINK --> */}
            {isAdmin && (
              <Link to="/admin" className="admin-link">
                <i className="fa fa-shield" /> Admin Panel
              </Link>
            )}
            {/* <-- End of new link --> */}

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

      {/* Main Content */}
      <main className="main">
        <div className="content">
          <div className="header">
            <h1>
              <span>✨ Welcome</span> {userName}
            </h1>
            <p>Choose a tool below to get started</p>
          </div>

          <div className="tools-grid">
            {tools.map((tool, index) => (
              <Link key={index} to={tool.path} className="tool-card-link">
                <div className="tool-card">
                  <div className={`tool-icon ${tool.colorClass}`}>
                    <i className={`fa ${tool.icon}`} />
                  </div>
                  <h3 className="tool-title">{tool.title}</h3>
                  <p className="tool-desc">{tool.desc}</p>
                  <span className="tool-arrow">
                    <i className="fa fa-arrow-right" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}