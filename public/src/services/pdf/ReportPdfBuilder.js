// public/src/services/pdf/ReportPdfBuilder.js
/**
 * ReportPdfBuilder - Builder khusus untuk PDF laporan tabel keluarga.
 *
 * TANGGUNG JAWAB:
 * - Generate PDF A4 Landscape dengan jsPDF-AutoTable
 * - 9 kolom: No, Nama, Alamat, Usia, No HP/WA, Pekerjaan, Pendidikan, Relasi, Penghasilan/Bln
 * - Rowspan kolom Alamat per keluarga
 * - Highlight bold+hijau untuk baris Kepala Keluarga
 * - Footer "Halaman X dari Y"
 *
 * DIPISAH dari PdfService karena:
 * - Logic AutoTable + hook didParseCell sangat berbeda dari VoucherPdfBuilder (manual x/y)
 * - 3 bug kritis (#13, #14, #15) terjadi di logic ini — kalau ada bug baru, terisolasi di sini
 * - Konsisten dengan pola Composition Pattern
 *
 * DEPENDENSI: jsPDF + jsPDF-AutoTable (via CDN)
 */
import { AppError } from '../../core/AppError.js';
import { Logger } from '../../core/Logger.js';

const MODULE_NAME = 'ReportPdfBuilder';

export class ReportPdfBuilder {
    constructor() {
        // Validasi dependensi dilakukan saat build(), bukan constructor
        // supaya instance bisa dibuat sebelum script CDN selesai load
    }

    /**
     * Build PDF laporan tabel keluarga.
     *
     * @param {Array<{family: Object, persons: Array}>} reportData - Data enriched dari ReportService
     * @returns {Promise<Blob>} PDF sebagai Blob
     */
    async build(reportData) {
        try {
            Logger.info(MODULE_NAME, 'Building Report PDF');

            // 1. Validasi dependensi
            if (typeof window.jspdf === 'undefined') {
                throw new AppError(
                    'Library jsPDF belum di-load di HTML.',
                    MODULE_NAME,
                    'JSPDF_NOT_LOADED'
                );
            }

            const { jsPDF } = window.jspdf;

            // Cek apakah plugin autoTable sudah terpasang
            const hasAutoTable = typeof jsPDF.API?.autoTable === 'function' ||
                typeof jsPDF.prototype?.autoTable === 'function';
            if (!hasAutoTable) {
                throw new AppError(
                    'Plugin jsPDF-AutoTable belum ter-load. Pastikan script jspdf.plugin.autotable.min.js dimuat SETELAH jspdf.umd.min.js',
                    MODULE_NAME,
                    'JSPDF_AUTOTABLE_NOT_LOADED'
                );
            }

            // Gunakan landscape (l) agar tabel 9 kolom muat
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

            // 4. Konfigurasi autoTable
            doc.autoTable({
                head: headers,
                body: body,
                startY: 30,
                margin: { left: 10, right: 10, top: 10, bottom: 10 },
                theme: 'grid',
                tableWidth: 'auto',
                horizontalPageBreak: false,
                styles: {
                    fontSize: 7,
                    cellPadding: 1.5,
                    textColor: [30, 30, 30],
                    lineColor: [200, 200, 200],
                    lineWidth: 0.1,
                    overflow: 'linebreak',
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
                    2: { cellWidth: 55, halign: 'left' },         // Alamat
                    3: { cellWidth: 15, halign: 'center' },       // Usia
                    4: { cellWidth: 25, halign: 'center' },       // No HP/WA
                    5: { cellWidth: 25, halign: 'left' },         // Pekerjaan
                    6: { cellWidth: 25, halign: 'center' },       // Pendidikan
                    7: { cellWidth: 25, halign: 'center' },       // Relasi
                    8: { cellWidth: 25, halign: 'right' }         // Penghasilan
                },
                alternateRowStyles: {
                    fillColor: [245, 248, 255]
                },
                didParseCell: (data) => {
                    // Logika rowspan defensif untuk kolom Alamat (index 2)
                    if (data.section === 'body' && data.column.index === 2) {
                        const rowIdx = data.row.index;
                        const meta = alamatRowspan[rowIdx];
                        if (meta) {
                            if (meta.span > 1) {
                                data.cell.rowSpan = meta.span;
                                data.cell.styles.valign = 'middle';
                                data.cell.styles.halign = 'left';
                                data.cell.styles.fillColor = [245, 245, 245];
                                data.cell.styles.fontStyle = 'italic';
                                data.cell.styles.fontSize = 7;
                            } else if (meta.span === 0) {
                                // PERBAIKAN KRUSIAL: cukup kosongkan teks
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

            Logger.info(MODULE_NAME, 'Report PDF berhasil di-build');

            // 6. Output sebagai Blob
            const pdfBlob = doc.output('blob');
            return pdfBlob;
        } catch (error) {
            throw this._handleError(error, 'build');
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
     * Helper: bungkus error jadi AppError
     */
    _handleError(error, methodName) {
        if (error instanceof AppError) return error;
        return new AppError(
            `Gagal ${methodName} report PDF: ${error.message}`,
            MODULE_NAME,
            error.code || 'REPORT_PDF_FAILED',
            error
        );
    }
}