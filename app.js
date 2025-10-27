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

// DOM
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
const msgBox = document.getElementById("authMsg");
const loader = document.getElementById("loader");

// Helper functions
function showMsg(text, color="#000") {
  msgBox.textContent = text;
  msgBox.style.color = color;
}

function toggleLoader(show=true) {
  loader.style.display = show ? "block" : "none";
}

// Auth actions
signupBtn.onclick = () => {
  const email = emailInput.value.trim();
  const pass = passwordInput.value.trim();
  if (!email || !pass) return showMsg("Please enter email and password", "red");

  toggleLoader(true);
  showMsg("Creating your account…");
  auth.createUserWithEmailAndPassword(email, pass)
    .then(() => showMsg("Account created successfully!", "green"))
    .catch(err => {
      let message = "Something went wrong.";
      if (err.code === "auth/email-already-in-use") message = "You already have an account.";
      if (err.code === "auth/weak-password") message = "Password too weak (min 6 chars).";
      showMsg(message, "red");
    })
    .finally(() => toggleLoader(false));
};

loginBtn.onclick = () => {
  const email = emailInput.value.trim();
  const pass = passwordInput.value.trim();
  if (!email || !pass) return showMsg("Enter your email and password", "red");

  toggleLoader(true);
  showMsg("Signing you in…");
  auth.signInWithEmailAndPassword(email, pass)
    .then(() => showMsg("Welcome back!", "green"))
    .catch(err => {
      let message = "Login failed.";
      if (err.code === "auth/user-not-found") message = "No account found, please sign up.";
      if (err.code === "auth/wrong-password") message = "Incorrect password.";
      showMsg(message, "red");
    })
    .finally(() => toggleLoader(false));
};

logoutBtn.onclick = () => auth.signOut();

// Listen for Auth
auth.onAuthStateChanged(user => {
  if (user) {
    userDisplay.textContent = user.email;
    fadeSwitch(authSection, postSection);
    logoutBtn.style.display = "inline-block";
    loadFeed();
  } else {
    userDisplay.textContent = "Not signed in";
    fadeSwitch(postSection, authSection);
    logoutBtn.style.display = "none";
  }
});

function fadeSwitch(hideEl, showEl) {
  hideEl.classList.remove("show");
  hideEl.classList.add("fade");
  showEl.classList.remove("fade");
  showEl.classList.add("show");
  hideEl.style.display = "none";
  showEl.style.display = "block";
}

// Posts
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
            <button onclick="toggleLike('${id}')">${isLiked ? "♥" : "♡"} ${ping.likes.length}</button>
          </div>
        `;
        feed.appendChild(el);
      });
    });
}

async function toggleLike(id) {
  const user = auth.currentUser.email;
  const ref = db.collection("pings").doc(id);
  const docSnap = await ref.get();
  if (!docSnap.exists) return;

  const likes = docSnap.data().likes || [];
  if (likes.includes(user)) {
    await ref.update({ likes: likes.filter(u => u !== user) });
  } else {
    await ref.update({ likes: [...likes, user] });
  }
}
