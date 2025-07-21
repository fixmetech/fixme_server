const { bucket } = require('../firebase');

// Generate signed URL for viewing documents
const generateSignedUrl = async (fileUrl, action = 'read', expiration = 60) => {
  try {
    // Extract the file path from the full URL
    const url = new URL(fileUrl);
    const filePath = url.pathname.replace(`/${bucket.name}/`, '');
    
    const file = bucket.file(filePath);
    
    const options = {
      version: 'v4',
      action: action,
      expires: Date.now() + expiration * 60 * 1000, // expires in specified minutes
    };

    const [signedUrl] = await file.getSignedUrl(options);
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error('Failed to generate document access URL');
  }
};

// Verify document exists and is accessible
const verifyDocumentAccess = async (fileUrl) => {
  try {
    const url = new URL(fileUrl);
    const filePath = url.pathname.replace(`/${bucket.name}/`, '');
    
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    
    if (!exists) {
      throw new Error('Document not found');
    }

    const [metadata] = await file.getMetadata();
    
    return {
      exists: true,
      name: metadata.name,
      size: metadata.size,
      contentType: metadata.contentType,
      created: metadata.timeCreated,
      updated: metadata.updated
    };
  } catch (error) {
    console.error('Error verifying document access:', error);
    return { exists: false, error: error.message };
  }
};

// Get document metadata without downloading
const getDocumentMetadata = async (fileUrl) => {
  try {
    const url = new URL(fileUrl);
    const filePath = url.pathname.replace(`/${bucket.name}/`, '');
    
    const file = bucket.file(filePath);
    const [metadata] = await file.getMetadata();
    
    return {
      name: metadata.name,
      size: metadata.size,
      contentType: metadata.contentType,
      created: metadata.timeCreated,
      updated: metadata.updated,
      downloadUrl: fileUrl
    };
  } catch (error) {
    console.error('Error getting document metadata:', error);
    throw new Error('Failed to get document information');
  }
};

// Download document buffer for processing
const downloadDocumentBuffer = async (fileUrl) => {
  try {
    const url = new URL(fileUrl);
    const filePath = url.pathname.replace(`/${bucket.name}/`, '');
    
    const file = bucket.file(filePath);
    const [buffer] = await file.download();
    
    return buffer;
  } catch (error) {
    console.error('Error downloading document:', error);
    throw new Error('Failed to download document');
  }
};

module.exports = {
  generateSignedUrl,
  verifyDocumentAccess,
  getDocumentMetadata,
  downloadDocumentBuffer
};
