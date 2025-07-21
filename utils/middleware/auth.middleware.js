const {admin} = require('../../firebase'); 
const { db } = require('../../firebase');

const moderatorCollection = db.collection('moderators');

const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const idToken = authHeader.split(' ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // includes uid, email, etc.
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Simple authentication middleware for moderators (in a real app, you'd use JWT tokens)
const authenticateModerator = async (req, res, next) => {
  try {
    // In a real application, you would extract the token from headers
    // For now, we'll use a simple email-based authentication
    const { moderatorId, moderatorEmail } = req.headers;
    
    if (!moderatorId && !moderatorEmail) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    let moderatorDoc;
    
    if (moderatorId) {
      moderatorDoc = await moderatorCollection.doc(moderatorId).get();
    } else if (moderatorEmail) {
      const query = await moderatorCollection.where('email', '==', moderatorEmail).get();
      moderatorDoc = query.docs[0];
    }

    if (!moderatorDoc || !moderatorDoc.exists) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication credentials'
      });
    }

    const moderatorData = moderatorDoc.data();
    
    if (!moderatorData.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Add moderator info to request object
    req.user = {
      id: moderatorDoc.id,
      ...moderatorData
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Check if moderator has specific permission
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: `Permission '${permission}' required`
      });
    }

    next();
  };
};

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    // Simple admin check - in a real app, you'd have proper admin authentication
    const { adminKey } = req.headers;
    
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({
        success: false,
        error: 'Admin authentication required'
      });
    }

    req.user = {
      id: 'admin',
      role: 'admin'
    };

    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

module.exports = {
  verifyFirebaseToken,
  authenticateModerator,
  checkPermission,
  authenticateAdmin
};
