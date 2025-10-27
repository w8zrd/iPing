/* =======================
   iPing - app.js
   ======================= */

import { initializeApp } from "firebase/app";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";

// TODO(developer) Replace the following with your app's Firebase configuration
// See: https://firebase.google.com/docs/web/learn-more#config-object
const firebaseConfig = {
  apiKey: "AIzaSyCq_XEdRwe1lRA7y2FfljFmfa5n-zQWJSw",
  authDomain: "ipingonline.firebaseapp.com",
  projectId: "ipingonline",
  storageBucket: "ipingonline.firebasestorage.app",
  messagingSenderId: "880672073705",
  appId: "1:880672073705:web:d1bce5f5b3f8cf001a4d78",
  measurementId: "G-LN4GBVV603"
};

// Initialize FirebaseApp
const firebaseApp = initializeApp(firebaseConfig);

// Initialize the Gemini Developer API backend service
const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });

// Create a `GenerativeModel` instance with a model that supports your use case
const model = getGenerativeModel(ai, { model: "gemini-2.5-flash" });

// Wrap in an async function so you can use await
async function run() {
  // Provide a prompt that contains text
  const prompt = "Write a story about a magic backpack."

  // To generate text output, call generateContent with the text input
  const result = await model.generateContent(prompt);

  const response = result.response;
  const text = response.text();
  console.log(text);
}

run();

// ---------- Firebase Setup ----------
const firebaseConfig = {
  apiKey: "AIzaSyCq_XEdRwe1lRA7y2FfljFmfa5n-zQWJSw",
  authDomain: "ipingonline.firebaseapp.com",
  projectId: "ipingonline",
  storageBucket: "ipingonline.firebasestorage.app",
  messagingSenderId: "880672073705",
  appId: "1:880672073705:web:d1bce5f5b3f8cf001a4d78",
  measurementId: "G-LN4GBVV603"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();


// ---------- Elements ----------
const authPanel = document.getElementById("authPanel");
const appPanel = document.getElementById("appPanel");
const feed = document.getElementById("feed");
const msg = document.getElementById("msg");
const loader = document.getElementById("loader");

// Auth inputs
const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");

// Post elements
const pingInput = document.getElementById("pingInput");
const pingBtn = document.getElementById("pingBtn");

// Nav buttons
const homeBtn = document.getElementById("homeBtn");
const searchBtn = document.getElementById("searchBtn");
const profileBtn = document.getElementById("profileBtn");

// Panels
const homePanel = document.getElementById("homePanel");
const searchPanel = document.getElementById("searchPanel");
const profilePanel = document.getElementById("profilePanel");

// Profile fields
const displayNameInput = document.getElementById("displayName");
const bioInput = document.getElementById("bio");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const userPingsDiv = document.getElementById("userPings");

// Search
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");


// ---------- Auth Logic ----------
signupBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const pass = passInput.value.trim();

  if (!email || !pass) return showMsg("Please fill in both fields.");

  showLoading("Creating account...");

  try {
    await auth.createUserWithEmailAndPassword(email, pass);
    hideLoading();
    showMsg("Account created successfully!");
  } catch (err) {
    hideLoading();
    showMsg(err.message);
  }
});

loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const pass = passInput.value.trim();

  if (!email || !pass) return showMsg("Please fill in both fields.");

  showLoading("Logging you in...");

  try {
    await auth.signInWithEmailAndPassword(email, pass);
    hideLoading();
    showMsg("Welcome back!");
  } catch (err) {
    hideLoading();
    showMsg(err.message);
  }
});

auth.onAuthStateChanged(user => {
  const globalLoader = document.getElementById("globalLoader");

  // Show loading spinner while Firebase checks
  globalLoader.style.display = "flex";
  authPanel.style.display = "none";
  appPanel.style.display = "none";

  setTimeout(() => {
    globalLoader.style.display = "none";
    if (user) {
      authPanel.style.display = "none";
      appPanel.style.display = "block";
      loadFeed();
      setActive(homeBtn, homePanel);
    } else {
      appPanel.style.display = "none";
      authPanel.style.display = "block";
    }
  }, 1200);
});


// ---------- Feed Logic ----------
async function loadFeed() {
  feed.innerHTML = "<p class='fade-in' style='text-align:center;'>Loading feed...</p>";
  const snapshot = await db.collection("pings").orderBy("createdAt", "desc").get();

  if (snapshot.empty) {
    feed.innerHTML = "<p style='text-align:center;'>No pings yet. Be the first!</p>";
    return;
  }

  feed.innerHTML = "";
  snapshot.forEach(doc => {
    const ping = doc.data();
    feed.innerHTML += renderPost(doc.id, ping);
  });
}

pingBtn.addEventListener("click", async () => {
  const text = pingInput.value.trim();
  if (!text) return;

  const user = auth.currentUser;
  if (!user) return;

  pingInput.value = "";
  await db.collection("pings").add({
    text,
    userId: user.uid,
    userEmail: user.email,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    likes: 0,
    comments: []
  });

  loadFeed();
});


// ---------- Like & Comment Logic ----------
async function likePost(id) {
  const ref = db.collection("pings").doc(id);
  const doc = await ref.get();
  const data = doc.data();
  await ref.update({ likes: (data.likes || 0) + 1 });
  loadFeed();
}

async function addComment(id) {
  const input = document.getElementById(`comment-${id}`);
  const text = input.value.trim();
  if (!text) return;

  const ref = db.collection("pings").doc(id);
  const doc = await ref.get();
  const data = doc.data();

  const newComments = data.comments || [];
  newComments.push(text);

  await ref.update({ comments: newComments });
  loadFeed();
}

function renderPost(id, ping) {
  let commentsHTML = "";
  if (ping.comments && ping.comments.length > 0) {
    ping.comments.forEach(c => {
      commentsHTML += `<div class="comment">${c}</div>`;
    });
  }

  return `
    <div class="post fade-in">
      <div class="meta">
        <span>${ping.userEmail || "Anonymous"}</span>
        <span>${ping.createdAt ? new Date(ping.createdAt.toDate()).toLocaleString() : "..."}</span>
      </div>
      <div class="text">${ping.text}</div>
      <div class="actions">
        <button onclick="likePost('${id}')">❤️ ${ping.likes || 0}</button>
      </div>
      <div class="comment-section">
        ${commentsHTML}
        <input id="comment-${id}" class="comment-input" placeholder="Add a comment...">
        <button class="light-btn" onclick="addComment('${id}')">Reply</button>
      </div>
    </div>
  `;
}


// ---------- Search ----------
searchInput.addEventListener("input", async (e) => {
  const query = e.target.value.toLowerCase();
  if (!query) {
    searchResults.innerHTML = "";
    return;
  }

  const snapshot = await db.collection("pings").get();
  searchResults.innerHTML = "";

  snapshot.forEach(doc => {
    const ping = doc.data();
    if (ping.text.toLowerCase().includes(query)) {
      searchResults.innerHTML += renderPost(doc.id, ping);
    }
  });
});


// ---------- Profile ----------
saveProfileBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const displayName = displayNameInput.value.trim();
  const bio = bioInput.value.trim();

  await db.collection("profiles").doc(user.uid).set({
    displayName,
    bio,
    userEmail: user.email
  });

  showMsg("Profile saved!");
  loadUserPings();
});

async function loadUserPings() {
  const user = auth.currentUser;
  const snapshot = await db.collection("pings").where("userId", "==", user.uid).get();

  userPingsDiv.innerHTML = "";
  snapshot.forEach(doc => {
    const ping = doc.data();
    userPingsDiv.innerHTML += renderPost(doc.id, ping);
  });
}


// ---------- Navigation ----------
function setActive(btn, panel) {
  [homeBtn, searchBtn, profileBtn].forEach(b => b.classList.remove("active"));
  [homePanel, searchPanel, profilePanel].forEach(p => p.style.display = "none");

  btn.classList.add("active");
  panel.style.display = "block";
}

homeBtn.addEventListener("click", () => {
  setActive(homeBtn, homePanel);
  loadFeed();
});

searchBtn.addEventListener("click", () => {
  setActive(searchBtn, searchPanel);
});

profileBtn.addEventListener("click", () => {
  setActive(profileBtn, profilePanel);
  loadUserPings();
});


// ---------- Utility ----------
function showMsg(text) {
  msg.innerText = text;
  setTimeout(() => { msg.innerText = ""; }, 3000);
}

function showLoading(text) {
  msg.innerHTML = `<div class="loader"></div><p>${text}</p>`;
}

function hideLoading() {
  msg.innerHTML = "";
}
