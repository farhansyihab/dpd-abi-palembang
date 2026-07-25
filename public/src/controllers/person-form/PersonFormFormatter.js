export class PersonFormFormatter {
    constructor(modalManager) {
        this.modalManager = modalManager;
    }

    setupAutoFormat() {
        // NIK: hanya angka
        const nik = document.getElementById('modal_nik');
        nik.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });

        // Penghasilan: format Rupiah
        const penghasilan = document.getElementById('modal_penghasilan');
        penghasilan.addEventListener('input', (e) => this._formatRupiah(e));
        penghasilan.addEventListener('blur', (e) => this._formatRupiah(e));
    }

    _formatRupiah(e) {
        let value = e.target.value.replace(/\D/g, '');
        e.target.value = value ? new Intl.NumberFormat('id-ID').format(value) : '';
    }

    static parseRupiah(rupiahStr) {
        const val = rupiahStr.replace(/\./g, '');
        return val ? parseInt(val, 10) : 0;
    }

    formatRupiah(num) {
        return new Intl.NumberFormat('id-ID').format(num);
    }
}