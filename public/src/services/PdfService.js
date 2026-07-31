// public/src/services/PdfService.js
/**
 * PdfService - Facade untuk semua operasi PDF.
 *
 * TUGAS:
 * - Delegasi generate voucher ke VoucherPdfBuilder
 * - Delegasi generate report ke ReportPdfBuilder
 * - Menyediakan method downloadPdf() yang dipakai kedua builder
 *
 * PENTING: PdfService TIDAK mengandung logic rendering PDF sama sekali.
 * Semua logic rendering dipindah ke builder masing-masing (Composition Pattern).
 *
 * Analogi: PdfService seperti "resepsionis" yang meneruskan tamu ke ruang yang tepat,
 * bukan yang mengerjakan sendiri.
 *
 * DEPENDENSI: VoucherPdfBuilder, ReportPdfBuilder
 */
import { VoucherPdfBuilder } from './pdf/VoucherPdfBuilder.js';
import { ReportPdfBuilder } from './pdf/ReportPdfBuilder.js';
import { AppError } from '../core/AppError.js';
import { Logger } from '../core/Logger.js';

const MODULE_NAME = 'PdfService';

export class PdfService {
    constructor() {
        // Instantiate builders sekali di constructor (lazy instantiation tidak perlu,
        // karena builder sangat ringan — hanya simpan referensi)
        this.voucherBuilder = new VoucherPdfBuilder();
        this.reportBuilder = new ReportPdfBuilder();
    }

    /**
     * Generate PDF voucher untuk peserta program.
     * Delegasi ke VoucherPdfBuilder.
     *
     * @param {Object} participant - Data peserta (ProgramParticipantModel)
     * @param {Object} family - Data keluarga (FamilyModel) — opsional
     * @param {Object} program - Data program (ProgramModel)
     * @returns {Promise<Blob>} PDF sebagai Blob
     */
    async generateVoucherPdf(participant, family = null, program) {
        try {
            Logger.info(MODULE_NAME, 'Delegasi generate voucher PDF ke VoucherPdfBuilder');
            return await this.voucherBuilder.build(participant, family, program);
        } catch (error) {
            throw this._handleError(error, 'generateVoucherPdf');
        }
    }

    /**
     * Generate PDF laporan tabel keluarga.
     * Delegasi ke ReportPdfBuilder.
     *
     * @param {Array<{family: Object, persons: Array}>} reportData - Data enriched
     * @returns {Promise<Blob>} PDF sebagai Blob
     */
    async generateReportPdf(reportData) {
        try {
            Logger.info(MODULE_NAME, 'Delegasi generate report PDF ke ReportPdfBuilder');
            const pdfBlob = await this.reportBuilder.build(reportData);

            // Trigger download langsung (behavior lama dipertahankan untuk backward compatibility
            // dengan ReportController yang memanggil method ini)
            const fileName = `Laporan_Keluarga_ABI_${new Date().toISOString().slice(0, 10)}.pdf`;
            this.downloadPdf(pdfBlob, fileName);

            Logger.info(MODULE_NAME, 'Report PDF berhasil di-generate dan didownload');
        } catch (error) {
            throw this._handleError(error, 'generateReportPdf');
        }
    }

    /**
     * Trigger download PDF di browser.
     * Dipakai oleh kedua builder (atau facade untuk auto-download).
     *
     * @param {Blob} pdfBlob - PDF sebagai Blob
     * @param {string} filename - Nama file (misal: 'voucher-VOUCHER-123.pdf')
     */
    downloadPdf(pdfBlob, filename) {
        try {
            Logger.info(MODULE_NAME, `Downloading PDF: ${filename}`);
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            // Cleanup
            setTimeout(() => URL.revokeObjectURL(url), 100);
            Logger.info(MODULE_NAME, 'PDF berhasil didownload');
        } catch (error) {
            throw this._handleError(error, 'downloadPdf');
        }
    }

    /**
     * Helper: bungkus error jadi AppError
     */
    _handleError(error, methodName) {
        if (error instanceof AppError) return error;
        return new AppError(
            `Gagal ${methodName}: ${error.message}`,
            MODULE_NAME,
            error.code || 'PDF_SERVICE_ERROR',
            error
        );
    }
}