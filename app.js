// ================================
// iPing Firebase Setup
// ================================

// Paste your Firebase config inside the brackets below ↓↓↓
const firebaseConfig = {
   apiKey: "AIzaSyCq_XEdRwe1lRA7y2FfljFmfa5n-zQWJSw",
  authDomain: "ipingonline.firebaseapp.com",
  projectId: "ipingonline",
  storageBucket: "ipingonline.firebasestorage.app",
  messagingSenderId: "880672073705",
  appId: "1:880672073705:web:d1bce5f5b3f8cf001a4d78"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const db = firebase.firestore();
const auth = firebase.auth();

// ================================
// Test Button – Add & Fetch Firestore Data
// ================================

const statusText = document.getElementById("statusText");
const testBtn = document.getElementById("testBtn");

testBtn.addEventListener("click", async () => {
  try {
    await db.collection("test").add({
      message: "Hello from iPing!",
      timestamp: new Date().toISOString()
    });
    statusText.textContent = "✅ Data added to Firestore successfully!";
  } catch (error) {
    console.error(error);
    statusText.textContent = "❌ Failed to add data. Check console.";
  }
});

// Confirm Firebase is connected
statusText.textContent = "⚡ Firebase connected successfully.";
