/**
 * MobileNavbarComponent - Bottom navigation untuk versi mobile.
 * 
 * CARA PAKAI:
 * 1. Di HTML, tambahkan: <div id="mobile-navbar-container"></div> sebelum </body>
 * 2. Import dan panggil: renderMobileNavbar()
 * 
 * CATATAN:
 * - Tidak dipakai di index.html (halaman login)
 * - Posisi fixed di bawah (bottom nav) seperti aplikasi mobile native
 * - Auto-detect halaman aktif dari URL
 */
import { AuthService } from '/src/services/AuthService.js';
import { Logger } from '/src/core/Logger.js';

const MODULE_NAME = 'MobileNavbarComponent';

/**
 * Render bottom navigation ke container.
 * @param {string} containerId - ID container (default: 'mobile-navbar-container')
 */
export function renderMobileNavbar(containerId = 'mobile-navbar-container') {
    const container = document.getElementById(containerId);
    if (!container) {
        Logger.warn(MODULE_NAME, `Container "${containerId}" tidak ditemukan di DOM`);
        return;
    }

    const currentPath = window.location.pathname;

    // Menu items - semua mengarah ke versi mobile
    const menuItems = [
        {
            href: '/',
            label: 'Home',
            icon: 'bi-house-door-fill',
            matchPaths: ['/', '/index.html']
        },
        {
            href: '/mobile/family-form.html',
            label: 'Tambah',
            icon: 'bi-person-plus-fill',
            matchPaths: ['/mobile/family-form.html', '/family-form.html']
        },
        {
            href: '/mobile/search.html',
            label: 'Cari',
            icon: 'bi-search',
            matchPaths: ['/mobile/search.html', '/search.html']
        },
        {
            href: '/mobile/report.html',
            label: 'Laporan',
            icon: 'bi-file-earmark-pdf-fill',
            matchPaths: ['/mobile/report.html', '/report.html']
        }
    ];

    // Generate HTML menu items
    const navLinksHtml = menuItems.map(item => {
        const isActive = item.matchPaths.some(p => currentPath === p) ||
            (currentPath.includes('person-form.html') && item.href.includes('family-form'));
        return `
            <a href="${item.href}" class="mobile-nav-item ${isActive ? 'active' : ''}">
                <i class="bi ${item.icon}"></i>
                <span>${item.label}</span>
            </a>
        `;
    }).join('');

    // Render bottom nav
    container.innerHTML = `
        <nav class="mobile-bottom-nav" aria-label="Navigasi utama">
            ${navLinksHtml}
        </nav>
    `;

    Logger.info(MODULE_NAME, 'Bottom navigation berhasil di-render');
}