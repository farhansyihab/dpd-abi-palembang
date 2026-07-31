// public/src/controllers/person-form/RelationListRenderer.js
/**
 * RelationListRenderer - Menangani rendering daftar relasi existing & operasi hapus.
 *
 * TANGGUNG JAWAB:
 * - Load daftar relasi existing untuk satu person
 * - Render daftar relasi ke DOM (list-group)
 * - Format tipe relasi ke bahasa manusia (snake_case → Title Case)
 * - Handle hapus relasi + reload daftar setelah hapus
 *
 * DIPISAH dari PersonRelationManager karena:
 * - Logic render + format adalah tanggung jawab "tampilan", berbeda dari "aksi" (simpan/cari)
 * - Konsisten dengan pola SearchResultRenderer & PersonSearchResultRenderer di folder search/
 *
 * DELEGASI KE: PersonService.getRelationsForPerson(), PersonService.deleteRelation()
 */
import { Logger } from '../../core/Logger.js';

const MODULE_NAME = 'RelationListRenderer';

/**
 * Map tipe relasi internal (snake_case) ke label bahasa manusia.
 * Didefinisikan sebagai konstanta module supaya bisa di-reuse tanpa instantiate class.
 */
const TIPE_RELASI_MAP = {
    'anak': 'Anak',
    'orang_tua': 'Orang Tua',
    'saudara': 'Saudara Kandung',
    'paman_bibi': 'Paman/Bibi',
    'keponakan': 'Keponakan',
    'mertua': 'Mertua',
    'ipar': 'Ipar',
    'sepupu': 'Sepupu',
    'lainnya': 'Lainnya'
};

export class RelationListRenderer {
    /**
     * @param {PersonRelationManager} relationManager - Reference ke orchestrator
     */
    constructor(relationManager) {
        this.relationManager = relationManager;
        this.controller = relationManager.controller;
    }

    /**
     * Muat dan render daftar relasi yang sudah ada untuk person ini.
     * Dipanggil setiap kali modal relasi dibuka.
     *
     * @param {string} personId - ID person yang sedang dilihat relasinya
     */
    async loadExistingRelations(personId) {
        const container = document.getElementById('existingRelationsContainer');
        const listEl = document.getElementById('existingRelationsList');

        // Defensive check: kalau container tidak ada di DOM, skip silently
        if (!container || !listEl) {
            Logger.warn(MODULE_NAME, 'Container relasi existing tidak ditemukan di DOM');
            return;
        }

        try {
            this.controller.showLoading(true);
            const relations = await this.controller.personService.getRelationsForPerson(personId);

            if (relations.length === 0) {
                listEl.innerHTML = '<p class="text-muted text-center py-3 mb-0">Belum ada relasi tercatat untuk person ini.</p>';
            } else {
                listEl.innerHTML = this._renderRelationsList(relations, personId);
                // Pasang event delegation untuk tombol hapus
                this._attachDeleteHandlers(listEl, personId);
            }

            container.classList.remove('d-none');
            Logger.info(MODULE_NAME, `Daftar relasi dimuat: ${relations.length} relasi`, { personId });
        } catch (error) {
            this.controller.showError(error, 'Gagal memuat daftar relasi');
            listEl.innerHTML = '<p class="text-danger text-center py-3 mb-0">Gagal memuat data relasi.</p>';
            Logger.error(MODULE_NAME, 'Load daftar relasi gagal', error);
        } finally {
            this.controller.showLoading(false);
        }
    }

    /**
     * Hapus relasi berdasarkan ID, lalu reload daftar.
     *
     * @param {string} relationId - ID relasi yang akan dihapus
     * @param {string} personId - ID person (untuk reload daftar setelah hapus)
     */
    async handleHapusRelasi(relationId, personId) {
        if (!confirm('Yakin ingin menghapus relasi ini?')) return;

        try {
            this.controller.showLoading(true);
            // Delegasi ke Service Layer
            await this.controller.personService.deleteRelation(relationId);
            this.controller.showAlert('Relasi berhasil dihapus.', 'success');
            Logger.info(MODULE_NAME, `Relasi ${relationId} berhasil dihapus`);

            // Reload daftar relasi setelah hapus
            await this.loadExistingRelations(personId);
        } catch (error) {
            this.controller.showError(error, 'Gagal menghapus relasi');
            Logger.error(MODULE_NAME, 'Hapus relasi gagal', error);
        } finally {
            this.controller.showLoading(false);
        }
    }

    /**
     * Format tipe relasi ke bahasa manusia.
     * "kepala_keluarga" → "Kepala Keluarga" (atau sesuai map)
     *
     * @param {string} tipe - Tipe relasi internal (snake_case)
     * @returns {string} Label bahasa manusia
     */
    formatTipeRelasi(tipe) {
        return TIPE_RELASI_MAP[tipe] || tipe;
    }

    /**
     * Helper: render HTML daftar relasi.
     * Dipisah dari loadExistingRelations supaya mudah di-test & di-reuse.
     *
     * @param {Array} relations - Array dari PersonService.getRelationsForPerson()
     * @param {string} personId - ID person yang sedang dilihat
     * @returns {string} HTML string
     */
    _renderRelationsList(relations, personId) {
        return relations.map(({ relation, relatedPerson, direction }) => {
            if (!relatedPerson) return ''; // Skip jika person target sudah dihapus

            // Tentukan label berdasarkan arah relasi
            let label;
            if (direction === 'source') {
                // Person ini → target
                label = `${this.formatTipeRelasi(relation.tipe_relasi)} dari ${relatedPerson.nama}`;
            } else {
                // Target → person ini (relasi terbalik)
                label = `${this.formatTipeRelasi(relation.tipe_relasi)} ke ${relatedPerson.nama}`;
            }

            return `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <i class="bi bi-diagram-3 text-info me-2"></i>
                        <strong>${relatedPerson.nama}</strong>
                        <small class="text-muted d-block">NIK: ${relatedPerson.nik} — ${label}</small>
                    </div>
                    <button class="btn btn-sm btn-outline-danger btn-hapus-relasi"
                            data-relation-id="${relation.id}"
                            title="Hapus relasi">
                        <i class="bi bi-trash"></i>
                    </button>
                </li>
            `;
        }).join('');
    }

    /**
     * Helper: pasang event delegation untuk semua tombol hapus relasi.
     * Dipisah supaya tidak bercampur dengan logic render.
     *
     * @param {HTMLElement} listEl - Elemen <ul> yang berisi daftar relasi
     * @param {string} personId - ID person (untuk reload setelah hapus)
     */
    _attachDeleteHandlers(listEl, personId) {
        listEl.querySelectorAll('.btn-hapus-relasi').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const relationId = e.currentTarget.dataset.relationId;
                this.handleHapusRelasi(relationId, personId);
            });
        });
    }
}