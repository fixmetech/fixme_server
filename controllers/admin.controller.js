const { db } = require('../firebase');
const UserCollection = db.collection('user'); // Firestore collection

// Add a new user
const addUserDetails = async (req, res) => {
  try {
    const data = req.body;
    data.createdAt = new Date(); // optional timestamp
    const docRef = await UserCollection.add(data);
    const newUser = await docRef.get();

    res.status(201).json({
      success: true,
      id: docRef.id,
      data: newUser.data()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all users with pagination
const getAllUserDetails = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const snapshot = await UserCollection.orderBy('createdAt', 'desc')
      .offset(offset)
      .limit(limit)
      .get();

    const users = [];
    snapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });

    // Get total count for pagination
    const totalSnapshot = await UserCollection.get();
    const total = totalSnapshot.size;

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: users
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Edit user by ID
const editUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const userRef = UserCollection.doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await userRef.update(data);
    const updatedUser = await userRef.get();

    res.status(200).json({ success: true, data: updatedUser.data() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete user by ID
const deleteUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userRef = UserCollection.doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await userRef.delete();
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  addUserDetails,
  getAllUserDetails,
  editUserDetails,
  deleteUserDetails
};
