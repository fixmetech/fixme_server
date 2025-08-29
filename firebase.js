const admin = require('firebase-admin');
const serviceAccount = require('./firebaseKey.json');
const { GeoFire } = require("geofire");

// Get bucket name from service account or environment
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`;
// Firebase Realtime Database URL
const databaseURL = process.env.FIREBASE_DATABASE_URL || "https://fixme-2025-default-rtdb.firebaseio.com/";
const geoDatabaseURL = process.env.FIREBASE_GEO_DATABASE_URL || "https://fixme-2025-geofire.firebaseio.com/";

console.log('🔥 Initializing Firebase with bucket:', storageBucket);

const defaultApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: storageBucket,
  databaseURL: databaseURL // Realtime Database URL
});

// Secondary app for GeoFire database
const geoApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: geoDatabaseURL
}, "geoApp");

const db = defaultApp.firestore();
const rtdb = defaultApp.database();
const bucket = defaultApp.storage().bucket();

const geoDb = geoApp.database();

// For development: Use emulator if needed
if (process.env.NODE_ENV === 'development') {
  // Uncomment these lines if you want to use Firebase emulator
  // db.settings({
  //   host: 'localhost:8080',
  //   ssl: false
  // });
}

// Test Firebase connection
async function testFirebaseConnection() {
  try {
    // Test Firestore
    await db.collection('test').limit(1).get();
    console.log('✅ Firestore connected successfully');
    
    // Test Storage
    const [bucketExists] = await bucket.exists();
    if (bucketExists) {
      console.log('✅ Storage bucket exists and is accessible');
    } else {
      console.log('❌ Storage bucket does not exist. Please enable Firebase Storage in console.');
    }
    
  } catch (error) {
    console.error('❌ Firebase connection failed:', error.message);
    console.log('💡 Make sure Firebase Storage is enabled in your Firebase Console');
  }
}

// Test connection on startup
testFirebaseConnection();

module.exports = { admin, db, rtdb, bucket, geoDb };
