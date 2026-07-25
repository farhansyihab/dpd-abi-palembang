/**
 * FamilyFormFormatter - Menangani semua auto-format input form.
 * 
 * TANGGUNG JAWAB:
 * - Auto-format NIK & No. KK (hanya digit, strip non-digit)
 * - Auto-format Rupiah (titik ribuan) untuk semua field ekonomi
 * - Helper method untuk format saat input dan blur
 */
export class FamilyFormFormatter {
    constructor(controller) {
        this.controller = controller;
    }

    setupAutoFormat() {
        // No. KK & NIK — hanya digit
        ['no_kk', 'nik_kepala_keluarga'].forEach(fieldId => {
            const field = document.getElementById(fieldId);
            field.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '');
            });
        });

        // Penghasilan KK
        const penghasilanField = document.getElementById('penghasilan_kk');
        penghasilanField.addEventListener('input', (e) => this._formatRupiahInput(e));
        penghasilanField.addEventListener('blur', (e) => this._formatRupiahBlur(e));

        // Semua field ekonomi yang berformat Rupiah (class .format-rupiah)
        const ecoRupiahFields = document.querySelectorAll('.format-rupiah');
        ecoRupiahFields.forEach(field => {
            field.addEventListener('input', (e) => this._formatRupiahInput(e));
            field.addEventListener('blur', (e) => this._formatRupiahBlur(e));
        });
    }

    /**
     * Format Rupiah saat user mengetik (tanpa simbol Rp, hanya angka + titik ribuan).
     */
    _formatRupiahInput(e) {
        let value = e.target.value.replace(/\D/g, '');
        e.target.value = value ? new Intl.NumberFormat('id-ID').format(value) : '';
    }

    /**
     * Format Rupiah saat field kehilangan fokus.
     */
    _formatRupiahBlur(e) {
        let value = e.target.value.replace(/\D/g, '');
        e.target.value = value ? new Intl.NumberFormat('id-ID').format(value) : '';
    }

    /**
     * Helper: Parse string Rupiah ke integer.
     * @param {string} rupiahStr - Contoh: "1.500.000"
     * @returns {number} - Contoh: 1500000
     */
    static parseRupiah(rupiahStr) {
        const val = rupiahStr.replace(/\./g, '');
        return val ? parseInt(val, 10) : 0;
    }

    /**
     * Helper: Format integer ke string Rupiah.
     * @param {number} num - Contoh: 1500000
     * @returns {string} - Contoh: "1.500.000"
     */
    static formatRupiah(num) {
        return new Intl.NumberFormat('id-ID').format(num);
    }
}