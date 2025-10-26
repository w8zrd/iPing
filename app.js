import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, onSnapshot, orderBy, query 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  // paste your firebase config here
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM refs
const email = document.getElementById("email");
const password = document.getElementById("password");
const signup = document.getElementById("signup");
const login = document.getElementById("login");
const appSection = document.getElementById("app");
const authSection = document.getElementById("auth");
const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");
const feed = document.getElementById("feed");

// Auth
signup.onclick = () => createUserWithEmailAndPassword(auth, email.value, password.value)
  .catch(e => alert(e.message));
login.onclick = () => signInWithEmailAndPassword(auth, email.value, password.value)
  .catch(e => alert(e.message));

onAuthStateChanged(auth, user => {
  if (user) {
    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    showFeed();
  } else {
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
  }
});

// Feed
async function showFeed() {
  const postsRef = collection(db, "posts");
  const q = query(postsRef, orderBy("time", "desc"));
  onSnapshot(q, snapshot => {
    feed.innerHTML = "";
    snapshot.forEach(doc => {
      const p = doc.data();
      feed.innerHTML += `
        <div class="post">
          <b>${p.user}</b><br/>
          ${p.text}
        </div>`;
    });
  });
}

postBtn.onclick = async () => {
  if (!postText.value.trim()) return;
  await addDoc(collection(db, "posts"), {
    text: postText.value,
    user: auth.currentUser.email,
    time: Date.now()
  });
  postText.value = "";
};
