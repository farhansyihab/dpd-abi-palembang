// public/src/controllers/search/PersonFilterHandler.js
/**
 * PersonFilterHandler - Menangani Tab 2: Filter Person.
 *
 * TANGGUNG JAWAB:
 * - Setup event listener untuk tombol Terapkan Filter & Reset Filter
 * - Setup event listener untuk toggle mode custom penghasilan
 * - Populate dropdown filter (Status ABI, Kaderisasi, Penghasilan Bracket)
 * - Parse criteria dari DOM + validasi min <= max
 * - Delegasi filter ke SearchService.filterPersons()
 * - Delegasi rendering ke PersonSearchResultRenderer
 *
 * DIPISAH dari SearchController karena:
 * - Tab 2 punya 5 jenis filter yang akan terus tumbuh (usia, penghasilan, dll sudah ditambah di Hari 4)
 * - Konsisten dengan pola Composition Pattern
 * - SearchController bisa tetap ramping sebagai orchestrator
 *
 * DELEGASI KE: SearchService.filterPersons(), PersonSearchResultRenderer.render()
 */
import { Logger } from '../../core/Logger.js';

const MODULE_NAME = 'PersonFilterHandler';

export class PersonFilterHandler {
    /**
     * @param {SearchController} controller - Reference ke orchestrator
     */
    constructor(controller) {
        this.controller = controller;
        this.searchService = controller.searchService;
        this.renderer = controller.personRenderer;

        this.setupListeners();
    }

    /**
     * Setup event listener untuk tombol filter dan toggle custom penghasilan.
     */
    setupListeners() {
        const btnTerapkanFilter = document.getElementById('btnTerapkanFilter');
        const btnResetFilter = document.getElementById('btnResetFilter');
        const bracketSelect = document.getElementById('filterPenghasilanBracket');
        const customContainer = document.getElementById('customPenghasilanContainer');

        if (btnTerapkanFilter) {
            btnTerapkanFilter.addEventListener('click', () => this.handleApplyFilter());
        }

        if (btnResetFilter) {
            btnResetFilter.addEventListener('click', () => this.handleResetFilter());
        }

        // Toggle mode custom penghasilan
        if (bracketSelect && customContainer) {
            bracketSelect.addEventListener('change', () => {
                if (bracketSelect.value === 'custom') {
                    customContainer.classList.remove('d-none');
                } else {
                    customContainer.classList.add('d-none');
                    // Clear input custom saat beralih ke bracket
                    const minInput = document.getElementById('filterPenghasilanMin');
                    const maxInput = document.getElementById('filterPenghasilanMax');
                    if (minInput) minInput.value = '';
                    if (maxInput) maxInput.value = '';
                }
            });
        }
    }

    /**
     * Populate dropdown filter dari data yang sudah di-cache di SearchService.
     * Dipanggil sekali setelah loadIndex() berhasil.
     */
    populateFilterDropdowns() {
        try {
            // Populate Status ABI
            const statusABISelect = document.getElementById('filterStatusABI');
            if (statusABISelect) {
                const statusList = this.searchService.getUniqueStatusABI();
                statusList.forEach(status => {
                    const option = document.createElement('option');
                    option.value = status;
                    option.textContent = status.charAt(0).toUpperCase() + status.slice(1);
                    statusABISelect.appendChild(option);
                });
            }

            // Populate Kaderisasi
            const kaderisasiSelect = document.getElementById('filterKaderisasi');
            if (kaderisasiSelect) {
                const kaderList = this.searchService.getUniqueKaderisasi();
                kaderList.forEach(kader => {
                    const option = document.createElement('option');
                    option.value = kader;
                    option.textContent = kader;
                    kaderisasiSelect.appendChild(option);
                });
            }

            // Populate Penghasilan Bracket
            const bracketSelect = document.getElementById('filterPenghasilanBracket');
            if (bracketSelect) {
                const bracketList = this.searchService.getUniquePenghasilanBracket();
                // Sisipkan sebelum opsi "Custom"
                const customOption = bracketSelect.querySelector('option[value="custom"]');
                bracketList.forEach(bracket => {
                    const option = document.createElement('option');
                    option.value = bracket;
                    option.textContent = bracket;
                    bracketSelect.insertBefore(option, customOption);
                });
            }

            Logger.info(MODULE_NAME, 'Dropdown filter berhasil di-populate');
        } catch (error) {
            Logger.warn(MODULE_NAME, 'Gagal populate dropdown filter', error);
        }
    }

    /**
     * Handle klik tombol "Terapkan Filter".
     * Parse semua criteria dari DOM → validasi → delegasi ke SearchService → render.
     */
    handleApplyFilter() {
        try {
            const bracketValue = document.getElementById('filterPenghasilanBracket')?.value || '';

            const criteria = {
                pekerjaan: document.getElementById('filterPekerjaan')?.value || '',
                status_abi: document.getElementById('filterStatusABI')?.value || '',
                kaderisasi: document.getElementById('filterKaderisasi')?.value || '',
                usia_min: document.getElementById('filterUsiaMin')?.value || '',
                usia_max: document.getElementById('filterUsiaMax')?.value || '',
                penghasilan_bracket: bracketValue,
                penghasilan_min: bracketValue === 'custom'
                    ? this._parseRupiah(document.getElementById('filterPenghasilanMin')?.value)
                    : null,
                penghasilan_max: bracketValue === 'custom'
                    ? this._parseRupiah(document.getElementById('filterPenghasilanMax')?.value)
                    : null
            };

            // Validasi: usia min harus <= max
            if (criteria.usia_min && criteria.usia_max) {
                if (parseInt(criteria.usia_min, 10) > parseInt(criteria.usia_max, 10)) {
                    this.controller.showAlert('Usia minimum tidak boleh lebih besar dari usia maximum', 'warning');
                    return;
                }
            }

            // Validasi: penghasilan min harus <= max
            if (criteria.penghasilan_min !== null && criteria.penghasilan_max !== null) {
                if (criteria.penghasilan_min > criteria.penghasilan_max) {
                    this.controller.showAlert('Penghasilan minimum tidak boleh lebih besar dari penghasilan maximum', 'warning');
                    return;
                }
            }

            Logger.info(MODULE_NAME, 'Menerapkan filter person', criteria);
            const results = this.searchService.filterPersons(criteria);
            this.renderer.render(results);
        } catch (error) {
            this.controller.showError(error, 'Terjadi kesalahan saat memfilter data');
        }
    }

    /**
     * Handle klik tombol "Reset Filter".
     * Reset semua field filter ke kondisi awal + reset renderer.
     */
    handleResetFilter() {
        try {
            const fieldsToReset = [
                'filterPekerjaan',
                'filterStatusABI',
                'filterKaderisasi',
                'filterUsiaMin',
                'filterUsiaMax',
                'filterPenghasilanBracket',
                'filterPenghasilanMin',
                'filterPenghasilanMax'
            ];

            fieldsToReset.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) field.value = '';
            });

            const customContainer = document.getElementById('customPenghasilanContainer');
            if (customContainer) {
                customContainer.classList.add('d-none');
            }

            this.renderer.showInitialState();
            Logger.info(MODULE_NAME, 'Filter di-reset');
        } catch (error) {
            Logger.warn(MODULE_NAME, 'Gagal reset filter', error);
        }
    }

    /**
     * Helper: parse string Rupiah ke integer.
     * Contoh: "1.500.000" → 1500000
     *
     * CATATAN: Logika ini sama dengan FamilyFormFormatter.parseRupiah dan PersonFormFormatter.parseRupiah.
     * Untuk sekarang tetap sebagai private helper di handler ini, tapi kalau nanti ada reuse keempat,
     * pertimbangkan ekstraksi ke utils/RupiahFormatter.js (lihat catatan di Log Progres).
     *
     * @param {string} rupiahStr - String Rupiah dengan titik ribuan
     * @returns {number|null} Integer atau null jika kosong
     */
    _parseRupiah(rupiahStr) {
        if (!rupiahStr) return null;
        const val = rupiahStr.replace(/\./g, '');
        return val ? parseInt(val, 10) : null;
    }
}