/**
 * EconomicAssessmentModel - Snapshot kondisi ekonomi keluarga per periode survei.
 *
 * PENTING: Ini adalah data ARSIP/HISTORI (bukan overwrite). Setiap kali ada survei baru,
 * dibuat dokumen baru dengan periode berbeda. Sistem TIDAK memakai data ini untuk
 * menentukan status Mustahiq/Donatur — keputusan status sepenuhnya di luar sistem
 * (lihat Rancangan bagian 7).
 *
 * Analogi VB: Seperti Class Module untuk tabel "economic_history" dengan field bertipe Object.
 *
 * Skema (dari Rancangan bagian 3.4):
 * {
 *   family_id: string,
 *   periode: string,              // "2026-S1", "2026-07", dst
 *   total_pendapatan: number,
 *   sumber_pendapatan_utama: string,
 *   pengeluaran: { makan, listrik_air, pendidikan, kesehatan, lainnya },
 *   aset: { motor: bool, mobil: bool, kulkas: bool, tv: bool, tanah: bool },
 *   penerima_bantuan_pemerintah: string[],  // ["PKH","BPNT",...]
 *   created_at, created_by
 * }
 */
export class EconomicAssessmentModel {
    /**
     * @param {Object} data - Data assessment
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.family_id = data.family_id || null;
        this.periode = data.periode || '';
        this.total_pendapatan = data.total_pendapatan || 0;
        this.sumber_pendapatan_utama = data.sumber_pendapatan_utama || '';

        // Sub-object pengeluaran — default 0 kalau tidak diisi
        this.pengeluaran = {
            makan: 0,
            listrik_air: 0,
            pendidikan: 0,
            kesehatan: 0,
            lainnya: 0,
            ...(data.pengeluaran || {})
        };

        // Sub-object aset — default false kalau tidak diisi
        this.aset = {
            motor: false,
            mobil: false,
            kulkas: false,
            tv: false,
            tanah: false,
            ...(data.aset || {})
        };

        // Array nama bantuan pemerintah yang diterima
        this.penerima_bantuan_pemerintah = Array.isArray(data.penerima_bantuan_pemerintah)
            ? data.penerima_bantuan_pemerintah
            : [];

        this.created_at = data.created_at || null;
        this.created_by = data.created_by || null;
    }

    /**
     * Hitung total pengeluaran dari semua kategori
     * @returns {number}
     */
    calculateTotalPengeluaran() {
        return Object.values(this.pengeluaran).reduce((sum, val) => sum + (Number(val) || 0), 0);
    }

    /**
     * Hitung selisih (surplus/defisit) = pendapatan - pengeluaran
     * @returns {number} Positif = surplus, negatif = defisit
     */
    calculateSelisih() {
        return (Number(this.total_pendapatan) || 0) - this.calculateTotalPengeluaran();
    }

    /**
     * Validasi field-field wajib
     * @returns {Array<string>} Array error messages (kosong jika valid)
     */
    validate() {
        const errors = [];

        if (!this.family_id) {
            errors.push('Family ID wajib diisi');
        }
        if (!this.periode || this.periode.trim() === '') {
            errors.push('Periode wajib diisi (misal: "2026-S1" atau "2026-07")');
        }
        if (typeof this.total_pendapatan !== 'number' || this.total_pendapatan < 0) {
            errors.push('Total pendapatan harus angka tidak negatif');
        }

        // Validasi sub-object pengeluaran — tiap field harus angka tidak negatif
        const pengeluaranFields = ['makan', 'listrik_air', 'pendidikan', 'kesehatan', 'lainnya'];
        for (const field of pengeluaranFields) {
            const val = this.pengeluaran[field];
            if (typeof val !== 'number' || val < 0) {
                errors.push(`Pengeluaran.${field} harus angka tidak negatif`);
            }
        }

        // Validasi sub-object aset — tiap field harus boolean
        const asetFields = ['motor', 'mobil', 'kulkas', 'tv', 'tanah'];
        for (const field of asetFields) {
            if (typeof this.aset[field] !== 'boolean') {
                errors.push(`Aset.${field} harus boolean (true/false)`);
            }
        }

        // Validasi array penerima bantuan — harus array of string
        if (!Array.isArray(this.penerima_bantuan_pemerintah)) {
            errors.push('Penerima bantuan pemerintah harus berupa array');
        }

        return errors;
    }

    /**
     * Konversi dari format Firestore ke Model instance
     * @param {Object} docSnap - Firestore document snapshot
     * @returns {EconomicAssessmentModel}
     */
    static fromFirestore(docSnap) {
        const data = docSnap.data();
        return new EconomicAssessmentModel({
            id: docSnap.id,
            ...data
        });
    }

    /**
     * Konversi dari Model ke format Firestore
     * @returns {Object}
     */
    toFirestore() {
        return {
            family_id: this.family_id,
            periode: this.periode,
            total_pendapatan: this.total_pendapatan,
            sumber_pendapatan_utama: this.sumber_pendapatan_utama,
            pengeluaran: { ...this.pengeluaran },
            aset: { ...this.aset },
            penerima_bantuan_pemerintah: [...this.penerima_bantuan_pemerintah]
        };
    }
}