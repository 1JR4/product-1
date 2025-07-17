// Test script to verify Firebase connection
// Run this with: npx tsx lib/firebase/test-connection.ts

import { db, realtimeDb, storage } from './config';
import { collection, getDocs } from 'firebase/firestore';
import { ref, get } from 'firebase/database';
import { ref as storageRef, listAll } from 'firebase/storage';

async function testFirebaseConnection() {
  console.log('🔥 Testing Firebase connection...\n');

  try {
    // Test Firestore connection
    console.log('📄 Testing Firestore...');
    const testCollection = collection(db, 'test');
    await getDocs(testCollection);
    console.log('✅ Firestore connection successful');
  } catch (error) {
    console.log('❌ Firestore connection failed:', error);
  }

  try {
    // Test Realtime Database connection
    console.log('⚡ Testing Realtime Database...');
    const testRef = ref(realtimeDb, '.info/connected');
    await get(testRef);
    console.log('✅ Realtime Database connection successful');
  } catch (error) {
    console.log('❌ Realtime Database connection failed:', error);
  }

  try {
    // Test Storage connection
    console.log('📦 Testing Storage...');
    const testStorageRef = storageRef(storage, '/');
    await listAll(testStorageRef);
    console.log('✅ Storage connection successful');
  } catch (error) {
    console.log('❌ Storage connection failed:', error);
  }

  console.log('\n🎉 Firebase setup test completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Copy .env.local.example to .env.local');
  console.log('2. Update environment variables with your Firebase config');
  console.log('3. Deploy Firestore and Realtime Database security rules');
  console.log('4. Import Firebase services: import { userService, realtimeService, storageService } from "@/lib/firebase"');
}

// Only run if this file is executed directly
if (require.main === module) {
  testFirebaseConnection().catch(console.error);
}

export default testFirebaseConnection;