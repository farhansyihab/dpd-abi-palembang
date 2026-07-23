/**
 * main.js - Entry point aplikasi.
 * Mengatur alur: cek status login → tampilkan UI yang sesuai.
 * Analogi PHP: Seperti index.php yang load semua komponen.
 */

// Aktifkan emulator hanya saat development lokal
import { connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './config/FirebaseConfig.js';

// Cek apakah kita di localhost (emulator mode)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  // connectAuthEmulator(auth, 'http://127.0.0.1:9099');
  console.log('🔧 Mode EMULATOR aktif');
}


import { AuthService } from './services/AuthService.js';
import { Logger } from './core/Logger.js';

const MODULE_NAME = 'Main';

// Referensi ke elemen UI (mirip Dim btnLogin As Button di VB)
const loginView = document.getElementById('loginView');
const loadingView = document.getElementById('loadingView');
const successView = document.getElementById('successView');
const errorView = document.getElementById('errorView');
const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout');
const btnRetry = document.getElementById('btnRetry');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const authStatus = document.getElementById('authStatus');
const errorMessage = document.getElementById('errorMessage');

/**
 * Tampilkan satu view, sembunyikan yang lain
 */
function showView(viewName) {
  loginView.classList.add('d-none');
  loadingView.classList.add('d-none');
  successView.classList.add('d-none');
  errorView.classList.add('d-none');

  const target = document.getElementById(viewName);
  if (target) target.classList.remove('d-none');
}

/**
 * Handle klik tombol login
 */
async function handleLogin() {
  try {
    showView('loadingView');
    const user = await AuthService.signInWithGoogle();

    // Cek apakah email ada di whitelist
    const isAuthorized = await AuthService.checkAuthorization(user.email);

    if (!isAuthorized) {
      // Email tidak di whitelist → logout paksa dan tampilkan error
      await AuthService.signOutUser();
      showView('errorView');
      errorMessage.textContent = `Email ${user.email} tidak terdaftar dalam whitelist. Silakan hubungi administrator.`;
      return;
    }

    // Authorized → tampilkan success view (onAuthStateChanged akan handle detail)
    Logger.info(MODULE_NAME, 'User authorized, menunggu onAuthStateChanged...');
  } catch (error) {
    showView('errorView');
    errorMessage.textContent = error.message || 'Terjadi kesalahan saat login.';
    Logger.error(MODULE_NAME, 'Login error', error);
  }
}

/**
 * Handle klik tombol logout
 */
async function handleLogout() {
  try {
    await AuthService.signOutUser();
  } catch (error) {
    Logger.error(MODULE_NAME, 'Logout error', error);
  }
}

/**
 * Setup listener untuk perubahan status auth
 * Ini akan dipanggil otomatis saat halaman load dan setiap kali status berubah
 */
function setupAuthListener() {
  AuthService.onAuthStateChanged(async (user) => {
    if (user) {
      // User sedang login
      Logger.info(MODULE_NAME, 'User terdeteksi login', { email: user.email });
      userName.textContent = user.displayName || user.email;
      userEmail.textContent = user.email;

      // Cek authorization status untuk ditampilkan di UI
      try {
        const isAuthorized = await AuthService.checkAuthorization(user.email);
        if (isAuthorized) {
          authStatus.innerHTML = '<span class="badge bg-success">✓ Authorized</span>';
        } else {
          authStatus.innerHTML = '<span class="badge bg-danger">✗ Not Authorized</span>';
        }
      } catch (err) {
        authStatus.innerHTML = '<span class="badge bg-warning">? Auth Check Failed</span>';
      }

      showView('successView');
    } else {
      // User tidak login → tampilkan view login
      Logger.info(MODULE_NAME, 'User tidak login, tampilkan form login');
      showView('loginView');
    }
  });
}

/**
 * Inisialisasi aplikasi
 */
function init() {
  Logger.info(MODULE_NAME, 'Aplikasi dimulai...');

  // Pasang event listener ke tombol (mirip Handles btnLogin.Click di VB)
  btnLogin.addEventListener('click', handleLogin);
  btnLogout.addEventListener('click', handleLogout);
  btnRetry.addEventListener('click', handleLogin);

  // Mulai dengarkan perubahan status auth
  setupAuthListener();
}

// Jalankan init setelah DOM siap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ===== DEBUG MODE: Expose ke window untuk uji console =====
// HAPUS bagian ini sebelum deploy production!

console.log('🔄 Memuat Repository untuk debug...');

import('./repositories/FamilyRepository.js')
  .then(mod => {
    window.FamilyRepository = mod.FamilyRepository;
    window.familyRepo = new mod.FamilyRepository();
    console.log('✅ FamilyRepository berhasil dimuat. Ketik: window.familyRepo');
  })
  .catch(err => {
    console.error('❌ GAGAL memuat FamilyRepository! Cek apakah file sudah dibuat di folder yang benar.', err);
  });

import('./repositories/PersonRepository.js')
  .then(mod => {
    window.PersonRepository = mod.PersonRepository;
    window.personRepo = new mod.PersonRepository();
    console.log('✅ PersonRepository berhasil dimuat. Ketik: window.personRepo');
  })
  .catch(err => {
    console.error('❌ GAGAL memuat PersonRepository! Cek apakah file sudah dibuat di folder yang benar.', err);
  });