import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserCog, FaHistory } from "react-icons/fa";
import {
  getAuth,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { db } from "../firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { getHistory } from "../api";
import "../styles/settings.css";
import Sidebar from "../components/Sidebar";

export default function Settings() {
  const navigate = useNavigate();
  const auth = getAuth();

  const [loading, setLoading] = useState(true);
  const [conversionCount, setConversionCount] = useState(0);

  // Profile info
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    birthday: "",
  });

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Feedback form state
  const [fbCategory, setFbCategory] = useState("bug");
  const [fbRating, setFbRating] = useState(5);
  const [fbTitle, setFbTitle] = useState("");
  const [fbMessage, setFbMessage] = useState("");
  const [fbContactEmail, setFbContactEmail] = useState("");
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [fbStatus, setFbStatus] = useState({ type: "", text: "" });

  useEffect(() => {
    const fetchUserProfile = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/login");
        return;
      }

      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("authUID", "==", user.uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data();

          const birthday = data.birthday
            ? new Date(data.birthday).toISOString().split("T")[0]
            : "";

          setProfile({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            email: data.email || user.email || "",
            birthday,
          });
        } else {
          const displayName = user.displayName || "";
          const [firstName = "", lastName = ""] = displayName.split(" ");
          
          setProfile({
            firstName,
            lastName,
            email: user.email || "",
            birthday: "",
          });
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        alert("Failed to load user profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [auth, navigate]);

  // Fetch user's conversion count (uses backend /api/conversions)
  useEffect(() => {
    const fetchConversionCount = async () => {
      try {
        // Prefer the frontend's local user (set at login). Fallback to Firebase UID.
        const local = localStorage.getItem("user");
        const localUser = local ? JSON.parse(local) : null;
        const userId = localUser?.user_id || (auth.currentUser ? auth.currentUser.uid : null);
        if (!userId) return; // nothing to fetch

        const res = await getHistory(userId);
        const list = res?.data || [];
        setConversionCount(Array.isArray(list) ? list.length : 0);
      } catch (err) {
        console.error("Failed to fetch conversion count:", err);
      }
    };

    fetchConversionCount();
    // We intentionally do not re-run on every render; only when auth object changes
  }, [auth]);

  // ✅ Update password (with both fields)
  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert("New password must be at least 6 characters.");
      return;
    }

    if (!currentPassword) {
      alert("Please enter your current password.");
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) return navigate("/login");

      // Reauthenticate first
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      alert("✅ Password updated successfully!");
      setNewPassword("");
      setCurrentPassword("");
    } catch (err) {
      console.error("Error updating password:", err);
      alert("❌ Failed to update password. Please check your current password and try again.");
    }
  };

  // Feedback submit handler - saves to Firestore `feedback` collection
  const handleFeedbackSubmit = async (e) => {
    e && e.preventDefault();

    // Basic validation
    if (!fbMessage || fbMessage.trim().length < 5) {
      setFbStatus({ type: "error", text: "Please enter a helpful message (min 5 characters)." });
      return;
    }

    setFbSubmitting(true);
    setFbStatus({ type: "", text: "" });

    try {
      const payload = {
        createdAt: serverTimestamp(),
        userId: auth.currentUser ? auth.currentUser.uid : null,
        userEmail: fbContactEmail || (auth.currentUser ? auth.currentUser.email : null),
        page: "/settings",
        pageMeta: null,
        category: fbCategory,
        rating: Number(fbRating) || null,
        title: fbTitle || null,
        message: fbMessage,
        userAgent: navigator.userAgent || null,
        appVersion: process.env.REACT_APP_VERSION || null,
        resolved: false,
      };

      await addDoc(collection(db, "feedback"), payload);

      setFbStatus({ type: "success", text: "Thanks — your feedback has been submitted." });
      // clear fields
      setFbCategory("bug");
      setFbRating(5);
      setFbTitle("");
      setFbMessage("");
      setFbContactEmail("");
    } catch (err) {
      console.error("Failed to submit feedback:", err);
      setFbStatus({ type: "error", text: "Failed to submit feedback. Please try again later." });
    } finally {
      setFbSubmitting(false);
    }
  };

  if (loading) return <div>Loading profile...</div>;

  return (
    <div className="dashboard">
      <Sidebar activePage="settings" />

      <main className="settings-main">
        <div className="settings-container">
          <header className="settings-header">
            <div className="header-icon">⚙️</div>
            <div>
              <h1>User Profile & Settings</h1>
              <p>Manage your profile and app settings.</p>
            </div>
          </header>

          <div className="settings-grid">
            <div className="settings-card">
              <h2>USER INFORMATION</h2>

              {/* Profile Info */}
              <div className="form-group">
                <label>First Name</label>
                <input type="text" value={profile.firstName} readOnly />
              </div>

              <div className="form-group">
                <label>Last Name</label>
                <input type="text" value={profile.lastName} readOnly />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input type="email" value={profile.email} readOnly />
              </div>

              <div className="form-group">
                <label>Birthday</label>
                <input type="date" value={profile.birthday} readOnly />
              </div>

              {/* ✅ Added current password field above new password */}
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              {/* Conversion history */}
              <div className="form-group readonly">
                <label>Conversion History</label>
                <div className="readonly-box">
                  <FaHistory className="icon" />
                  <span>{conversionCount} total conversions</span>
                </div>
              </div>

              {/* Save Button */}
              <button className="save-btn" onClick={handlePasswordChange}>
                Update Password
              </button>
            </div>

            {/* Feedback column - placed beside User Info */}
            <div className="settings-card feedback-card">
              <h2>Send Feedback</h2>

              <form onSubmit={handleFeedbackSubmit}>
                <div className="form-group">
                  <label>Category</label>
                  <select value={fbCategory} onChange={(e) => setFbCategory(e.target.value)}>
                    <option value="bug">Bug</option>
                    <option value="feature">Feature</option>
                    <option value="ui">UI</option>
                    <option value="performance">Performance</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Rating</label>
                  <select value={fbRating} onChange={(e) => setFbRating(e.target.value)}>
                    <option value={5}>5</option>
                    <option value={4}>4</option>
                    <option value={3}>3</option>
                    <option value={2}>2</option>
                    <option value={1}>1</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Title (short)</label>
                  <input type="text" value={fbTitle} onChange={(e) => setFbTitle(e.target.value)} placeholder="Short summary" />
                </div>

                <div className="form-group">
                  <label>Message</label>
                  <textarea value={fbMessage} onChange={(e) => setFbMessage(e.target.value)} placeholder="Describe what's happening..." rows={6} />
                </div>

                <div className="form-group">
                  <label>Your contact email (optional)</label>
                  <input type="email" value={fbContactEmail} onChange={(e) => setFbContactEmail(e.target.value)} placeholder="If you want us to follow up" />
                </div>

                {fbStatus.text && (
                  <div style={{ marginBottom: 10, color: fbStatus.type === 'error' ? '#c0392b' : 'green' }}>{fbStatus.text}</div>
                )}

                <button className="save-btn" type="submit" disabled={fbSubmitting}>
                  {fbSubmitting ? 'Sending...' : 'Submit Feedback'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
