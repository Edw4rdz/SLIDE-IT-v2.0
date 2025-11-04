import { getAuth } from "firebase/auth";

// This uses your existing backend URL, defaulting to localhost:5000
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

/**
 * A helper function to get the current user's Firebase ID token.
 * This token is required to authenticate with our secure admin routes.
 */
const getIdToken = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is logged in");
  return await user.getIdToken();
};

/**
 * Fetches all user data from the admin endpoint.
 */
export const fetchAllUsers = async () => {
  const token = await getIdToken();
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`, // Sends the token in the header
    },
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to fetch users');
  }
  return response.json();
};

/**
 * Fetches analytics data from the admin endpoint.
 */
export const fetchAnalytics = async () => {
  const token = await getIdToken();
  const response = await fetch(`${API_BASE_URL}/admin/analytics`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`, // Sends the token in the header
    },
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to fetch analytics');
  }
  return response.json();
};