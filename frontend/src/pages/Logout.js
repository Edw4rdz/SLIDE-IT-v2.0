import { useEffect, useState } from "react";
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
import ConfirmDialog from "../components/ConfirmDialog";
import { notify } from "../utils/notify";

export default function LogoutPage() {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setConfirmOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="logout-page">
      <ConfirmDialog
        open={confirmOpen}
        title="Logout"
        message={processing ? "Processing logout..." : "Are you sure you want to log out?"}
        confirmText={processing ? "Logging out..." : "Logout"}
        cancelText="Cancel"
        onConfirm={async () => {
          setProcessing(true);
          const auth = getAuth();
          const db = getFirestore();
          const user = auth.currentUser;
          try {
            if (user) {
              let userDocRef = doc(db, "users", user.uid);
              const userDocSnap = await getDocs(query(collection(db, "users"), where("authUID", "==", user.uid)));
              if (!userDocSnap.empty) userDocRef = doc(db, "users", userDocSnap.docs[0].id);
              await updateDoc(userDocRef, { isOnline: false, lastLogout: serverTimestamp() });
            }
            await signOut(auth);
            localStorage.removeItem("user");
            sessionStorage.removeItem("user");
            notify("Logged out successfully.", "success");
          } catch (error) {
            console.error("Error during logout:", error);
            notify("Logout encountered an issue.", "error");
          } finally {
            setProcessing(false);
            setConfirmOpen(false);
            navigate("/login");
          }
        }}
        onCancel={() => {
          setConfirmOpen(false);
          navigate("/dashboard");
        }}
      />
    </div>
  );
}