import React, { useState, useEffect } from "react";
import { notify } from "../utils/notify";
import { useNavigate } from "react-router-dom";
import { FaHistory } from "react-icons/fa";
import {
  getAuth,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut,
} from "firebase/auth";
import { db } from "../firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { getHistory } from "../api";
import "../styles/settings.css";
import Sidebar from "../components/Sidebar";
import RoleSelectionModal from "../components/RoleSelectionModal";

export default function Settings() {
  const navigate = useNavigate();
  const auth = getAuth();

  const [loading, setLoading] = useState(true);
  const [conversionCount, setConversionCount] = useState(0);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [userDocId, setUserDocId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [originalProfile, setOriginalProfile] = useState(null);
  const [isGoogleOnlyUser, setIsGoogleOnlyUser] = useState(false);

  // Profile info
  const [profile, setProfile] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    birthday: "",
    role: "",
    roleDescription: "",
  });

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [fbCategory, setFbCategory] = useState("bug");
  const [fbRating, setFbRating] = useState(5);
  const [fbTitle, setFbTitle] = useState("");
  const [fbMessage, setFbMessage] = useState("");
  const [fbContactEmail, setFbContactEmail] = useState("");
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [fbStatus, setFbStatus] = useState({ type: "", text: "" });

  // Password policy validators (same as signup)
  const evaluatePassword = (pwd) => ({
    length: typeof pwd === "string" && pwd.length >= 8,
    upper: /[A-Z]/.test(pwd || ""),
    lower: /[a-z]/.test(pwd || ""),
    digit: /\d/.test(pwd || ""),
    noSpace: !/\s/.test(pwd || ""),
  });

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditClick = () => {
    setOriginalProfile(profile);
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setProfile(originalProfile);
    setIsEditing(false);
    setOriginalProfile(null);
  };

  const handleProfileUpdate = async () => {
    if (!userDocId) {
      notify("Could not find user profile to update.", "error");
      return;
    }

    try {
      const userRef = doc(db, "users", userDocId);
      const dataToUpdate = {
        username: profile.username,
        firstName: profile.firstName,
        lastName: profile.lastName,
        birthday: profile.birthday ? new Date(profile.birthday) : null,
      };
      await updateDoc(userRef, dataToUpdate);
      notify("Profile updated successfully!", "success");

      // Update local storage to reflect the new username
      const localUser = JSON.parse(localStorage.getItem("user"));
      if (localUser) {
        localUser.username = profile.username;
        localStorage.setItem("user", JSON.stringify(localUser));
      }

      setIsEditing(false);
      setOriginalProfile(null);
    } catch (err) {
      console.error("Error updating profile:", err);
      notify("Failed to update profile.", "error");
    }
  };

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
          const docSnapshot = querySnapshot.docs[0];
          const data = docSnapshot.data();
          setUserDocId(docSnapshot.id);

          // Check if user is Google-only (has 'name' but no 'firstName' AND no password set)
          const hasPasswordProvider = user.providerData?.some(p => p?.providerId === "password");
          // User is Google-only if they signed up with Google AND haven't set a password yet
          setIsGoogleOnlyUser(data.name && !data.firstName && !hasPasswordProvider);

          let birthday = "";
          try {
            if (data.birthday) {
              const dateObj = data.birthday.toDate ? data.birthday.toDate() : new Date(data.birthday);
              if (!isNaN(dateObj.getTime())) {
                birthday = dateObj.toISOString().split("T")[0];
              }
            }
          } catch (err) {
            console.warn("Invalid birthday data for user, skipping:", err);
          }

          setProfile({
            username: data.username || "",
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            email: data.email || user.email || "",
            birthday,
            role: data.role || "",
            roleDescription: data.roleDescription || "",
          });
        } else {
          const displayName = user.displayName || "";
          const [firstName = "", lastName = ""] = displayName.split(" ");
          
          setProfile({
            username: displayName,
            firstName,
            lastName,
            email: user.email || "",
            birthday: "",
            role: "",
            roleDescription: "",
          });
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        notify("Failed to load user profile.", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [auth, navigate]);

  // Fetch user's conversion count 
  useEffect(() => {
    const fetchConversionCount = async () => {
      try {
        
        const local = localStorage.getItem("user");
        const localUser = local ? JSON.parse(local) : null;
        const userId = localUser?.user_id || (auth.currentUser ? auth.currentUser.uid : null);
        if (!userId) return; 

        const res = await getHistory(userId);
        const list = res?.data || [];
        setConversionCount(Array.isArray(list) ? list.length : 0);
      } catch (err) {
        console.error("Failed to fetch conversion count:", err);
      }
    };

    fetchConversionCount();
    
  }, [auth]);

  // Update password
  const handlePasswordChange = async () => {
    if (!newPassword) {
      notify("New password is required.", "error");
      return;
    }

    const info = evaluatePassword(newPassword);
    if (!info.length) { notify("Password must be at least 8 characters.", "error"); return; }
    if (!info.upper) { notify("Password must include at least one uppercase letter.", "error"); return; }
    if (!info.lower) { notify("Password must include at least one lowercase letter.", "error"); return; }
    if (!info.digit) { notify("Password must include at least one number.", "error"); return; }
    if (!info.noSpace) { notify("Password must not contain spaces.", "error"); return; }

    try {
      const user = auth.currentUser;
      if (!user) return navigate("/login");

      // Determine if user already has email/password provider linked
      const hasPasswordProvider = Array.isArray(user.providerData)
        && user.providerData.some(p => (p?.providerId || "").toLowerCase() === "password");

      // If user has password provider, require current password
      if (hasPasswordProvider && (!currentPassword || currentPassword.length === 0)) {
        notify("Please enter your current password to change it.", "error");
        return;
      }

      // Reauthenticate: if currentPassword provided, use EmailAuthProvider; otherwise try Google popup
      if (currentPassword && currentPassword.length > 0) {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
      } else {
        // For Google-only accounts without a password, reauth with Google to allow setting a password
        const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      }

      // Update password
      await updatePassword(user, newPassword);

      // Clear local storage and sign out
      localStorage.removeItem("user");
      await signOut(auth);

      notify("Password updated successfully! Please login again with your new password.", "success");
      
      // Redirect to login page
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      console.error("Error updating password:", err);
      notify("Failed to update password. Please reauthenticate and try again.", "error");
    }
  };
  const handleFeedbackSubmit = async (e) => {
    e && e.preventDefault();
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

  const handleRoleUpdate = async (roleData) => {
    try {
      if (userDocId) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("authUID", "==", auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const docRef = querySnapshot.docs[0].ref;
          await updateDoc(docRef, roleData);
          
          setProfile(prev => ({
            ...prev,
            role: roleData.role,
            roleDescription: roleData.roleDescription || "",
          }));
          
          notify("Role updated successfully!", "success");
        }
      }
      setShowRoleModal(false);
      } catch (err) {
      console.error("Error updating role:", err);
      notify("Failed to update role. Please try again.", "error");
    }
  };

  const handleRoleSkip = () => {
    setShowRoleModal(false);
  };

  const getRoleDisplay = () => {
    if (!profile.role || profile.role.trim() === "") return "Not set";
    
    const roleLabels = {
      student: "Student 🎓",
      educator: "Educator/Faculty 👨‍🏫",
      professional: "Professional 💼",
      other: profile.roleDescription ? `Other: ${profile.roleDescription} ✨` : "Other ✨"
    };
    
    return roleLabels[profile.role] || profile.role;
  };

  if (loading) return <div>Loading profile...</div>;

  return (
    <>
      <RoleSelectionModal
        isOpen={showRoleModal}
        onSubmit={handleRoleUpdate}
        onSkip={handleRoleSkip}
      />
      
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

              {/* Google-only user notification */}
              {isGoogleOnlyUser && (
                <div className="password-warning-banner">
                  <span className="warning-icon">⚠️</span>
                  <p>
                    You signed up with Google. Please <strong>set a password below</strong> to secure your account and enable password login.
                  </p>
                </div>
              )}

              {/* Profile Info */}
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  value={profile.username}
                  onChange={handleProfileChange}
                  readOnly={!isEditing}
                  placeholder="Enter your username"
                />
              </div>
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={profile.firstName}
                  onChange={handleProfileChange}
                  readOnly={!isEditing}
                  placeholder="Enter your first name"
                />
              </div>

              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={profile.lastName}
                  onChange={handleProfileChange}
                  readOnly={!isEditing}
                  placeholder="Enter your last name"
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input type="email" value={profile.email} readOnly />
              </div>

              <div className="form-group">
                <label>Birthday</label>
                <input
                  type="date"
                  name="birthday"
                  value={profile.birthday}
                  onChange={handleProfileChange}
                  readOnly={!isEditing}
                />
              </div>

              {/* User Role */}
              <div className="form-group">
                <label>User Role</label>
                <div className="role-display-container">
                  <input type="text" value={getRoleDisplay()} readOnly />
                  <button 
                    type="button" 
                    className="change-role-btn"
                    onClick={() => setShowRoleModal(true)}
                  >
                    {profile.role ? "Change Role" : "Set Role"}
                  </button>
                </div>
              </div>

              {/* Conversion history */}
              <div className="form-group readonly">
                <label>Conversion History</label>
                <div className="readonly-box">
                  <FaHistory className="icon" />
                  <span>{conversionCount} total conversions</span>
                </div>
              </div>

              {/* Save Buttons */}
              <div className="settings-actions">
                {isEditing ? (
                  <>
                    <button className="save-btn" onClick={handleProfileUpdate}>
                      Save Changes
                    </button>
                    <button className="cancel-btn" onClick={handleCancelClick}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <button className="save-btn" onClick={handleEditClick}>
                    Update Information
                  </button>
                )}
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
                <small style={{ color: "#6d4fc2" }}>
                  Tip: Leave blank if you signed in with Google — we’ll reauthenticate with Google to set a password.
                </small>
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
    </>
  );
}
