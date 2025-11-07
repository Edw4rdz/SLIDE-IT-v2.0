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
import { collection, query, where, getDocs } from "firebase/firestore";
import "../styles/settings.css";
import Sidebar from "../components/Sidebar";

export default function Settings() {
  const navigate = useNavigate();
  const auth = getAuth();

  const [loading, setLoading] = useState(true);
  const [conversionCount, setConversionCount] = useState(0);

  // Profile info
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    birthday: "",
  });

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

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

          const fullName = `${data.firstName || ""} ${data.lastName || ""}`.trim();
          const birthday = data.birthday
            ? new Date(data.birthday).toISOString().split("T")[0]
            : "";

          setProfile({
            fullName,
            email: data.email || user.email || "",
            birthday,
          });
        } else {
          setProfile({
            fullName: user.displayName || "",
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

          <div className="settings-grid single">
            <div className="settings-card">
              <h2>USER INFORMATION</h2>

              {/* Profile Info */}
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={profile.fullName} readOnly />
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
          </div>
        </div>
      </main>
    </div>
  );
}
