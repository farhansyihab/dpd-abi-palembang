// public/src/services/PdfService.js

/**
 * PdfService - Generate PDF voucher & laporan.
 *
 * DEPENDENSI: jsPDF + jsPDF-AutoTable (via CDN)
 * - <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
 * - <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"></script>
 *
 * CATATAN: PDF di-generate on-the-fly di client, tidak disimpan di server.
 */
import { AppError } from '../core/AppError.js';
import { Logger } from '../core/Logger.js';

const MODULE_NAME = 'PdfService';

export class PdfService {
    constructor() {
        // Pastikan jsPDF sudah di-load
        if (typeof window.jspdf === 'undefined') {
            Logger.warn(MODULE_NAME, 'jsPDF belum di-load. PDF generation tidak tersedia.');
        }
    }

    /**
     * Generate PDF voucher untuk peserta program.
     *
     * @param {Object} participant - Data peserta (ProgramParticipantModel)
     * @param {Object} family - Data keluarga (FamilyModel) — opsional, untuk tampilan nama
     * @param {Object} program - Data program (ProgramModel)
     * @returns {Promise<Blob>} PDF sebagai Blob
     */
    async generateVoucherPdf(participant, family = null, program) {
        try {
            Logger.info(MODULE_NAME, 'Generating PDF voucher', {
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
            Logger.info(MODULE_NAME, 'PDF voucher berhasil di-generate');
            return pdfBlob;
        } catch (error) {
            throw this._handleError(error, 'generateVoucherPdf');
        }
    }

    /**
     * 🆕 Generate Laporan PDF Tabel Keluarga dengan Rowspan Alamat (DIPERBAIKI).
     *
     * @param {Array<{family: Object, persons: Array}>} reportData
     * @returns {void} (Langsung trigger download)
     */
    async generateReportPdf(reportData) {
        try {
            Logger.info(MODULE_NAME, 'Generating Report PDF');

            // 1. Validasi dependensi (DIPERBAIKI)
            if (typeof window.jspdf === 'undefined') {
                throw new AppError(
                    'Library jsPDF belum di-load di HTML.',
                    MODULE_NAME,
                    'JSPDF_NOT_LOADED'
                );
            }

            const { jsPDF } = window.jspdf;
            // Cek apakah plugin autoTable sudah terpasang dengan benar ke jsPDF
            const hasAutoTable = typeof jsPDF.API?.autoTable === 'function' ||
                typeof jsPDF.prototype?.autoTable === 'function';

            if (!hasAutoTable) {
                throw new AppError(
                    'Plugin jsPDF-AutoTable belum ter-load. Pastikan script jspdf.plugin.autotable.min.js dimuat SETELAH jspdf.umd.min.js',
                    MODULE_NAME,
                    'JSPDF_AUTOTABLE_NOT_LOADED'
                );
            }
            // Gunakan landscape (l) agar tabel 9 kolom muat dengan nyaman
            const doc = new jsPDF('l', 'mm', 'a4');

            // 1. Header dokumen
            doc.setFontSize(16);
            doc.setTextColor(0, 51, 102);
            doc.text('LAPORAN DATA KELUARGA & ANGGOTA', 148.5, 15, { align: 'center' });

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text('DPD ABI Palembang', 148.5, 21, { align: 'center' });

            const tanggalCetak = new Date().toLocaleDateString('id-ID', {
                day: '2-digit', month: 'long', year: 'numeric'
            });
            doc.text(`Dicetak: ${tanggalCetak}`, 148.5, 26, { align: 'center' });

            // 2. Siapkan body tabel
            const body = [];
            let globalNo = 1;

            for (const { family, persons } of reportData) {
                const alamat = family.alamat
                    ? `${family.alamat.jalan || '-'}, RT ${family.alamat.rt || '-'}/RW ${family.alamat.rw || '-'}, ${family.alamat.kelurahan || '-'}, Kec. ${family.alamat.kecamatan || '-'}`
                    : '-';

                for (let i = 0; i < persons.length; i++) {
                    const p = persons[i];
                    const relasi = this._formatRelasi(p.hubungan_dlm_keluarga);
                    const penghasilan = (p.penghasilan_bulan != null && p.penghasilan_bulan > 0)
                        ? `Rp ${Number(p.penghasilan_bulan).toLocaleString('id-ID')}`
                        : '-';

                    const row = [
                        globalNo,                                          // 0: No
                        p.nama || '-',                                     // 1: Nama
                        alamat,                                            // 2: Alamat (akan di-rowspan)
                        p.usia != null ? `${p.usia} th` : '-',            // 3: Usia
                        p.no_telp || '-',                                 // 4: No HP/WA
                        p.pekerjaan || '-',                                // 5: Pekerjaan
                        p.pendidikan_terakhir || '-',                      // 6: Pendidikan
                        relasi,                                            // 7: Relasi
                        penghasilan                                        // 8: Penghasilan/bulan
                    ];
                    body.push(row);
                    globalNo++;
                }
            }

            const headers = [
                ['No', 'Nama', 'Alamat', 'Usia', 'No HP/WA', 'Pekerjaan', 'Pendidikan', 'Relasi', 'Penghasilan/Bln']
            ];

            // 3. Hitung konfigurasi rowspan untuk kolom Alamat (index 2)
            const alamatRowspan = [];
            let rowIndex = 0;
            for (const { persons } of reportData) {
                const count = persons.length;
                for (let i = 0; i < count; i++) {
                    alamatRowspan.push({
                        index: rowIndex + i,
                        span: (i === 0) ? count : 0 // Baris pertama dapat span, sisanya 0
                    });
                }
                rowIndex += count;
            }

            // 4. Konfigurasi autoTable (DIPERBAIKI TOTAL untuk mencegah page break per row)
            doc.autoTable({
                head: headers,
                body: body,
                startY: 30,
                margin: { left: 10, right: 10, top: 10, bottom: 10 },
                theme: 'grid',
                tableWidth: 'auto', // Biarkan plugin mengatur, tapi kita batasi columnStyles
                horizontalPageBreak: false, // Cegah pemecahan kolom ke halaman baru
                styles: {
                    fontSize: 7, // Lebih kecil agar muat
                    cellPadding: 1.5, // Padding lebih rapat
                    textColor: [30, 30, 30],
                    lineColor: [200, 200, 200],
                    lineWidth: 0.1,
                    overflow: 'linebreak', // Wajib agar teks panjang tidak melebar
                    valign: 'middle',
                    halign: 'center'
                },
                headStyles: {
                    fillColor: [0, 51, 102],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 7,
                    halign: 'center',
                    valign: 'middle'
                },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },       // No
                    1: { cellWidth: 35, halign: 'left' },         // Nama
                    2: { cellWidth: 55, halign: 'left' },         // Alamat (diperlebar sedikit)
                    3: { cellWidth: 15, halign: 'center' },       // Usia
                    4: { cellWidth: 25, halign: 'center' },       // No HP/WA
                    5: { cellWidth: 25, halign: 'left' },         // Pekerjaan
                    6: { cellWidth: 25, halign: 'center' },       // Pendidikan
                    7: { cellWidth: 25, halign: 'center' },       // Relasi
                    8: { cellWidth: 25, halign: 'right' }         // Penghasilan
                    // Total: 10+35+55+15+25+25+25+25+25 = 240mm. 
                    // 240 + (9 * 3) padding = 267mm < 277mm (available). AMAN.
                },
                alternateRowStyles: {
                    fillColor: [245, 248, 255]
                },
                didParseCell: function (data) {
                    // ── LOGIKA ROWSPAN YANG SANGAT DEFENSIF ──
                    if (data.section === 'body' && data.column.index === 2) { // Kolom Alamat
                        const rowIdx = data.row.index;
                        const meta = alamatRowspan[rowIdx];

                        if (meta) {
                            if (meta.span > 1) {
                                data.cell.rowSpan = meta.span;
                                data.cell.styles.valign = 'middle';
                                data.cell.styles.halign = 'left';
                                data.cell.styles.fillColor = [245, 245, 245];
                                data.cell.styles.fontStyle = 'italic';
                                data.cell.styles.fontSize = 7; // Pastikan font size konsisten
                            } else if (meta.span === 0) {
                                // ✅ PERBAIKAN KRUSIAL: 
                                // Cukup kosongkan teks. JANGAN ubah rowSpan, minCellHeight, atau padding
                                // karena itu memicu bug kalkulasi tinggi baris > halaman di jspdf-autotable.
                                data.cell.text = [''];
                            }
                        }
                    }

                    // Highlight baris Kepala Keluarga di kolom Relasi (index 7)
                    if (data.section === 'body' && data.column.index === 7) {
                        const cellText = data.cell.text;
                        if (Array.isArray(cellText) && cellText[0] === 'Kepala Keluarga') {
                            data.cell.styles.fontStyle = 'bold';
                            data.cell.styles.textColor = [0, 100, 0]; // Hijau tua
                        }
                    }
                }
            });

            // 5. Footer: nomor halaman
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(
                    `Halaman ${i} dari ${pageCount} — DPD ABI Palembang`,
                    doc.internal.pageSize.width / 2,
                    doc.internal.pageSize.height - 8,
                    { align: 'center' }
                );
            }

            Logger.info(MODULE_NAME, 'Report PDF berhasil di-generate');

            // 6. Trigger download
            const fileName = `Laporan_Keluarga_ABI_${new Date().toISOString().slice(0, 10)}.pdf`;
            doc.save(fileName);

        } catch (error) {
            throw new AppError(
                `Gagal generate report PDF: ${error.message}`,
                MODULE_NAME,
                error.code || 'REPORT_PDF_FAILED',
                error
            );
        }
    }

    /**
     * Format relasi: ubah snake_case ke Title Case.
     * "kepala_keluarga" → "Kepala Keluarga"
     */
    _formatRelasi(relasi) {
        if (!relasi) return '-';
        return relasi
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Trigger download PDF di browser.
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
        if (error instanceof AppError) {
            return error;
        }
        return new AppError(
            `Gagal ${methodName}: ${error.message}`,
            MODULE_NAME,
            error.code || 'PDF_SERVICE_ERROR',
            error
        );
    }
}