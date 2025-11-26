import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  updateDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  getDocs 
} from "firebase/firestore"; // <--- Updated imports
import "../styles/logout.css";

export default function LogoutPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const performLogout = async () => {
      const confirmLogout = window.confirm("Are you sure you want to log out?");
      if (!confirmLogout) {
        navigate("/dashboard");
        return;
      }

      const auth = getAuth();
      const db = getFirestore();
      const user = auth.currentUser;

      try {
        if (user) {
          // 1. Search for the user document correctly
          let userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDocs(query(collection(db, "users"), where("authUID", "==", user.uid)));

          if (!userDocSnap.empty) {
            userDocRef = doc(db, "users", userDocSnap.docs[0].id);
          }

          // 2. Update status
          await updateDoc(userDocRef, {
            isOnline: false,
            lastLogout: serverTimestamp()
          });
        }

        await signOut(auth);
        localStorage.removeItem("user");
        sessionStorage.removeItem("user");

        setTimeout(() => {
          navigate("/login");
        }, 1200);

      } catch (error) {
        console.error("Error during logout:", error);
        navigate("/login");
      }
    };

    performLogout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="logout-page">
      <div className="spinner"></div>
      <h2>Logging you out...</h2>
    </div>
  );
}