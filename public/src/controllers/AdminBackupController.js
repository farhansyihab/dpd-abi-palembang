/**
 * AdminBackupController - Orchestrator khusus untuk halaman backup/restore tersembunyi.
 * 
 * ATURAN EMAS:
 * - HANYA boleh diakses oleh email: agiaptek@gmail.com
 * - Tidak ada akses ke Repository langsung (delegasi ke AdminBackupService)
 * - Tidak ada jejak di Navbar.
 */
import { BaseController } from './BaseController.js';
import { AdminBackupService } from '../services/AdminBackupService.js';
import { AuthService } from '../services/AuthService.js';
import { Logger } from '../core/Logger.js';

const MODULE_NAME = 'AdminBackupController';
const ALLOWED_EMAIL = 'agiptek@gmail.com';

class AdminBackupController extends BaseController {
    constructor() {
        super('adminBackupView');
        this.backupService = new AdminBackupService();
    }

    async init() {
        super.init();

        // 🔐 1. STRICT AUTH GUARD
        const isAuthorized = await this.checkStrictAdminAccess();
        if (!isAuthorized) return; // Akan redirect otomatis jika gagal

        // 🔐 2. Setup Event Listeners
        this.setupEventListeners();
        Logger.info(MODULE_NAME, 'Halaman backup diinisialisasi untuk admin');
    }

    async checkStrictAdminAccess() {
        try {
            const user = await new Promise((resolve) => {
                const unsubscribe = AuthService.onAuthStateChanged((currentUser) => {
                    unsubscribe();
                    resolve(currentUser);
                });
            });

            if (!user) {
                Logger.warn(MODULE_NAME, 'User belum login, redirect ke login');
                window.location.href = '/';
                return false;
            }

            if (user.email !== ALLOWED_EMAIL) {
                Logger.warn(MODULE_NAME, `Akses ditolak untuk email: ${user.email}. Redirect.`);
                // Redirect diam-diam, seolah halaman tidak ada
                // window.location.href = '/';
                return false;
            }

            Logger.info(MODULE_NAME, `Akses admin diverifikasi untuk: ${user.email}`);
            document.getElementById('adminEmailDisplay').textContent = user.email;
            return true;

        } catch (error) {
            Logger.error(MODULE_NAME, 'Gagal verifikasi admin', error);
            window.location.href = '/';
            return false;
        }
    }

    setupEventListeners() {
        document.getElementById('btnBackup').addEventListener('click', () => this.handleBackup());
        document.getElementById('btnRestore').addEventListener('click', () => this.handleRestore());
    }

    async handleBackup() {
        try {
            this.showLoading(true);
            Logger.info(MODULE_NAME, 'Memulai proses backup...');

            const data = await this.backupService.exportAllData();
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const timestamp = new Date().toISOString().slice(0, 10);
            const filename = `BACKUP_DPD_ABI_${timestamp}.json`;

            // Trigger download
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showAlert('Backup berhasil diunduh!', 'success');
        } catch (error) {
            this.showError(error, 'Gagal melakukan backup');
        } finally {
            this.showLoading(false);

        }
    }

    async handleRestore() {
        const fileInput = document.getElementById('restoreFileInput');
        const file = fileInput.files[0];

        if (!file) {
            this.showAlert('Silakan pilih file JSON backup terlebih dahulu.', 'warning');
            return;
        }

        if (!confirm('PERINGATAN: Restore akan menimpa/menggabungkan data dengan ID yang sama. Lanjutkan?')) {
            return;
        }

        try {
            this.showLoading(true);
            Logger.info(MODULE_NAME, 'Membaca file backup...');

            const text = await file.text();
            const jsonData = JSON.parse(text);

            Logger.info(MODULE_NAME, 'Memulai proses restore ke Firestore...');
            const totalRestored = await this.backupService.importAllData(jsonData);

            this.showAlert(`Restore berhasil! Total ${totalRestored} dokumen dipulihkan.`, 'success');
            fileInput.value = ''; // Reset input
        } catch (error) {
            this.showError(error, 'Gagal melakukan restore');
        } finally {
            this.showLoading(false);
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const controller = new AdminBackupController();
    await controller.init();
    window.adminBackupController = controller;
});