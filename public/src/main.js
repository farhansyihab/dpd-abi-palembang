/**
 * main.js - Entry point aplikasi.
 * Mengatur alur: cek status login → tampilkan UI yang sesuai.
 * Analogi PHP: Seperti index.php yang load semua komponen.
 */


import { auth, db } from './config/FirebaseConfig.js';
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
      Logger.info(MODULE_NAME, 'User terdeteksi login', { email: user.email });
      userName.textContent = user.displayName || user.email;
      userEmail.textContent = user.email;

      try {
        const isAuthorized = await AuthService.checkAuthorization(user.email);

        if (isAuthorized) {
          authStatus.innerHTML = '<span class="badge bg-success">✓ Authorized</span>';

          // 🎯 BONUS UX: Redirect ke halaman yang dituju sebelum login
          const urlParams = new URLSearchParams(window.location.search);
          const returnUrl = urlParams.get('returnUrl');

          if (returnUrl && returnUrl !== '/') {
            Logger.info(MODULE_NAME, `Redirect ke halaman tujuan: ${returnUrl}`);

            setTimeout(() => {
              window.location.href = decodeURIComponent(returnUrl);
            }, 1000);

            // PENTING: return di sini agar eksekusi berhenti dan tidak lanjut ke showView
            return;
          }

          // Jika tidak ada returnUrl, tampilkan success view
          showView('successView');

        } else {
          // JIKA TIDAK AUTHORIZED, JANGAN REDIRECT. Tampilkan error dan berhenti.
          authStatus.innerHTML = '<span class="badge bg-danger">✗ Not Authorized</span>';
          Logger.warn(MODULE_NAME, `User ${user.email} tidak ada di whitelist`);
          showView('errorView'); // Atau biarkan di successView tapi dengan badge merah
          errorMessage.textContent = `Email ${user.email} tidak memiliki akses. Silakan hubungi admin.`;
        }
      } catch (err) {
        authStatus.innerHTML = '<span class="badge bg-warning">? Auth Check Failed</span>';
        Logger.error(MODULE_NAME, 'Gagal cek otorisasi di auth listener', err);
      }

    } else {
      // User tidak login → tampilkan view login
      Logger.info(MODULE_NAME, 'User tidak login, tampilkan form login');
      showView('loginView');
    }
  });
}

// ==========================================
// SMART ROUTING: Deteksi Layar & Arahkan
// ==========================================
/**
 * Fungsi untuk mengarahkan pengguna ke versi Mobile atau Desktop
 * berdasarkan lebar layar saat ini.
 * @param {string} desktopPath - Path tujuan versi desktop (misal: '/family-form.html')
 */
function navigateBasedOnScreen(desktopPath) {
  // 768px adalah breakpoint standar untuk tablet kecil / smartphone (max 10 inch)
  const isMobileScreen = window.innerWidth <= 768;

  if (isMobileScreen) {
    // Arahkan ke folder /mobile/
    window.location.href = `/mobile${desktopPath}`;
  } else {
    // Arahkan ke versi desktop normal
    window.location.href = desktopPath;
  }
}

// Pasang Event Listener ke Menu Dashboard saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
  const menuFamily = document.getElementById('menuFamily');
  const menuSearch = document.getElementById('menuSearch');
  const menuReport = document.getElementById('menuReport');

  if (menuFamily) {
    menuFamily.addEventListener('click', () => navigateBasedOnScreen('/family-form.html'));
    // Dukungan keyboard untuk aksesibilitas
    menuFamily.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') navigateBasedOnScreen('/family-form.html');
    });
  }

  if (menuSearch) {
    menuSearch.addEventListener('click', () => navigateBasedOnScreen('/search.html'));
    menuSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') navigateBasedOnScreen('/search.html');
    });
  }

  if (menuReport) {
    menuReport.addEventListener('click', () => navigateBasedOnScreen('/report.html'));
    menuReport.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') navigateBasedOnScreen('/report.html');
    });
  }
});
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


// ==========================================
// DEBUG MODE: Hanya aktif di lingkungan lokal
// ==========================================
// Mekanisme ini menjamin tools debug TIDAK AKAN PERNAH ter-load di production (Firebase Hosting),
// menghilangkan risiko operasional lupa menghapus kode debug sebelum deploy.
const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '[::1]'
);

if (isLocalhost) {
  console.log('🔧 [main.js] Lingkungan lokal terdeteksi. Memuat debug-tools.js...');
  import('./debug-tools.js')
    .then(() => {
      console.log('✅ [main.js] Debug tools berhasil dimuat.');
    })
    .catch(err => {
      console.warn('⚠️ [main.js] Gagal memuat debug tools:', err);
    });
}