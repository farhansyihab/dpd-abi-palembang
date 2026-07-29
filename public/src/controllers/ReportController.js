/**
 * ReportController - Orchestrator untuk generate laporan PDF keluarga.
 * 
 * TUGAS UTAMA:
 * - Auth Guard (requireAuth)
 * - Setup event listener tombol download
 * - Orkestrasi: ReportService → PdfService
 * - Handle loading state & error handling
 * 
 * DELEGASI:
 * - Ambil data → ReportService.getEnrichedReportData()
 * - Generate PDF → PdfService.generateReportPdf()
 * 
 * ATURAN EMAS:
 * - Controller BOLEH akses DOM
 * - Controller TIDAK BOLEH akses Repository/Firestore langsung
 */
import { BaseController } from './BaseController.js';
import { ReportService } from '../services/ReportService.js';
import { PdfService } from '../services/PdfService.js';
import { Logger } from '../core/Logger.js';

const MODULE_NAME = 'ReportController';

class ReportController extends BaseController {
    constructor() {
        super(null); // Tidak ada root element spesifik, pakai body
        this.reportService = new ReportService();
        this.pdfService = new PdfService();
    }

    /**
     * Inisialisasi controller
     */
    async init() {
        super.init();
        Logger.info(MODULE_NAME, 'Inisialisasi controller laporan PDF');

        // 🔐 1. AUTH GUARD
        const isAuthorized = await this.requireAuth();
        if (!isAuthorized) return;

        // 🔐 2. Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Setup event listener untuk tombol download
     */
    setupEventListeners() {
        const btnGenerate = document.getElementById('btnGenerateReport');

        if (btnGenerate) {
            btnGenerate.addEventListener('click', () => this.handleGenerateReport());
            Logger.info(MODULE_NAME, 'Event listener tombol download dipasang');
        } else {
            Logger.warn(MODULE_NAME, 'Tombol btnGenerateReport tidak ditemukan di DOM');
        }
    }

    /**
     * Handle klik tombol "Download Laporan PDF"
     * 
     * ALUR:
     * 1. Tampilkan loading overlay
     * 2. Ambil data enriched dari ReportService
     * 3. Generate PDF via PdfService
     * 4. Tampilkan alert sukses/gagal
     * 5. Sembunyikan loading overlay
     */
    async handleGenerateReport() {
        Logger.info(MODULE_NAME, 'Mulai generate laporan PDF');

        const btnGenerate = document.getElementById('btnGenerateReport');
        const originalButtonText = btnGenerate.innerHTML;

        try {
            // 1. Disable tombol & tampilkan loading
            btnGenerate.disabled = true;
            btnGenerate.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Menyusun data...';
            this.showLoading(true);

            // 2. Ambil data dari ReportService
            Logger.info(MODULE_NAME, 'Mengambil data keluarga & anggota...');
            const reportData = await this.reportService.getEnrichedReportData();

            if (reportData.length === 0) {
                this.showAlert('Tidak ada data keluarga yang dapat dijadikan laporan. Silakan input data keluarga terlebih dahulu.', 'warning');
                return;
            }

            Logger.info(MODULE_NAME, `Data berhasil diambil: ${reportData.length} keluarga`);

            // 3. Generate PDF via PdfService
            Logger.info(MODULE_NAME, 'Generating PDF...');
            await this.pdfService.generateReportPdf(reportData);

            // 4. Sukses
            this.showAlert('Laporan PDF berhasil di-generate dan didownload!', 'success');
            Logger.info(MODULE_NAME, 'Laporan PDF berhasil di-generate');

        } catch (error) {
            // 5. Error handling
            this.showError(error, 'Gagal generate laporan PDF');
            Logger.error(MODULE_NAME, 'Generate laporan PDF gagal', error);
        } finally {
            // 6. Restore state tombol & hide loading
            btnGenerate.disabled = false;
            btnGenerate.innerHTML = originalButtonText;
            this.showLoading(false);
        }
    }
}

// Inisialisasi controller saat DOM siap
document.addEventListener('DOMContentLoaded', async () => {
    const controller = new ReportController();
    await controller.init();
    window.reportController = controller;
    console.log('✅ ReportController dimuat');
});