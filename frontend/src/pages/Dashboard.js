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
} from "firebase/firestore";
import { db } from "../firebase"; 
import "../styles/dashboard.css";
import "font-awesome/css/font-awesome.min.css";
import Sidebar from "../components/Sidebar"; 

const tools = [
  { title: "AI PowerPoint Generator", desc: "Create professional slides from any topic using AI.", icon: "fa-cogs", colorClass: "plus", path: "/ai-generator" },
  { title: "PDF to PPT", desc: "Convert PDF files into editable PowerPoint presentations.", icon: "fa-file-pdf-o", colorClass: "pdf", path: "/pdftoppt" },
  { title: "Word to PPT", desc: "Convert Word documents into engaging presentations.", icon: "fa-file-word-o", colorClass: "word", path: "/wordtoppt" },
  { title: "Text to PPT", desc: "Turn plain text files into styled slides quickly.", icon: "fa-file-text-o", colorClass: "text", path: "/texttoppt" },
  { title: "Excel to PPT", desc: "Convert Excel data into presentation-ready charts and tables.", icon: "fa-file-excel-o", colorClass: "excel", path: "/exceltoppt" },
];

export default function Dashboard() {
  const [userName, setUserName] = useState("Loading...");
  const [isAdmin, setIsAdmin] = useState(false); 

 
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
        </div>
      </main>
    </div>
  );
}