import { db } from "../config/firebaseAdmin.js"; //

/**
 * Controller: Gets a list of all users and their status.
 */
export const getAllUsers = async (req, res) => {
  try {
    const usersSnap = await db.collection("users").get();
    const users = [];
    
    usersSnap.forEach((doc) => {
      const data = doc.data();
      // We'll gather the basic user info
      users.push({
        id: doc.id,
        username: data.username || "N/A",
        email: data.email || "N/A",
        authUID: data.authUID,
        isAdmin: data.isAdmin || false,
        // You could later add a 'lastLogin' field to determine active/inactive
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
 * This reads from the "history" collection, which your historyController also uses.
 *
 */
export const getAnalytics = async (req, res) => {
  try {
    const historySnap = await db.collection("history").get();

    // These names match the 'tools' array in your Dashboard.js
    //
    const featureCounts = {
      "ai-generator": 0,
      "pdftoppt": 0,
      "wordtoppt": 0,
      "texttoppt": 0,
      "exceltoppt": 0,
      "unknown": 0,
    };

    historySnap.forEach((doc) => {
      const historyItem = doc.data();
      
      // *** IMPORTANT ***
      // We must assume that your 'history' documents contain a field
      // like 'conversionType' that stores a string (e.g., "pdftoppt").
      // If your field is named differently, you must change 'historyItem.conversionType' below.
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