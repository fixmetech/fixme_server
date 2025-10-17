const { db } = require('../firebase');
const admin = require('firebase-admin');
const {
  uploadToFirebaseStorage,
  deleteFromFirebaseStorage,
  generateFileName,
} = require('../utils/upload.util');

// Upload Service Center Image
const uploadServiceCenterImage = async (req, res) => {
  try {
    const { servicecenterid } = req.params;
    if (!servicecenterid) return res.status(400).json({ error: 'Service Center ID is required' });

    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const fileName = generateFileName(file.originalname, 'serviceCenter-');
    const folderPath = `serviceCenter/profiles/${servicecenterid}`;

    const downloadURL = await uploadToFirebaseStorage(file, folderPath, fileName);

    await db.collection('serviceCenters').doc(servicecenterid).update({
      images: admin.firestore.FieldValue.arrayUnion({
        url: downloadURL,
        filePath: `${folderPath}/${fileName}`,
        uploadedAt: new Date().toISOString(),
      }),
    });

    return res.status(200).json({ message: 'Image uploaded successfully', url: downloadURL });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Edit Service Center Image
const editServiceCenterImage = async (req, res) => {
  try {
    const { servicecenterid } = req.params;
    const { oldFilePath } = req.body;
    const newFile = req.file;

    if (!oldFilePath || !newFile)
      return res.status(400).json({ error: 'Old file path and new file are required' });

    await deleteFromFirebaseStorage(oldFilePath);

    const fileName = generateFileName(newFile.originalname, 'serviceCenter-');
    const folderPath = `serviceCenter/${servicecenterid}/profiles`;
    const downloadURL = await uploadToFirebaseStorage(newFile, folderPath, fileName);

    const docRef = db.collection('serviceCenters').doc(servicecenterid);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Service Center not found' });

    const images = (doc.data().images || []).map(img =>
      img.filePath === oldFilePath
        ? { url: downloadURL, filePath: `${folderPath}/${fileName}`, uploadedAt: new Date().toISOString() }
        : img
    );

    await docRef.update({ images });
    return res.status(200).json({ message: 'Image replaced successfully', url: downloadURL });
  } catch (error) {
    console.error('Edit error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Delete Service Center Image
const deleteServiceCenterImage = async (req, res) => {
  try {
    const { servicecenterid } = req.params;
    const { filePath } = req.body;

    if (!filePath) return res.status(400).json({ error: 'File path is required' });

    await deleteFromFirebaseStorage(filePath);

    const docRef = db.collection('serviceCenters').doc(servicecenterid);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Service Center not found' });

    const images = (doc.data().images || []).filter(img => img.filePath !== filePath);
    await docRef.update({ images });

    return res.status(200).json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Get Functions
const getServiceCenterImages = async (req, res) => {
  try {
    const { servicecenterid } = req.params;
    const doc = await db.collection('serviceCenters').doc(servicecenterid).get();
    if (!doc.exists) return res.status(404).json({ error: 'Service Center not found' });
    return res.status(200).json({ images: doc.data().images || [] });
  } catch (error) {
    console.error('Fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  // Service Center
  uploadServiceCenterImage,
  getServiceCenterImages,
  editServiceCenterImage,
  deleteServiceCenterImage
};
