/**
 * FirebaseConfig - Inisialisasi dan konfigurasi Firebase.
 * 
 * PENTING: File ini adalah Single Source of Truth untuk koneksi database.
 * Logika deteksi emulator HARUS ada di sini, bukan di main.js atau controller,
 * agar semua modul yang mengimpor 'db' otomatis terhubung ke emulator saat development.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 1. Import konfigurasi dari file env.js
import { ENV } from './env.js';

// 2. Gunakan variabel dari ENV
const firebaseConfig = {
  apiKey: ENV.FIREBASE_API_KEY,
  authDomain: ENV.FIREBASE_AUTH_DOMAIN,
  projectId: ENV.FIREBASE_PROJECT_ID,
  storageBucket: ENV.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: ENV.FIREBASE_MESSAGING_SENDER_ID,
  appId: ENV.FIREBASE_APP_ID
};

// 3. Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 4. Logika Deteksi Emulator (HYBRID MODE)
// Auth tetap PRODUCTION (Google Sign-In asli), Firestore ke EMULATOR saat localhost.
const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '[::1]'
);

if (isLocalhost) {
  try {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    console.log('🔧 [FirebaseConfig] Firestore Emulator AKTIF (127.0.0.1:8080). Auth tetap PRODUCTION.');
  } catch (err) {
    console.warn('⚠️ [FirebaseConfig] Gagal connect ke Firestore Emulator (mungkin sudah pernah di-connect):', err.message);
  }
} else {
  console.log('🌐 [FirebaseConfig] Mode PRODUCTION penuh (Auth + Firestore ke Firebase Cloud).');
}

export { app, auth, db };