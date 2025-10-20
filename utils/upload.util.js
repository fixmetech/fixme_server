const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { bucket } = require('../firebase');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = {
    image: ['image/jpeg', 'image/png', 'image/jpg'],
    document: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
  };
  
  if (file.fieldname === 'profilePicture') {
    if (allowedTypes.image.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Profile picture must be JPEG, JPG, or PNG'), false);
    }
  } else if (file.fieldname === 'idProof' || file.fieldname === 'idProofBack') {
    if (allowedTypes.document.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('ID proof must be PDF, JPEG, JPG, or PNG'), false);
    }
  } else if (file.fieldname === 'certificates' || 
             file.fieldname === 'workPhotos' || 
             file.fieldname === 'recommendationLetters' || 
             file.fieldname === 'clientReviews') {
    if (allowedTypes.document.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Verification documents must be PDF, JPEG, JPG, or PNG'), false);
    }
  } else {
    cb(new Error('Invalid field name'), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 20 // Maximum 20 files total to accommodate all verification documents
  }
});

// Upload middleware for technician registration
const uploadTechnicianFiles = upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'idProof', maxCount: 1 },
  { name: 'idProofBack', maxCount: 1 },
  { name: 'certificates', maxCount: 5 },
  { name: 'workPhotos', maxCount: 5 },
  { name: 'recommendationLetters', maxCount: 3 },
  { name: 'clientReviews', maxCount: 5 }
]);

// Function to upload file to Firebase Storage
const uploadToFirebaseStorage = async (file, folder, fileName) => {
  try {
    console.log(`📁 Uploading to bucket: ${bucket.name}`);
    console.log(`📂 Folder: ${folder}`);
    console.log(`📄 File: ${fileName}`);
    
    // Check if bucket exists
    const [bucketExists] = await bucket.exists();
    if (!bucketExists) {
      throw new Error(`Storage bucket '${bucket.name}' does not exist. Please enable Firebase Storage in your Firebase Console.`);
    }
    
    const fileRef = bucket.file(`${folder}/${fileName}`);
    
    await fileRef.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
        metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString()
        }
      }
    });
    
    // Make file publicly accessible (optional - adjust based on security needs)
    await fileRef.makePublic();
    
    const downloadURL = `https://storage.googleapis.com/${bucket.name}/${folder}/${fileName}`;
    console.log(`✅ File uploaded successfully: ${downloadURL}`);
    
    return downloadURL;
  } catch (error) {
    console.error('❌ Upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

// Function to delete file from Firebase Storage
const deleteFromFirebaseStorage = async (filePath) => {
  try {
    const file = bucket.file(filePath);
    await file.delete();
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Generate unique filename
const generateFileName = (originalName, prefix = '') => {
  const extension = originalName.split('.').pop();
  const uniqueId = uuidv4();
  return `${prefix}${uniqueId}.${extension}`;
};

module.exports = {
  uploadTechnicianFiles,
  uploadToFirebaseStorage,
  deleteFromFirebaseStorage,
  generateFileName
};
