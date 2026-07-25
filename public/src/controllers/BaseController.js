/**
 * BaseController - Class dasar untuk semua controller UI.
 * 
 * TUGAS:
 * - Menyediakan pola umum: init(), showError(), showLoading(), showAlert()
 * - Menangani event listener global (misal: tombol "Batal" kembali ke halaman sebelumnya)
 * - Memastikan setiap controller punya Logger dengan nama modul yang konsisten
 * 
 * ATURAN EMAS:
 * - Controller BOLEH akses DOM (document.getElementById, dll)
 * - Controller TIDAK BOLEH akses Repository langsung (harus lewat Service)
 * - Controller TIDAK BOLEH akses Firestore SDK langsung
 * 
 * Analogi VB: Seperti Form base class yang menyediakan method umum untuk semua form.
 */
import { Logger } from '../core/Logger.js';
import { AppError } from '../core/AppError.js';
import { AuthService } from '../services/AuthService.js';

export class BaseController {
    /**
     * @param {string} rootElementId - ID elemen root controller (untuk scoping query DOM)
     */
    constructor(rootElementId = null) {
        this.rootElementId = rootElementId;
        this.rootElement = rootElementId ? document.getElementById(rootElementId) : document.body;
        this.moduleName = this.constructor.name;
        this.logger = Logger;
    }


    /**
     * AuthGuard - Pastikan user sudah login sebelum controller berjalan.
     * 
     * DIPANGGIL di awal init() setiap controller yang butuh proteksi.
     * Kalau user belum login, redirect ke index.html (halaman login).
     * 
     * Kenapa redirect, bukan tampilkan alert?
     * - Konsisten UX: user selalu login lewat halaman login yang sudah dirancang rapi
     * - Aman: tidak ada risiko data bocor sebelum auth check selesai
     * - Sederhana: tidak perlu logic "tampilkan form tapi disabled"
     * 
     * Analogi VB: Seperti Form_Load yang cek If Not IsLoggedIn Then GoTo LoginForm
     * 
     * @returns {Promise<boolean>} true jika user sudah login & authorized
     */
    async requireAuth() {
        try {
            // 1. TUNGGU Firebase memastikan status login (mencegah race condition)
            const user = await new Promise((resolve) => {
                const unsubscribe = AuthService.onAuthStateChanged((currentUser) => {
                    unsubscribe(); // Hentikan listener setelah mendapatkan status pertama
                    resolve(currentUser);
                });
            });

            // 2. Kasus: Benar-benar belum login
            if (!user) {
                this.logger.warn(this.moduleName, 'User belum login, redirect ke halaman login');
                const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                window.location.href = `/?returnUrl=${returnUrl}`;
                return false;
            }

            // 3. Kasus: Login tapi email tidak di-whitelist
            const isAuthorized = await AuthService.checkAuthorization(user.email);
            if (!isAuthorized) {
                this.logger.warn(this.moduleName, `User ${user.email} tidak di-whitelist, logout paksa`);
                await AuthService.signOutUser();
                window.location.href = '/';
                return false;
            }

            // 4. Kasus: Login & authorized — lanjutkan
            this.logger.info(this.moduleName, `Auth OK untuk ${user.email}`);
            return true;

        } catch (error) {
            this.logger.warn(this.moduleName, 'Auth check gagal, lanjutkan dengan asumsi aman', error);
            return true;
        }
    }

    /**
     * Inisialisasi controller — dipanggil sekali saat halaman load.
     * Override di subclass untuk setup event listener, load data awal, dll.
     */
    init() {
        this.logger.info(this.moduleName, 'Controller diinisialisasi');
    }

    /**
     * Tampilkan pesan error ke user (Bootstrap Alert).
     * 
     * @param {string} message - Pesan error yang manusiawi
     * @param {string} type - Tipe alert Bootstrap: 'danger', 'warning', 'info', 'success'
     * @param {number} autoDismiss - Waktu otomatis hilang (ms), 0 = tidak auto-dismiss
     */
    showAlert(message, type = 'danger', autoDismiss = 5000) {
        // Cari atau buat container alert
        let alertContainer = document.getElementById('alert-container');
        if (!alertContainer) {
            alertContainer = document.createElement('div');
            alertContainer.id = 'alert-container';
            alertContainer.className = 'container mt-3';
            // Sisipkan setelah navbar atau di awal body
            const mainContent = document.querySelector('main') || document.body;
            mainContent.prepend(alertContainer);
        }

        // Buat elemen alert
        const alertId = `alert-${Date.now()}`;
        const alertHtml = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
                <i class="bi bi-${type === 'danger' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        alertContainer.insertAdjacentHTML('afterbegin', alertHtml);

        // Auto-dismiss jika diminta
        if (autoDismiss > 0) {
            setTimeout(() => {
                const alertEl = document.getElementById(alertId);
                if (alertEl) {
                    alertEl.classList.remove('show');
                    setTimeout(() => alertEl.remove(), 150);
                }
            }, autoDismiss);
        }

        this.logger.warn(this.moduleName, `Alert ditampilkan: [${type}] ${message}`);
    }

    /**
     * Tampilkan error dari AppError dengan format yang konsisten.
     * 
     * @param {AppError|Error} error - Error yang ditangkap
     * @param {string} context - Konteks tambahan (misal: "saat menyimpan data keluarga")
     */
    showError(error, context = '') {
        const message = error instanceof AppError
            ? error.message
            : (error.message || 'Terjadi kesalahan yang tidak diketahui');

        const fullMessage = context ? `${context}: ${message}` : message;
        this.showAlert(fullMessage, 'danger');

        // Log lengkap ke console untuk debugging
        this.logger.error(this.moduleName, fullMessage, error);
    }

    /**
     * Toggle state loading (tampilkan/sembunyikan spinner, disable tombol submit).
     * 
     * @param {boolean} isLoading - true = tampilkan loading, false = sembunyikan
     */
    showLoading(isLoading) {
        // Toggle semua tombol submit
        const submitButtons = this.rootElement.querySelectorAll('[type="submit"], .btn-submit');
        submitButtons.forEach(btn => {
            btn.disabled = isLoading;
            if (isLoading) {
                btn.dataset.originalText = btn.innerHTML;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Memproses...';
            } else if (btn.dataset.originalText) {
                btn.innerHTML = btn.dataset.originalText;
            }
        });

        // Toggle overlay loading (jika ada)
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.toggle('d-none', !isLoading);
        }

        this.logger.info(this.moduleName, `Loading state: ${isLoading ? 'ON' : 'OFF'}`);
    }

    /**
     * Ambil nilai dari input form dengan aman (return empty string jika tidak ada).
     * 
     * @param {string} fieldId - ID field input
     * @param {string} fallback - Nilai default jika field kosong/tidak ada
     * @returns {string}
     */
    getFieldValue(fieldId, fallback = '') {
        const field = document.getElementById(fieldId);
        if (!field) {
            this.logger.warn(this.moduleName, `Field tidak ditemukan: ${fieldId}`);
            return fallback;
        }
        return field.value !== undefined ? field.value : fallback;
    }

    /**
     * Set nilai ke input form dengan aman.
     * 
     * @param {string} fieldId - ID field input
     * @param {any} value - Nilai yang akan diset
     */
    setFieldValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (!field) {
            this.logger.warn(this.moduleName, `Field tidak ditemukan: ${fieldId}`);
            return;
        }
        field.value = value !== null && value !== undefined ? value : '';
    }

    /**
     * Set teks ke elemen non-input (seperti span, div, p) dengan aman.
     * 
     * @param {string} fieldId - ID elemen
     * @param {any} value - Nilai yang akan diset
     */
    setTextContent(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (!field) {
            this.logger.warn(this.moduleName, `Elemen tidak ditemukan: ${fieldId}`);
            return;
        }
        field.textContent = value !== null && value !== undefined ? value : '-';
    }

    /**
     * Tampilkan error validasi inline di bawah field tertentu.
     * 
     * @param {string} fieldId - ID field input
     * @param {string} errorMessage - Pesan error
     */
    showFieldError(fieldId, errorMessage) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        // Tambah class is-invalid untuk styling merah
        field.classList.add('is-invalid');
        field.classList.remove('is-valid');

        // Cari atau buat elemen feedback
        let feedback = field.parentElement.querySelector('.invalid-feedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.className = 'invalid-feedback';
            field.parentElement.appendChild(feedback);
        }
        feedback.textContent = errorMessage;
    }

    /**
     * Bersihkan error validasi inline dari field tertentu.
     * 
     * @param {string} fieldId - ID field input
     */
    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        field.classList.remove('is-invalid');
        const feedback = field.parentElement.querySelector('.invalid-feedback');
        if (feedback) feedback.remove();
    }

    /**
     * Bersihkan semua error validasi inline di form.
     */
    clearAllFieldErrors() {
        const invalidFields = this.rootElement.querySelectorAll('.is-invalid');
        invalidFields.forEach(field => {
            field.classList.remove('is-invalid');
            const feedback = field.parentElement.querySelector('.invalid-feedback');
            if (feedback) feedback.remove();
        });
    }

    /**
     * Scroll ke field yang error (user langsung tahu di mana masalahnya).
     * 
     * @param {string} fieldId - ID field yang error
     */
    scrollToField(fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.scrollIntoView({ behavior: 'smooth', block: 'center' });
            field.focus();
        }
    }
}