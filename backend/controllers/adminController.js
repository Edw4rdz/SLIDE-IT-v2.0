import admin, { db } from "../config/firebaseAdmin.js"; 


/**
 * Controller: Gets a list of all users and their status.
 */
export const getAllUsers = async (req, res) => {

  try {
    const usersSnap = await db.collection("users").get();
    const users = [];
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Role statistics
    const roleStats = {
      student: 0,
      educator: 0,
      professional: 0,
      other: 0,
      notSet: 0
    };

    usersSnap.forEach((doc) => {
      const data = doc.data();
      if (doc.id === 'userCounter' || !data || !data.email || !data.authUID) {
        return;
      }

      let status = "inactive";
      if (data.lastLogin && data.lastLogin.toDate) { 
        if (data.lastLogin.toDate() > thirtyDaysAgo) {
          status = "active";
        }
      }

      // Count roles - normalize to lowercase and check against predefined roles
      const userRole = data.role?.toLowerCase()?.trim();
      console.log(`User ${data.username} (${data.email}) has role: "${data.role}" -> normalized: "${userRole}"`);
      
      if (!userRole) {
        roleStats.notSet++;
      } else if (userRole === 'student') {
        roleStats.student++;
        console.log('✓ Counted as student');
      } else if (userRole === 'educator' || userRole === 'faculty') {
        roleStats.educator++;
      } else if (userRole === 'professional') {
        roleStats.professional++;
      } else {
        roleStats.other++;
      }

      users.push({
        id: doc.id, 
        username: data.username || "N/A",
        email: data.email || "N/A",
        authUID: data.authUID, 
        isAdmin: data.isAdmin || false,
        lastLogin: data.lastLogin?.toDate() || null,
        status: status
      });
    });

    console.log('Final role stats:', roleStats);

    res.json({
      totalUsers: users.length,
      users: users,
      roleStats: roleStats
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAnalytics = async (req, res) => {

  try {
    const historySnap = await db.collection("history").get();


    const featureCounts = {
      "AI-Generated PPTs": 0,
      "PDF-to-PPTs": 0,
      "DOCX/WORD-to-PPTs": 0,
      "TxT-to-PPTs": 0,
      "Excel-to-PPTs": 0,
    };

    historySnap.forEach((doc) => {
      const historyItem = doc.data();
      const type = historyItem.conversionType; 

      if (type && featureCounts.hasOwnProperty(type)) {
        featureCounts[type]++;
      } else {
        featureCounts.unknown++;
      }
    });

    const mostUsed = Object.entries(featureCounts)
      .filter(([key]) => key !== 'unknown') 
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


/**
 * Controller: Creates a new user in both Auth and Firestore.
 */
export const createUser = async (req, res) => {
  try {

    const { 
      email, 
      password, 
      username, 
      isAdmin,
      firstName,
      lastName,
      birthday 
    } = req.body;

  
    if (!email || !password || !username || !firstName || !lastName || !birthday) {
      return res.status(400).json({ error: "All fields are required." });
    }

   
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: username,
    });

    const counterRef = db.collection("users").doc("userCounter");
 
    const newId = await db.runTransaction(async (transaction) => { 
      const counterDoc = await transaction.get(counterRef);
      
      if (!counterDoc.exists) { 
        throw new Error("Counter document does not exist!");
      }
      const newCurrentId = counterDoc.data().currentId + 1;
      transaction.update(counterRef, { currentId: newCurrentId });
      return newCurrentId;
    });

    // Create the user document in db
    const newUserDoc = {
      authUID: userRecord.uid,
      username: username,
      email: email,
      firstName: firstName,
      lastName: lastName,
      numericId: newId,
      isAdmin: isAdmin || false,
      createdAt: new Date(),
      birthday: new Date(birthday), 
      lastLogin: null,
    };
    

    const docRef = db.collection("users").doc(); 
    await docRef.set(newUserDoc);

    res.status(201).json({
      id: docRef.id,
      ...newUserDoc,
      status: 'inactive' 
    });

  } catch (error) {
    console.error("Error creating user:", error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: "This email is already in use." });
    }
    if (error.message.includes("Invalid time value")) {
      return res.status(400).json({ error: "Invalid birthday format. Use YYYY-MM-DD." });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Controller: Deletes a user from both Auth and Firestore.
 */
export const deleteUser = async (req, res) => {

  try {
    const { docId } = req.params; 
    const { authUID } = req.body; 

    if (!docId || !authUID) {
      return res.status(400).json({ error: "Document ID and Auth UID are required." });
    }
    
  
    await admin.auth().deleteUser(authUID);
    
   
    await db.collection("users").doc(docId).delete();

    res.status(200).json({ success: true, message: "User deleted successfully." });

  } catch (error) {
    console.error("Error deleting user:", error);

    if (error.code === 'auth/user-not-found') {
    
      try {
        await db.collection("users").doc(req.params.docId).delete();
        return res.status(200).json({ success: true, message: "User deleted from Firestore (Auth user not found)." });
      } catch (fsError) {
         return res.status(500).json({ error: fsError.message });
      }
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Controller: Updates a user's role (isAdmin)
 */
export const updateUserRole = async (req, res) => {

  try {
    const { docId } = req.params; 
    const { isAdmin } = req.body;

    if (typeof isAdmin !== 'boolean') {
      return res.status(400).json({ error: "'isAdmin' must be a boolean." });
    }
    
    const userRef = db.collection("users").doc(docId);
    
 
    await userRef.update({
      isAdmin: isAdmin
    });

    res.status(200).json({ success: true, message: "User role updated." });

  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ error: error.message });
  }
};