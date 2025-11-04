import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase"; //

/**
 * A component to protect routes that only admins can access.
 * It checks the user's Firestore document for the 'isAdmin' flag
 * before rendering the child component (the AdminDashboard).
 */
export default function AdminRoute({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true);
        // User is logged in, check their admin status
        // This logic is based on your Dashboard.js user fetching
        //
        try {
          // 1. Try to get doc by auth.uid
          const byUidRef = doc(db, "users", user.uid);
          const byUidSnap = await getDoc(byUidRef);

          if (byUidSnap.exists() && byUidSnap.data().isAdmin === true) {
            setIsAdmin(true);
            setIsLoading(false);
            return;
          }

          // 2. If not found, query where authUID == user.uid
          const usersCol = collection(db, "users");
          const q = query(usersCol, where("authUID", "==", user.uid));
          const qSnap = await getDocs(q);

          if (!qSnap.empty) {
             const docSnap = qSnap.docs[0];
             if (docSnap.data().isAdmin === true) {
                setIsAdmin(true);
                setIsLoading(false);
                return;
             }
          }

          // If neither check passes, they are not an admin
          setIsAdmin(false);

        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        }
      } else {
        // Not logged in
        setIsAuthenticated(false);
        setIsAdmin(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    // Show a loading state while checking permissions
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
     // Not logged in, redirect to login
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    // Logged in but not an admin, redirect to dashboard
    alert("Access denied: Admin privileges required."); // Optional feedback
    return <Navigate to="/dashboard" replace />;
  }

  // User is authenticated AND is an admin, show the protected page
  return children;
}