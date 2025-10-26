// Paste your Firebase config below 👇
const firebaseConfig = {
  apiKey: "AIzaSyCq_XEdRwe1lRA7y2FfljFmfa5n-zQWJSw",
  authDomain: "ipingonline.firebaseapp.com",
  projectId: "ipingonline",
  storageBucket: "ipingonline.firebasestorage.app",
  messagingSenderId: "880672073705",
  appId: "1:880672073705:web:d1bce5f5b3f8cf001a4d78",
  measurementId: "G-LN4GBVV603"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const form = document.getElementById("pingForm");
const input = document.getElementById("pingInput");
const feed = document.getElementById("feed");

// Add new ping
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  await db.collection("pings").add({
    text,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  input.value = "";
});

// Real-time feed
db.collection("pings")
  .orderBy("timestamp", "desc")
  .onSnapshot(snapshot => {
    feed.innerHTML = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const el = document.createElement("div");
      el.className = "ping";
      el.innerHTML = `
        <p>${data.text}</p>
        <time>${data.timestamp?.toDate().toLocaleString() || "just now"}</time>
      `;
      feed.appendChild(el);
    });
  });
