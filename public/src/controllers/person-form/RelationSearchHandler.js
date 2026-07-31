// public/src/controllers/person-form/RelationSearchHandler.js
/**
 * RelationSearchHandler - Menangani pencarian target relasi berdasarkan NIK.
 *
 * TANGGUNG JAWAB:
 * - Validasi input NIK target
 * - Delegasi pencarian ke PersonService.getPersonByNIK()
 * - Validasi: target tidak boleh diri sendiri
 * - Update UI: simpan target_person_id ke hidden field, tampilkan nama target
 *
 * DIPISAH dari PersonRelationManager karena:
 * - Logic pencarian + validasi target adalah tanggung jawab yang berbeda dari lifecycle modal
 * - Konsisten dengan pola Composition Pattern (seperti FamilyFormValidator, PersonFormValidator)
 *
 * DELEGASI KE: PersonService.getPersonByNIK()
 */
import { Logger } from '../../core/Logger.js';

const MODULE_NAME = 'RelationSearchHandler';

export class RelationSearchHandler {
    /**
     * @param {PersonRelationManager} relationManager - Reference ke orchestrator
     */
    constructor(relationManager) {
        this.relationManager = relationManager;
        this.controller = relationManager.controller;
    }

    /**
     * Handle klik tombol "Cari" di modal relasi.
     *
     * ALUR:
     * 1. Validasi NIK target tidak kosong
     * 2. Panggil PersonService.getPersonByNIK()
     * 3. Validasi target bukan diri sendiri
     * 4. Update UI: simpan ID target, tampilkan nama
     *
     * PERBAIKAN BUG (dari kode lama):
     * - Alert "Gagal mencari" yang sebelumnya ada di blok `finally` (selalu jalan)
     *   sekarang dipindah ke blok `catch` (hanya jalan saat benar-benar error)
     */
    async handleCariTarget() {
        const nikTarget = document.getElementById('relasi_target_nik').value.trim();
        this.controller.clearFieldError('relasi_target_nik');

        // 1. Validasi input
        if (!nikTarget) {
            this.controller.showFieldError('relasi_target_nik', 'NIK Target wajib diisi');
            return;
        }

        try {
            this.controller.showLoading(true);

            // 2. Delegasi ke Service Layer (Strict Layered Architecture)
            const targetPerson = await this.controller.personService.getPersonByNIK(nikTarget);

            if (!targetPerson) {
                this.controller.showFieldError(
                    'relasi_target_nik',
                    'Person dengan NIK tersebut tidak ditemukan di sistem'
                );
                return;
            }

            // 3. Validasi: tidak boleh relasi dengan diri sendiri
            const sourceId = document.getElementById('source_person_id').value;
            if (targetPerson.id === sourceId) {
                this.controller.showFieldError(
                    'relasi_target_nik',
                    'Tidak bisa membuat relasi dengan diri sendiri'
                );
                return;
            }

            // 4. Update UI: simpan ID target yang valid ke hidden field
            document.getElementById('target_person_id').value = targetPerson.id;
            document.getElementById('target_nama_display').textContent =
                `${targetPerson.nama} (NIK: ${targetPerson.nik})`;

            this.controller.showAlert('Target relasi ditemukan!', 'success', 3000);
            Logger.info(MODULE_NAME, 'Target relasi ditemukan', {
                targetId: targetPerson.id,
                targetNama: targetPerson.nama
            });
        } catch (error) {
            // ✅ PERBAIKAN BUG B: alert "gagal" sekarang hanya muncul di catch, bukan finally
            this.controller.showError(error, 'Gagal mencari target relasi');
            Logger.error(MODULE_NAME, 'Pencarian target relasi gagal', error);
        } finally {
            this.controller.showLoading(false);
            // Hapus state loading dari tombol cari jika ada
            const btnCari = document.getElementById('btnCariTarget');
            if (btnCari) btnCari.disabled = false;
        }
    }
}