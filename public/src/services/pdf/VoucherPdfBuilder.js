// public/src/services/pdf/VoucherPdfBuilder.js
/**
 * VoucherPdfBuilder - Builder khusus untuk PDF voucher program bantuan.
 *
 * TANGGUNG JAWAB:
 * - Generate PDF voucher A5 dengan layout manual (x/y coordinates)
 * - Berisi info program, penerima, jumlah, dan kode voucher
 *
 * DIPISAH dari PdfService karena:
 * - Logic gambar manual berbeda total dengan ReportPdfBuilder (yang pakai AutoTable)
 * - Kalau nanti voucher butuh QR code / layout baru, perubahan terisolasi di sini
 * - Konsisten dengan pola Composition Pattern yang sudah dipakai di family-form/
 *
 * DEPENDENSI: jsPDF (via CDN)
 */
import { AppError } from '../../core/AppError.js';
import { Logger } from '../../core/Logger.js';

const MODULE_NAME = 'VoucherPdfBuilder';

export class VoucherPdfBuilder {
    constructor() {
        if (typeof window.jspdf === 'undefined') {
            Logger.warn(MODULE_NAME, 'jsPDF belum di-load. PDF generation tidak tersedia.');
        }
    }

    /**
     * Build PDF voucher.
     *
     * @param {Object} participant - Data peserta (ProgramParticipantModel)
     * @param {Object} family - Data keluarga (FamilyModel) — opsional, untuk tampilan nama
     * @param {Object} program - Data program (ProgramModel)
     * @returns {Promise<Blob>} PDF sebagai Blob
     */
    async build(participant, family = null, program) {
        try {
            Logger.info(MODULE_NAME, 'Building PDF voucher', {
                participantId: participant.id,
                kodeVoucher: participant.kode_voucher
            });

            if (typeof window.jspdf === 'undefined') {
                throw new AppError(
                    'jsPDF library belum di-load. Tambahkan script tag di HTML.',
                    MODULE_NAME,
                    'JSPDF_NOT_LOADED'
                );
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a5' // Ukuran kecil, cocok untuk voucher
            });

            // Header
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('VOUCHER PROGRAM BANTUAN', 105, 20, { align: 'center' });
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text('DPD ABI Palembang', 105, 28, { align: 'center' });

            // Garis pemisah
            doc.setLineWidth(0.5);
            doc.line(20, 35, 190, 35);

            // Info Program
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Program:', 20, 45);
            doc.setFont('helvetica', 'normal');
            doc.text(program.nama, 50, 45);

            doc.setFont('helvetica', 'bold');
            doc.text('Periode:', 20, 52);
            doc.setFont('helvetica', 'normal');
            doc.text(program.periode, 50, 52);

            // Garis pemisah
            doc.line(20, 58, 190, 58);

            // Info Penerima
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Penerima:', 20, 68);
            doc.setFont('helvetica', 'normal');
            const namaPenerima = family ? family.search_name_lower : 'N/A';
            doc.text(namaPenerima, 50, 68);

            doc.setFont('helvetica', 'bold');
            doc.text('Peran:', 20, 75);
            doc.setFont('helvetica', 'normal');
            doc.text(participant.peran.toUpperCase(), 50, 75);

            doc.setFont('helvetica', 'bold');
            doc.text('Jumlah:', 20, 82);
            doc.setFont('helvetica', 'normal');
            doc.text(`${participant.jumlah_sembako} paket`, 50, 82);

            // Garis pemisah
            doc.line(20, 88, 190, 88);

            // Kode Voucher (besar & jelas)
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('KODE VOUCHER:', 105, 100, { align: 'center' });
            doc.setFontSize(20);
            doc.text(participant.kode_voucher, 105, 112, { align: 'center' });

            // Footer
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.text('Voucher ini hanya berlaku untuk program yang disebutkan di atas.', 105, 130, { align: 'center' });
            doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 105, 136, { align: 'center' });

            // Convert ke Blob
            const pdfBlob = doc.output('blob');
            Logger.info(MODULE_NAME, 'PDF voucher berhasil di-build');
            return pdfBlob;
        } catch (error) {
            throw this._handleError(error, 'build');
        }
    }

    /**
     * Helper: bungkus error jadi AppError
     */
    _handleError(error, methodName) {
        if (error instanceof AppError) return error;
        return new AppError(
            `Gagal ${methodName} voucher PDF: ${error.message}`,
            MODULE_NAME,
            error.code || 'VOUCHER_PDF_FAILED',
            error
        );
    }
}