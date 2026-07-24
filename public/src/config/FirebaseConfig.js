import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

// PENTING: koneksi ke Emulator HARUS ditaruh di sini (bukan di main.js).
// Kenapa? Karena FirebaseConfig.js adalah satu-satunya sumber `db` untuk SEMUA
// halaman (index.html, family-form.html, halaman baru nanti). Kalau ditaruh di
// main.js, halaman yang tidak me-load main.js (misal family-form.html yang
// entry point-nya langsung FamilyFormController.js) tidak akan pernah
// tersambung ke emulator, dan datanya diam-diam masuk ke Firestore PRODUCTION.
//
// Mode yang dipakai: HYBRID — Auth tetap PRODUCTION (Google Sign-In asli),
// Firestore ke EMULATOR saat development lokal. Auth sengaja TIDAK diarahkan
// ke Auth Emulator karena project ini tidak menjalankan Auth Emulator
// (lihat firebase.json / firebase-debug.log: cuma "firestore" & "hosting"),
// jadi connectAuthEmulator() akan gagal connect dan bikin popup login error
// (auth/popup-closed-by-user).
const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '[::1]'
);

if (isLocalhost) {
  try {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    console.log('🔧 [FirebaseConfig] Firestore Emulator AKTIF (127.0.0.1:8080). Auth tetap PRODUCTION (Google Sign-In asli).');
  } catch (err) {
    // Firestore hanya boleh di-connect ke emulator SEKALI per page load.
    // Kalau ada modul lain yang sempat memakai `db` sebelum baris ini
    // (seharusnya tidak mungkin karena ini dieksekusi saat import pertama),
    // connectFirestoreEmulator akan throw. Log saja, jangan hentikan aplikasi.
    console.warn('⚠️ [FirebaseConfig] Gagal connect ke Firestore Emulator (mungkin sudah pernah di-connect):', err.message);
  }
} else {
  console.log('🌐 [FirebaseConfig] Mode PRODUCTION penuh (Auth + Firestore ke Firebase Cloud).');
}

export { app, auth, db };
