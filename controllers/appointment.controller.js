const admin = require('firebase-admin');
const scAppointment = require('../models/scAppointment.model');

exports.createAppointment = async (req, res) => {
  try {
    const data = req.body;

    // Optionally generate createdAt/updatedAt server-side
    data.createdAt = new Date().toISOString();
    data.updatedAt = new Date().toISOString();

    // Create an instance (optional, for structure, not required by Firestore)
    const appointment = new scAppointment(data);

    // Save to Firestore
    const docRef = await admin
      .firestore()
      .collection('appointments')
      .add({ ...appointment, createdAt: data.createdAt, updatedAt: data.updatedAt });

    res.status(201).json({ message: 'Appointment created', id: docRef.id });
  } catch (err) {
    console.error('Error creating appointment:', err);
    res.status(500).json({ message: 'Failed to create appointment', error: err.message });
  }
};
