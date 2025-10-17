const admin = require('firebase-admin');

// Test Firebase connection for complaints
async function testFirebaseConnection() {
  try {
    console.log('🔥 Testing Firebase connection...');
    
    const db = admin.database();
    
    // Test writing a sample complaint
    const testData = {
      customer: { name: 'Test User' },
      complaint: { title: 'Test Complaint', status: 'pending' },
      createdAt: new Date().toISOString()
    };
    
    const testRef = db.ref('complaints/test-complaint');
    await testRef.set(testData);
    console.log('✅ Test data written successfully');
    
    // Test reading the data back
    const snapshot = await testRef.once('value');
    const readData = snapshot.val();
    console.log('✅ Test data read successfully:', readData.complaint.title);
    
    // Clean up test data
    await testRef.remove();
    console.log('✅ Test data cleaned up');
    
    console.log('🎉 Firebase connection test passed!');
    
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error.message);
  }
}

testFirebaseConnection().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test failed:', error.message);
  process.exit(1);
});
