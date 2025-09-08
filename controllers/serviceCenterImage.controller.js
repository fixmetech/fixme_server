const { db } = require('../firebase');
const admin = require('firebase-admin');

const {
  uploadToFirebaseStorage,
  deleteFromFirebaseStorage,
  generateFileName,
} = require('../utils/upload.util'); // <-- adjust path to your common upload file

// =========================
// Upload Service Center Image
// =========================
const uploadServiceCenterImage = async (req, res) => {
  try {
    const { servicecenterid } = req.params; // match your route param
    console.log('Service Center ID:', servicecenterid);

    if (!servicecenterid) {
      return res.status(400).json({ error: 'Service Center ID is required' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileName = generateFileName(file.originalname, 'serviceCenter-');
    const filePath = `serviceCenters/${servicecenterid}/profile/${fileName}`;

    // Upload to Firebase Storage
    const downloadURL = await uploadToFirebaseStorage(file, filePath);

    // Save URL to Firestore
    await db.collection('serviceCenters').doc(servicecenterid).update({
      images: admin.firestore.FieldValue.arrayUnion({
        url: downloadURL,
        filePath,
        uploadedAt: new Date().toISOString(),
      }),
    });

    return res.status(200).json({ message: 'Image uploaded successfully', url: downloadURL });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: error.message });
  }
};


// =========================
// Get Service Center Images
// =========================
const getServiceCenterImages = async (req, res) => {
  try {
    const { serviceCenterid } = req.params;

    const doc = await db.collection('serviceCenters').doc(serviceCenterid).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Service Center not found' });
    }

    const data = doc.data();
    return res.status(200).json({ images: data.images || [] });
  } catch (error) {
    console.error('Fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// =========================
// Edit/Replace Service Center Image
// =========================
const editServiceCenterImage = async (req, res) => {
  try {
    const { serviceCenterid } = req.params;
    const { oldFilePath } = req.body;
    const newFile = req.file;

    if (!oldFilePath || !newFile) {
      return res.status(400).json({ error: 'Old file path and new file are required' });
    }

    // Delete old file
    await deleteFromFirebaseStorage(oldFilePath);

    // Upload new file
    const fileName = generateFileName(newFile.originalname, 'serviceCenter-');
    const downloadURL = await uploadToFirebaseStorage(newFile, 'serviceCenters', fileName);

    // Update Firestore
    const docRef = db.collection('serviceCenters').doc(serviceCenterid);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Service Center not found' });
    }

    let images = doc.data().images || [];
    images = images.map(img =>
      img.filePath === oldFilePath
        ? { url: downloadURL, filePath: `serviceCenters/${fileName}`, uploadedAt: new Date().toISOString() }
        : img
    );

    await docRef.update({ images });

    return res.status(200).json({ message: 'Image replaced successfully', url: downloadURL });
  } catch (error) {
    console.error('Edit error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// =========================
// Delete Service Center Image
// =========================
const deleteServiceCenterImage = async (req, res) => {
  try {
    const { serviceCenterid } = req.params;
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    // Delete from Firebase Storage
    await deleteFromFirebaseStorage(filePath);

    // Remove from Firestore
    const docRef = db.collection('serviceCenters').doc(serviceCenterid);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Service Center not found' });
    }

    let images = doc.data().images || [];
    images = images.filter(img => img.filePath !== filePath);

    await docRef.update({ images });

    return res.status(200).json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// =========================
// Repeat same logic for Services Images
// =========================
const uploadServiceImage = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const fileName = generateFileName(file.originalname, 'service-');
    const downloadURL = await uploadToFirebaseStorage(file, 'services', fileName);

    await db.collection('services').doc(serviceId).update({
      images: admin.firestore.FieldValue.arrayUnion({
        url: downloadURL,
        filePath: `services/${fileName}`,
        uploadedAt: new Date().toISOString(),
      }),
    });

    return res.status(200).json({ message: 'Service image uploaded successfully', url: downloadURL });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: error.message });
  }
};

const getServiceImages = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const doc = await db.collection('services').doc(serviceId).get();

    if (!doc.exists) return res.status(404).json({ error: 'Service not found' });

    return res.status(200).json({ images: doc.data().images || [] });
  } catch (error) {
    console.error('Fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
};

const editServiceImage = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { oldFilePath } = req.body;
    const newFile = req.file;

    if (!oldFilePath || !newFile) {
      return res.status(400).json({ error: 'Old file path and new file are required' });
    }

    await deleteFromFirebaseStorage(oldFilePath);

    const fileName = generateFileName(newFile.originalname, 'service-');
    const downloadURL = await uploadToFirebaseStorage(newFile, 'services', fileName);

    const docRef = db.collection('services').doc(serviceId);
    const doc = await docRef.get();

    if (!doc.exists) return res.status(404).json({ error: 'Service not found' });

    let images = doc.data().images || [];
    images = images.map(img =>
      img.filePath === oldFilePath
        ? { url: downloadURL, filePath: `services/${fileName}`, uploadedAt: new Date().toISOString() }
        : img
    );

    await docRef.update({ images });

    return res.status(200).json({ message: 'Service image replaced successfully', url: downloadURL });
  } catch (error) {
    console.error('Edit error:', error);
    return res.status(500).json({ error: error.message });
  }
};

const deleteServiceImage = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { filePath } = req.body;

    if (!filePath) return res.status(400).json({ error: 'File path is required' });

    await deleteFromFirebaseStorage(filePath);

    const docRef = db.collection('services').doc(serviceId);
    const doc = await docRef.get();

    if (!doc.exists) return res.status(404).json({ error: 'Service not found' });

    let images = doc.data().images || [];
    images = images.filter(img => img.filePath !== filePath);

    await docRef.update({ images });

    return res.status(200).json({ message: 'Service image deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  // Service Center
  uploadServiceCenterImage,
  getServiceCenterImages,
  editServiceCenterImage,
  deleteServiceCenterImage,

  // Services
  uploadServiceImage,
  getServiceImages,
  editServiceImage,
  deleteServiceImage,
};
