/**
 * NavbarComponent - Komponen navbar seragam untuk semua halaman yang sudah login.
 * 
 * FITUR:
 * - Menu seragam: Dashboard, + Tambah Keluarga, Cari, Laporan, Logout
 * - Auto-detect halaman aktif (highlight menu yang sedang dibuka)
 * - Responsive (hamburger menu di mobile)
 * - Tombol logout dengan konfirmasi
 * 
 * CARA PAKAI:
 * 1. Di HTML, tambahkan: <div id="navbar-container"></div>
 * 2. Import dan panggil: renderNavbar()
 * 
 * CATATAN:
 * - Tidak dipakai di index.html (halaman login)
 * - Bootstrap JS harus sudah di-load sebelum komponen ini di-render
 */
import { AuthService } from '../services/AuthService.js';
import { Logger } from '../core/Logger.js';

const MODULE_NAME = 'NavbarComponent';

/**
 * Render navbar ke container yang ditentukan.
 * @param {string} containerId - ID elemen container (default: 'navbar-container')
 */
export function renderNavbar(containerId = 'navbar-container') {
    const container = document.getElementById(containerId);
    if (!container) {
        Logger.warn(MODULE_NAME, `Container dengan ID "${containerId}" tidak ditemukan di DOM`);
        return;
    }

    // Detect halaman aktif dari URL
    const currentPath = window.location.pathname;

    // Definisi menu navbar
    const menuItems = [
        {
            href: '/',
            label: 'Dashboard',
            icon: 'bi-house-door',
            path: '/'
        },
        {
            href: '/family-form.html',
            label: '+ Tambah Keluarga',
            icon: 'bi-people-fill',
            path: '/family-form.html'
        },
        {
            href: '/search.html',
            label: 'Cari',
            icon: 'bi-search',
            path: '/search.html'
        },
        {
            href: '/report.html',
            label: 'Laporan',
            icon: 'bi-file-earmark-pdf',
            path: '/report.html'
        }
    ];

    // Generate HTML untuk menu items
    const navLinksHtml = menuItems.map(item => {
        const isActive = currentPath === item.path;
        return `
            <li class="nav-item">
                <a class="nav-link ${isActive ? 'active' : ''}" href="${item.href}">
                    <i class="bi ${item.icon} me-1"></i>${item.label}
                </a>
            </li>
        `;
    }).join('');

    // Render navbar ke container
    container.innerHTML = `
        <nav class="navbar navbar-expand-lg navbar-dark mb-4 shadow-sm">
            <div class="container">
                <a class="navbar-brand fw-bold" href="/">
                    <i class="bi bi-house-door me-2"></i>DPD ABI Palembang
                </a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" 
                        data-bs-target="#mainNavbar" aria-controls="mainNavbar" 
                        aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="mainNavbar">
                    <ul class="navbar-nav ms-auto align-items-lg-center">
                        ${navLinksHtml}
                        <li class="nav-item ms-lg-3 mt-2 mt-lg-0">
                            <button id="btnLogout" class="btn btn-outline-light btn-sm">
                                <i class="bi bi-box-arrow-right me-1"></i>Logout
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    `;

    // Setup event listener untuk tombol logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', handleLogout);
    }

    Logger.info(MODULE_NAME, 'Navbar berhasil di-render');
}

/**
 * Handle klik tombol logout
 */
async function handleLogout() {
    if (!confirm('Yakin ingin logout?')) return;

    try {
        Logger.info(MODULE_NAME, 'User meminta logout');
        await AuthService.signOutUser();
        window.location.href = '/';
    } catch (error) {
        Logger.error(MODULE_NAME, 'Logout gagal', error);
        alert('Gagal logout. Silakan coba lagi.');
    }
}