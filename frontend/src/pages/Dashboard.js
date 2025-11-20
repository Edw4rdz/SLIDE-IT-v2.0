import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged} from "firebase/auth"; 
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase"; 
import "../styles/dashboard.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import Sidebar from "../components/Sidebar"; 

const tools = [
  { title: "AI PowerPoint Generator", desc: "Create professional slides from any topic using AI.", icon: "fas fa-robot", colorClass: "plus", path: "/ai-generator" },
    { title: "PDF to PPT", desc: "Convert PDF files into editable PowerPoint presentations.", icon: "fas fa-file-pdf", colorClass: "pdf", path: "/pdftoppt" },
    { title: "Word to PPT", desc: "Convert Word documents into engaging presentations.", icon: "fas fa-file-word", colorClass: "word", path: "/wordtoppt" },
    { title: "Text to PPT", desc: "Turn plain text files into styled slides quickly.", icon: "fas fa-file-alt", colorClass: "text", path: "/texttoppt" },
    { title: "Excel to PPT", desc: "Convert Excel data into presentation-ready charts and tables.", icon: "fas fa-file-excel", colorClass: "excel", path: "/exceltoppt" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("Loading...");
    // Redirect to login if not authenticated
    useEffect(() => {
      const user = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (!user) {
        navigate('/login', { replace: true });
      }
    }, [navigate]);
  const [isAdmin, setIsAdmin] = useState(false); 
  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);

 
  const tryCachedUser = () => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return null;
      const parsed = JSON.parse(raw);

      if (parsed) return parsed; 
    } catch (e) {
      console.error("Error parsing cached user:", e);
    }
    return null;
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserName("Unknown User");
        setIsAdmin(false); 
        return;
      }

      // 1️⃣ Quick: try cached localStorage user
      const cached = tryCachedUser(); 
      if (cached && cached.username) {
        setUserName(cached.username);
      } else {
        setUserName("Loading...");
      }

      // Check cache for admin flag
      if (cached?.isAdmin === true) {
        setIsAdmin(true);
      }

      try {
        // 2️⃣ Try to get a document with ID = auth.uid
        const byUidRef = doc(db, "users", user.uid);
        const byUidSnap = await getDoc(byUidRef);

        if (byUidSnap.exists()) {
          const data = byUidSnap.data();
          if (data.isAdmin === true) setIsAdmin(true); 
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
              isAdmin: data.isAdmin || false 
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
          if (data.isAdmin === true) setIsAdmin(true); 
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
              isAdmin: data.isAdmin || false 
            })
          );
          return;
        }

        // 4️⃣ Fallback
        setIsAdmin(false); 
        const fallback = user.displayName || user.email || "User";
        setUserName(fallback);
        localStorage.setItem(
          "user",
          JSON.stringify({
            username: fallback,
            email: user.email,
            user_id: user.uid,
            isAdmin: false 
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

  // Load recent feedbacks (real-time)
  useEffect(() => {
    setLoadingFeedbacks(true);
    try {
      const q = query(
        collection(db, "feedback"),
        orderBy("createdAt", "desc"),
        limit(12)
      );

      const unsub = onSnapshot(q, (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setFeedbacks(items);
        setLoadingFeedbacks(false);
      }, (err) => {
        console.error("Feedback realtime error:", err);
        setLoadingFeedbacks(false);
      });

      return () => unsub();
    } catch (err) {
      console.error("Failed to subscribe to feedbacks:", err);
      setLoadingFeedbacks(false);
    }
  }, []);

  // Helper: mask user identifier (first letters + stars)
  const maskUser = (raw) => {
    if (!raw) return "A***";
    // if it's an email, use local part
    const local = raw.includes("@") ? raw.split("@")[0] : raw;
    const visible = local.slice(0, 2);
    return visible + "***";
  };

  const formatTime = (ts) => {
    try {
      if (!ts) return "";
      // Firestore Timestamp
      if (ts.toDate) return ts.toDate().toLocaleString();
      // fallback: assume ISO or epoch
      const d = new Date(ts);
      if (!isNaN(d)) return d.toLocaleString();
    } catch (e) {}
    return "";
  };

  // const handleLogout = async () => { ... }; // <-- 3. REMOVED (Sidebar handles this)

  return (
    <div className="dashboard">
      
      {/* Sidebar Component */}
      <Sidebar activePage="dashboard" isAdmin={isAdmin} />

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

          {/* Community Feedback (moved below tools) */}
          <div className="feedback-section">
            <div className="feedback-header">
              <h2>Community Feedback</h2>
              <p className="muted">Recent feedback from other users (names partially masked)</p>
            </div>

            <div className="feedback-list">
              {loadingFeedbacks ? (
                <div className="muted">Loading feedback…</div>
              ) : feedbacks.length === 0 ? (
                <div className="muted">No feedback yet — be the first to send one!</div>
              ) : (
                feedbacks.map((fb) => (
                  <div key={fb.id} className="feedback-card-mini">
                    <div className="meta">
                      <strong className="who">{maskUser(fb.userEmail || fb.userId)}</strong>
                      <span className="dot">•</span>
                      <span className="cat">{fb.category || "other"}</span>
                      {fb.rating ? <span className="rating"> · {fb.rating}★</span> : null}
                      <span className="time">{formatTime(fb.createdAt)}</span>
                    </div>
                    {fb.title ? <div className="f-title">{fb.title}</div> : null}
                    <div className="f-message">{(fb.message || "").length > 160 ? (fb.message || "").slice(0,160) + '…' : fb.message}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}