// public/src/controllers/person-form/PersonRelationManager.js
/**
 * PersonRelationManager - Orchestrator untuk modal relasi antar-person.
 *
 * TUGAS UTAMA:
 * - Lifecycle modal relasi (buka/tutup/reset)
 * - Wiring event listener (tombol Cari & Simpan)
 * - Orkestrasi simpan relasi baru (delegasi ke RelationSearchHandler untuk cari,
 *   RelationListRenderer untuk load daftar)
 *
 * DELEGASI:
 * - Pencarian target NIK → RelationSearchHandler
 * - Load/render daftar relasi existing → RelationListRenderer
 *
 * PENTING: Class ini TIDAK mengandung logic pencarian, rendering, atau format.
 * Semua didelegasikan ke helper masing-masing (Composition Pattern).
 *
 * Analogi: Seperti FamilyFormController setelah refactor Sesi 7 — orchestrator tipis
 * yang memegang referensi ke helper, bukan tempat semua logika ditulis.
 */
import { Logger } from '../../core/Logger.js';
import { RelationSearchHandler } from './RelationSearchHandler.js';
import { RelationListRenderer } from './RelationListRenderer.js';

const MODULE_NAME = 'PersonRelationManager';

export class PersonRelationManager {
    /**
     * @param {PersonFormController} controller - Reference ke controller utama
     */
    constructor(controller) {
        this.controller = controller;
        this.modalEl = document.getElementById('relationModal');
        this.modalInstance = this.modalEl ? new bootstrap.Modal(this.modalEl) : null;
        this.form = document.getElementById('relationForm');

        // ✅ PERBAIKAN BUG A: hanya ada SATU definisi openForPerson sekarang
        // (sebelumnya ada 2 definisi yang saling menimpa)

        // Compose helper classes
        this.searchHandler = new RelationSearchHandler(this);
        this.listRenderer = new RelationListRenderer(this);

        this.setupListeners();
    }

    /**
     * Setup event listener untuk modal relasi.
     * Hanya wiring — logic ada di helper masing-masing.
     */
    setupListeners() {
        // Tombol Cari Target → delegasi ke RelationSearchHandler
        const btnCari = document.getElementById('btnCariTarget');
        if (btnCari) {
            btnCari.addEventListener('click', () => this.searchHandler.handleCariTarget());
        }

        // Tombol Simpan Relasi → handle di orchestrator (karena ini operasi utama)
        const btnSimpan = document.getElementById('btnSimpanRelasi');
        if (btnSimpan) {
            btnSimpan.addEventListener('click', () => this.handleSimpanRelasi());
        }

        // Reset state saat modal ditutup
        if (this.modalEl) {
            this.modalEl.addEventListener('hidden.bs.modal', () => {
                this._resetModalState();
            });
        }
    }

    /**
     * Buka modal relasi untuk person tertentu.
     * Dipanggil dari PersonListManager saat user klik tombol "Relasi" di tabel.
     *
     * @param {string} personId - ID person yang akan dikelola relasinya
     */
    async openForPerson(personId) {
        // Reset form & state
        document.getElementById('source_person_id').value = personId;
        this.controller.clearAllFieldErrors();
        this._resetModalState();

        // Load daftar relasi existing (delegasi ke RelationListRenderer)
        await this.listRenderer.loadExistingRelations(personId);

        // Tampilkan modal
        if (this.modalInstance) {
            this.modalInstance.show();
        }
        Logger.info(MODULE_NAME, `Modal relasi dibuka untuk person ${personId}`);
    }

    /**
     * Handle klik tombol "Simpan Relasi".
     * Validasi input → delegasi ke PersonService.linkRelation() → tutup modal.
     */
    async handleSimpanRelasi() {
        const sourceId = document.getElementById('source_person_id').value;
        const targetId = document.getElementById('target_person_id').value;
        const tipeRelasi = document.getElementById('relasi_tipe').value;
        const btnSimpan = document.getElementById('btnSimpanRelasi');
        const spinner = document.getElementById('relasiLoading');

        this.controller.clearAllFieldErrors();

        // Validasi: target harus sudah dipilih (lewat tombol Cari)
        if (!targetId) {
            this.controller.showFieldError(
                'relasi_target_nik',
                'Harap cari dan pastikan target relasi ditemukan terlebih dahulu'
            );
            return;
        }

        // Validasi: tipe relasi wajib dipilih
        if (!tipeRelasi) {
            this.controller.showFieldError('relasi_tipe', 'Tipe relasi wajib dipilih');
            return;
        }

        try {
            btnSimpan.disabled = true;
            spinner.classList.remove('d-none');

            // Delegasi ke Service Layer
            await this.controller.personService.linkRelation(sourceId, targetId, tipeRelasi);
            this.controller.showAlert('Relasi antar-person berhasil ditambahkan!', 'success');
            Logger.info(MODULE_NAME, 'Relasi berhasil disimpan', { sourceId, targetId, tipeRelasi });

            if (this.modalInstance) {
                this.modalInstance.hide();
            }
        } catch (error) {
            // 🩹 QUICK WORKAROUND: Jika error karena data sudah ada (akibat retry emulator),
            // anggap sukses.
            if (error.message.includes('ALREADY_EXISTS') || error.code === 'DUPLICATE_RELATION') {
                this.controller.showAlert('Relasi sudah tercatat di sistem (Data valid).', 'success');
                if (this.modalInstance) {
                    this.modalInstance.hide();
                }
            } else {
                // Error lain (validasi gagal, network mati total) → tampilkan error asli
                this.controller.showError(error, 'Gagal menyimpan relasi');
            }
        } finally {
            btnSimpan.disabled = false;
            spinner.classList.add('d-none');
        }
    }

    /**
     * Helper: reset state modal ke kondisi awal.
     * Dipanggil saat modal dibuka & saat modal ditutup.
     */
    _resetModalState() {
        if (this.form) {
            this.form.reset();
        }
        const targetNamaDisplay = document.getElementById('target_nama_display');
        if (targetNamaDisplay) {
            targetNamaDisplay.textContent = '-';
        }
        const targetPersonId = document.getElementById('target_person_id');
        if (targetPersonId) {
            targetPersonId.value = '';
        }
    }
}