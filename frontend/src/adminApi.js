import { getAuth } from "firebase/auth";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Helper: Get the current user's ID token.
 */
const getIdToken = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No user is logged in");
  return await user.getIdToken();
};

/**
 * Helper: Get headers with the auth token.
 */
// --- THIS IS THE FIXED LINE ---
const getAuthHeaders = async () => { 
// (The error was `async ()_ => {` with an extra underscore)
// --- END OF FIX ---
  const token = await getIdToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

/**
 * Fetches all user data.
 */
export const fetchAllUsers = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    method: 'GET',
    headers: headers,
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to fetch users');
  }
  return response.json();
};

/**
 * Fetches analytics data.
 */
export const fetchAnalytics = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/admin/analytics`, {
    method: 'GET',
    headers: headers,
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to fetch analytics');
  }
  return response.json();
};

// -------------------------------------------
// --- NEW API FUNCTIONS ---
// -------------------------------------------

/**
 * Creates a new user.
 * @param {object} userData - { email, password, username, isAdmin }
 */
export const createUser = async (userData) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/admin/user`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(userData)
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to create user');
  }
  return response.json();
};

/**
 * Deletes a user.
 * @param {string} docId - The user's Firestore document ID
 * @param {string} authUID - The user's Firebase Auth UID
 */
export const deleteUser = async (docId, authUID) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/admin/user/${docId}`, {
    method: 'DELETE',
    headers: headers,
    body: JSON.stringify({ authUID: authUID }) // Send authUID in the body
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to delete user');
  }
  return response.json();
};

/**
 * Updates a user's role.
 * @param {string} docId - The user's Firestore document ID
 * @param {boolean} isAdmin - The new role
 */
export const updateUserRole = async (docId, isAdmin) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/admin/user/${docId}/role`, {
    method: 'PUT',
    headers: headers,
    body: JSON.stringify({ isAdmin: isAdmin })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to update role');
  }
  return response.json();
};