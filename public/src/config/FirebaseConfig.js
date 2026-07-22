import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ⚠️ PENTING: Ganti 3 nilai di bawah dengan data dari Firebase Console
// Firebase Console > Project Settings > Your apps > Web app
const firebaseConfig = {
  apiKey: "AIzaSyDc9uNTAe36dNGrDUax2em73jeELMgCHxI",
  authDomain: "dpd-abi-palembang.firebaseapp.com",
  projectId: "dpd-abi-palembang",
  storageBucket: "dpd-abi-palembang.firebasestorage.app",
  messagingSenderId: "497797297678",
  appId: "1:497797297678:web:e8a37796f785ead6056e5f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

// // src/config/FirebaseConfig.js
// import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
// import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// // TODO: Ganti dengan konfigurasi dari Firebase Console > Project Settings > Your apps
//   const firebaseConfig = {
//     apiKey: "AIzaSyDc9uNTAe36dNGrDUax2em73jeELMgCHxI",
//     authDomain: "dpd-abi-palembang.firebaseapp.com",
//     projectId: "dpd-abi-palembang",
//     storageBucket: "dpd-abi-palembang.firebasestorage.app",
//     messagingSenderId: "497797297678",
//     appId: "1:497797297678:web:e8a37796f785ead6056e5f"
//   };

// // 1. Inisialisasi Firebase App
// const app = initializeApp(firebaseConfig);

// // 2. Inisialisasi Layanan (Auth & Firestore)
// const auth = getAuth(app);
// const db = getFirestore(app);

// // 3. Aktifkan offline persistence (Jaring pengaman sesuai Rancangan Bagian 6)
// // Ini memungkinkan aplikasi tetap bisa baca data yang sudah di-cache saat sinyal terputus
// enableIndexedDbPersistence(db).catch((err) {
//   if (err.code === 'failed-precondition') {
//     console.warn('Persistence failed: Multiple tabs open.');
//   } else if (err.code === 'unimplemented') {
//     console.warn('Persistence not supported by this browser.');
//   }
// });

// export { app, auth, db };
