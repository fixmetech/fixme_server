const express = require('express');
const router = express.Router();
const {
  addUserDetails,
  getAllUserDetails,
  editUserDetails,
  deleteUserDetails
} = require('../controllers/user.controller'); // renamed for clarity

// Add a new user
router.post('/userDetails', addUserDetails);

// Get all users with pagination
router.get('/userDetails', getAllUserDetails);

// Edit a specific user by ID
router.patch('/userDetails/:id', editUserDetails);

// Delete a specific user by ID
router.delete('/userDetails/:id', deleteUserDetails);

module.exports = router;
