// === Firebase Config ===
const firebaseConfig = {
  apiKey: "AIzaSyCq_XEdRwe1lRA7y2FfljFmfa5n-zQWJSw",
  authDomain: "ipingonline.firebaseapp.com",
  projectId: "ipingonline",
  storageBucket: "ipingonline.firebasestorage.app",
  messagingSenderId: "880672073705",
  appId: "1:880672073705:web:d1bce5f5b3f8cf001a4d78",
  measurementId: "G-LN4GBVV603"
};

// === Initialize Firebase ===
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// === DOM Elements ===
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userDisplay = document.getElementById("userDisplay");
const authSection = document.getElementById("authSection");
const postSection = document.getElementById("postSection");
const feed = document.getElementById("feed");
const form = document.getElementById("pingForm");
const input = document.getElementById("pingInput");

// === AUTH ===
signupBtn.onclick = () => {
  auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
    .catch(err => alert(err.message));
};

loginBtn.onclick = () => {
  auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
    .catch(err => alert(err.message));
};

logoutBtn.onclick = () => auth.signOut();

// === Listen for Auth State ===
auth.onAuthStateChanged(user => {
  if (user) {
    userDisplay.textContent = user.email;
    authSection.style.display = "none";
    postSection.style.display = "block";
    logoutBtn.style.display = "inline-block";
    loadFeed();
  } else {
    userDisplay.textContent = "Not signed in";
    authSection.style.display = "block";
    postSection.style.display = "none";
    logoutBtn.style.display = "none";
  }
});

// === Post a Ping ===
form.addEventListener("submit", async e => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  const user = auth.currentUser;
  await db.collection("pings").add({
    text,
    user: user.email,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    likes: []
  });

  input.value = "";
});

// === Load Feed (Real Time) ===
function loadFeed() {
  db.collection("pings")
    .orderBy("timestamp", "desc")
    .onSnapshot(snapshot => {
      feed.innerHTML = "";
      snapshot.forEach(doc => {
        const ping = doc.data();
        const id = doc.id;
        const isLiked = ping.likes.includes(auth.currentUser.email);

        const el = document.createElement("div");
        el.className = "post";
        el.innerHTML = `
          <div class="meta">
            <span>${ping.user}</span>
            <span>${ping.timestamp?.toDate().toLocaleString() || "now"}</span>
          </div>
          <div class="text">${ping.text}</div>
          <div class="actions">
            <button onclick="toggleLike('${id}')">
              ${isLiked ? "♥" : "♡"} ${ping.likes.length}
            </button>
          </div>
        `;
        feed.appendChild(el);
      });
    });
}

// === Like / Unlike ===
async function toggleLike(id) {
  const user = auth.currentUser.email;
  const ref = db.collection("pings").doc(id);
  const docSnap = await ref.get();
  if (!docSnap.exists) return;

  const likes = docSnap.data().likes || [];
  if (likes.includes(user)) {
    await ref.update({
      likes: likes.filter(u => u !== user)
    });
  } else {
    await ref.update({
      likes: [...likes, user]
    });
  }
}
