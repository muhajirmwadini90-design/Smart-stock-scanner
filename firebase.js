import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBQqdSVmD__W1Bzpso-QKlIMN-O-1hJufE",
  authDomain: "smartscan-1baad.firebaseapp.com",
  projectId: "smartscan-1baad",
  storageBucket: "smartscan-1baad.firebasestorage.app",
  messagingSenderId: "1057513469205",
  appId: "1:1057513469205:web:e4eb03c1c2a0d42adbe51c"
};

const app = initializeApp(firebaseConfig);
const db = geFirestore(app);

export { db };