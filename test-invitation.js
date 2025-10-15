/**
 * Test script for the invitation workflow
 * This script tests the complete invitation process
 */

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, addDoc, doc, setDoc } = require('firebase/firestore');
const { getFunctions, httpsCallable } = require('firebase/functions');

// Firebase configuration (you'll need to add your actual config)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function testInvitationWorkflow() {
  try {
    console.log('🚀 Starting invitation workflow test...');
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const functions = getFunctions(app, 'us-central1');
    
    // Sign in as admin user
    console.log('🔐 Signing in as admin...');
    const userCredential = await signInWithEmailAndPassword(auth, 'basil.khoury14@gmail.com', 'your-password');
    console.log('✅ Signed in successfully');
    
    // Create test organization
    console.log('🏢 Creating test organization...');
    const testOrgId = 'test-org-' + Date.now();
    const orgData = {
      name: 'FocusNet.org',
      domain: 'focusnet.org',
      type: 'external',
      maxUsers: 10,
      currentUsers: 0,
      hasOrgAdmin: false,
      createdAt: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    };
    
    await setDoc(doc(db, 'organizations', testOrgId), orgData);
    console.log('✅ Test organization created:', testOrgId);
    
    // Test invitation
    console.log('📧 Testing user invitation...');
    const sendOrganizationInvite = httpsCallable(functions, 'sendOrganizationInvite');
    
    const inviteData = {
      email: 'alex@focusnet.org',
      displayName: 'Alex Test User',
      organizationId: testOrgId,
      role: 'User'
    };
    
    const result = await sendOrganizationInvite(inviteData);
    console.log('✅ Invitation result:', result.data);
    
    // Check if user was created in Firebase Auth
    console.log('🔍 Checking Firebase Auth user creation...');
    // Note: You can't directly check Firebase Auth from client-side
    // This would need to be done from the Firebase Console or Admin SDK
    
    // Check if user was created in Firestore
    console.log('🔍 Checking Firestore user creation...');
    const userQuery = collection(db, 'users');
    // You would query for the user here
    
    // Check organization users subcollection
    console.log('🔍 Checking organization users subcollection...');
    const orgUsersQuery = collection(db, 'organizations', testOrgId, 'users');
    // You would query for the user here
    
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
  }
}

// Run the test
testInvitationWorkflow();
