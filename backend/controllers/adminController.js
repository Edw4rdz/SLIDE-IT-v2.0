import { db } from "../config/firebaseAdmin.js"; //

/**
 * Controller: Gets a list of all users and their status.
 */
export const getAllUsers = async (req, res) => {
  try {
    const usersSnap = await db.collection("users").get();
    const users = [];
    
    // --- NEW LOGIC ---
    // Get the timestamp for 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    // --- END NEW LOGIC ---

    usersSnap.forEach((doc) => {
      const data = doc.data();
      
      // --- NEW LOGIC ---
      let status = "inactive";
      // Check if lastLogin exists and is a Firestore Timestamp
      // (Timestamps from the server are stored as Timestamps, not strings)
      if (data.lastLogin && data.lastLogin.toDate) { 
        if (data.lastLogin.toDate() > thirtyDaysAgo) {
          status = "active";
        }
      }
      // --- END NEW LOGIC ---

      users.push({
        id: doc.id,
        username: data.username || "N/A",
        email: data.email || "N/A",
        authUID: data.authUID,
        isAdmin: data.isAdmin || false,
        lastLogin: data.lastLogin?.toDate() || null, // <-- MODIFIED: Send the date
        status: status // <-- MODIFIED: Send the new status
      });
    });

    res.json({
      totalUsers: users.length,
      users: users,
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Controller: Gets usage statistics for app features.
 * (This function is unchanged)
 */
export const getAnalytics = async (req, res) => {
  try {
    const historySnap = await db.collection("history").get();

    // These names match the 'tools' array in your Dashboard.js
    //
    const featureCounts = {
      "AI-Generated PPTs": 0,
      "PDF-to-PPTs": 0,
      "DOCX/WORD-to-PPTs": 0,
      "TxT-to-PPTs": 0,
      "Excel-to-PPTs": 0,
      "unknown": 0,
    };

    historySnap.forEach((doc) => {
      const historyItem = doc.data();
      
      // We are looking for the 'conversionType' field
      const type = historyItem.conversionType; 

      if (type && featureCounts.hasOwnProperty(type)) {
        featureCounts[type]++;
      } else {
        featureCounts.unknown++;
      }
    });

    // Find the most used feature
    const mostUsed = Object.entries(featureCounts)
      .filter(([key]) => key !== 'unknown') // Don't count 'unknown'
      .reduce((a, b) => (a[1] > b[1] ? a : b), [null, 0]);

    res.json({
      totalConversions: historySnap.size,
      mostUsedFeature: {
        name: mostUsed[0] || "N/A",
        count: mostUsed[1] || 0,
      },
      allFeatures: featureCounts,
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};