import React, { useState } from "react";
import { FaEnvelope, FaLock, FaGoogle, FaEye, FaEyeSlash } from "react-icons/fa";
import loginImg from "../assets/loginImg.jpg";
import "../styles/login.css";
import { useNavigate } from "react-router-dom";
import RoleSelectionModal from "../components/RoleSelectionModal";
import { notifyLoginSuccess, notifyEmailVerificationRequired, notify } from "../utils/notify";

import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  serverTimestamp, 
  runTransaction,
} from "firebase/firestore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Role selection modal state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [pendingUserData, setPendingUserData] = useState(null);
  const [pendingDocId, setPendingDocId] = useState(null);

  // <--- 2. Updated this function to track online status
  const updateUserLogin = async (docId) => {
    try {
      const userDocRef = doc(db, "users", docId);
  
      await updateDoc(userDocRef, {
        isOnline: true,             // Mark user as online
        lastLogin: serverTimestamp() // Use server time for accuracy
      });
    } catch (err) {
      console.warn("Could not update lastLogin time:", err.message);
    }
  }

  const handleRoleSubmit = async (roleData) => {
    try {
      if (pendingDocId) {
        const userDocRef = doc(db, "users", pendingDocId);
        await updateDoc(userDocRef, roleData);
      }
      
      setShowRoleModal(false);
      notify("Welcome to SLIDE-IT!");
      
      if (pendingUserData?.isAdmin === true) {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Error saving role:", err);
      notify("Failed to save role. Please try again.");
    }
  };


  const handleRoleSkip = () => {
    setShowRoleModal(false);
    notify("You can set your role later in Settings.");
    
    if (pendingUserData?.isAdmin === true) {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  };

  // Simplified function to check if user is Google-only
  const checkGoogleUserLogin = async (email, originalError) => {
    try {
      console.log("[Login Check] Checking user for:", email);
      
      // Check if user exists in database
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);
      
      // User doesn't exist in database at all
      if (querySnapshot.empty) {
        console.log("[Login Check] User not found in database");
        return "Account does not exist. Please sign up first.";
      }
      
      const userDoc = querySnapshot.docs[0].data();
      console.log("[Login Check] User found. Has firstName?", !!userDoc.firstName);
      
      // If user has firstName, they signed up normally (not Google-only)
      if (userDoc.firstName) {
        console.log("[Login Check] Regular user - wrong password");
        return "Incorrect password. Please try again or use 'Forgot password?' to reset it.";
      }
      
      // User is a Google signup (no firstName field)
      // But if they're getting auth/invalid-credential OR auth/wrong-password,
      // they likely HAVE set a password (just typed it wrong)
      // Only show "use Google" message for completely new Google users
      
      console.log("[Login Check] Google user - showing wrong password message");
      return "Incorrect password. Please try again or use 'Forgot password?' to reset it.";
    } catch (checkErr) {
      console.error("[Login Check] Error checking user:", checkErr);
      // Fallback to original error handling
      if (originalError.code === "auth/wrong-password") {
        return "Incorrect password. Please try again or use 'Forgot password?' to reset it.";
      }
      return "Invalid credentials. Please check your email and password and try again.";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      notify("Please fill all fields.");
      return;
    }

    setLoading(true);

    try {
      const lowerEmail = email.toLowerCase();
      const userCredential = await signInWithEmailAndPassword(auth, lowerEmail, password);
      const user = userCredential.user;
      let userDataFromDb = null;
      let userDocId = null; 

      const usersRef = collection(db, "users");
      const q = query(usersRef, where("authUID", "==", user.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        userDataFromDb = { id: docSnap.id, ...docSnap.data() };
        userDocId = docSnap.id;
      } else {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          userDataFromDb = { id: userDoc.id, ...userDoc.data() };
          userDocId = userDoc.id; 
        }
      }
      
      // Update login status if user found
      if (userDocId) {
        // Check if email is verified
        if (userDataFromDb?.emailVerified === false) {
          await auth.signOut();
          setLoading(false);
          notifyEmailVerificationRequired();
          // Redirect to verify page so they can enter the OTP if they have it
          navigate("/verify-otp", { 
            state: { 
              email: userDataFromDb.email || email, 
              userName: userDataFromDb.firstName || "User" 
            } 
          });
          return;
        }

        await updateUserLogin(userDocId);
      }

      const localUser = {
        username: userDataFromDb?.username || user.displayName || user.email,
        firstName: userDataFromDb?.firstName || null,
        lastName: userDataFromDb?.lastName || null,
        email: userDataFromDb?.email || user.email,
        user_id: userDataFromDb?.numericId || user.uid,
        authUID: user.uid,
        isAdmin: userDataFromDb?.isAdmin || false
      };

      localStorage.setItem("user", JSON.stringify(localUser));
      
      // Check if user needs to select a role
      if (!userDataFromDb?.role && userDataFromDb?.isAdmin !== true) {
        setPendingUserData({ ...localUser, isAdmin: userDataFromDb?.isAdmin || false });
        setPendingDocId(userDocId);
        setShowRoleModal(true);
        return; 
      }
      
      notifyLoginSuccess(localUser?.username);
      
      if (userDataFromDb?.isAdmin === true) {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Firebase login error:", err);
      let errorMessage = "Error logging in. Please try again.";

      // Handle authentication errors
      if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email format. Please enter a valid email address.";
      } else if (err.code === "auth/user-not-found") {
        errorMessage = "No account found with this email. Please check your email or sign up for a new account.";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many failed login attempts. Your account has been temporarily locked. Please try again later or reset your password.";
      } else if (err.code === "auth/user-disabled") {
        errorMessage = "This account has been disabled. Please contact support for assistance.";
      } else if (err.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (err.code === "auth/operation-not-allowed") {
        errorMessage = "Email/password login is currently disabled. Please contact support.";
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        // Check if this is a Google-only user trying to login with password
        errorMessage = await checkGoogleUserLogin(email.toLowerCase(), err);
      } else {
        errorMessage = `Login failed: ${err.message || "Unknown error"}. Please try again.`;
      }

      notify(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      let userDataFromDb = null;
      let userDocId = null; 

      const usersRef = collection(db, "users");
      const q = query(usersRef, where("authUID", "==", user.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        userDataFromDb = docSnap.data();
        userDocId = docSnap.id; 
      } else {
        const uidRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(uidRef);
        userDocId = user.uid; 
        
        if (docSnap.exists()) {
          userDataFromDb = docSnap.data();
        } else {
          // Use a transaction to safely increment the counter and create the user
          const counterRef = doc(db, "metadata", "userCounter");
          
          const newNumericId = await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            if (!counterDoc.exists()) {
              // Initialize the counter if it doesn't exist
              transaction.set(counterRef, { count: 100 }); // Start from 100
              return 100;
            }
            
            const newId = counterDoc.data().count + 1;
            transaction.update(counterRef, { count: newId });
            return newId;
          });

          userDocId = String(newNumericId);
          const newUserDocRef = doc(db, "users", userDocId);

          userDataFromDb = {
            name: user.displayName,
            email: user.email,
            createdAt: new Date().toISOString(),
            authUID: user.uid,
            isAdmin: false,
            numericId: newNumericId, // Add the numeric ID to the document
          };
          await setDoc(newUserDocRef, userDataFromDb);
        }
      }
      
      // Update login status
      await updateUserLogin(userDocId);
      
      const localUser = {
        username: userDataFromDb?.name || user.displayName || user.email,
        email: userDataFromDb?.email || user.email,
        user_id: user.uid,
        authUID: user.uid,
        isAdmin: userDataFromDb?.isAdmin || false
      };

      localStorage.setItem("user", JSON.stringify(localUser));
      if (!userDataFromDb?.role && userDataFromDb?.isAdmin !== true) {
        setPendingUserData({ ...localUser, isAdmin: userDataFromDb?.isAdmin || false });
        setPendingDocId(userDocId);
        setShowRoleModal(true);
        return; 
      }
      
      notifyLoginSuccess(localUser.username);

      if (userDataFromDb?.isAdmin === true) {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
      
    } catch (err) {
      console.error("Google sign-in failed:", err);
      let errorMessage = "❌ Google sign-in failed. Please try again.";

      // More specific Google sign-in error messages
      if (err.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign-in cancelled. Please try again and complete the Google sign-in process.";
      } else if (err.code === "auth/popup-blocked") {
        errorMessage = "Pop-up blocked by your browser. Please allow pop-ups for this site and try again.";
      } else if (err.code === "auth/account-exists-with-different-credential") {
        errorMessage = "An account already exists with this email using a different sign-in method. Please use your original sign-in method.";
      } else if (err.code === "auth/cancelled-popup-request") {
        errorMessage = "Only one sign-in pop-up allowed at a time. Please try again.";
      } else if (err.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (err.code === "auth/unauthorized-domain") {
        errorMessage = "This domain is not authorized for Google sign-in. Please contact support.";
      } else if (err.message) {
        errorMessage = `Google sign-in failed: ${err.message}`;
      }

      notify(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <RoleSelectionModal
        isOpen={showRoleModal}
        onSubmit={handleRoleSubmit}
        onSkip={handleRoleSkip}
      />
      
      <div className="login-page">
        <div className="login-container">
        {/* Left side */}
        <div className="login-left">
          <h2 className="title">
            Welcome to <span>SLIDE-IT</span>
          </h2>
          <p className="subtitle">Sign in to start your session</p>

         <form onSubmit={handleSubmit}>
  
  {/* Email Field Group */}
  <div className="input-group">
    <label htmlFor="email" className="input-label">Email Address</label>
    <div className="input-box">
      <i><FaEnvelope /></i>
      <input
        id="email" // added id for accessibility
        type="email"
        placeholder="name@example.com" // updated placeholder to be an example
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        style={{ paddingLeft: "50px" }}
        disabled={loading}
      />
    </div>
  </div>
    
  {/* Password Field Group */}
  <div className="input-group">
    <label htmlFor="password" className="input-label">Password</label>
    <div className="input-box" style={{ position: 'relative' }}>
      <i><FaLock /></i>
      <input
        id="password"
        type={showPassword ? "text" : "password"}
        placeholder="Enter your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        style={{ paddingLeft: "50px", paddingRight: "45px" }}
        disabled={loading}
      />
      {password && (
        <i 
          onClick={() => setShowPassword(!showPassword)}
          style={{
            position: 'absolute',
            right: '15px',
            top: '50%',
            transform: 'translateY(-50%)',
            cursor: 'pointer',
            color: '#6D4FC2',
            fontSize: '17px',
            left: 'auto'
          }}
        >
          {showPassword ? <FaEyeSlash /> : <FaEye />}
        </i>
      )}
    </div>
  </div>

  <p className="forgot-text" style={{ marginBottom: 12 }}>
    <a href="/forgot-password">Forgot password?</a>
  </p>

  <button type="submit" className="login-btn" disabled={loading}>
    {loading ? "Logging in..." : "Login"}
  </button>

  <div className="divider">
    <span>OR</span>
  </div>

  <button
    type="button"
    className="google-btn"
    onClick={handleGoogleLogin}
    disabled={loading}
  >
    <FaGoogle className="google-icon" />
    Continue with Google
  </button>

  <p className="signup-text">
    Don’t have an account? <a href="/signup">Sign up now</a>
  </p>
</form>
</div>

        {/* Right side */}
        <div className="login-right">
          <img src={loginImg} alt="Login" />
        </div>
      </div>
    </div>
    </>
  );
}
