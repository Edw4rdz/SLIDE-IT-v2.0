import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/logout.css";

export default function LogoutPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Ask user for confirmation before logging out
    const confirmLogout = window.confirm("Are you sure you want to log out?");
    if (!confirmLogout) {
      // If user cancels, go back to dashboard
      navigate("/dashboard");
      return;
    }

    // Clear user info
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");

    // Wait 1.2 seconds to show the spinner, then redirect to login
    const timer = setTimeout(() => {
      navigate("/login");
    }, 1200);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="logout-page">
      <div className="spinner"></div>
      <h2>Logging you out...</h2>
    </div>
  );
}
