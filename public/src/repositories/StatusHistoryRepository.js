/**
 * StatusHistoryRepository - Repository khusus untuk collection 'status_history'.
 */
import { BaseRepository } from './BaseRepository.js';
import { StatusHistoryModel } from '../models/StatusHistoryModel.js';
import { query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Logger } from '../core/Logger.js';

export class StatusHistoryRepository extends BaseRepository {
    constructor() {
        super('status_history', StatusHistoryModel);
    }

    /**
     * Cari semua riwayat perubahan status untuk satu keluarga.
     * Diurutkan berdasarkan tanggal descending (terbaru di atas).
     * @param {string} familyId - ID keluarga
     * @returns {Promise<Array<StatusHistoryModel>>}
     */
    async findByFamilyId(familyId) {
        try {
            Logger.info('StatusHistoryRepository', `Mencari riwayat status untuk keluarga ${familyId}`);

            const q = query(
                this.collectionRef,
                where('family_id', '==', familyId),
                orderBy('tanggal', 'desc')
            );
            const querySnapshot = await getDocs(q);

            const results = [];
            querySnapshot.forEach((docSnap) => {
                results.push(StatusHistoryModel.fromFirestore(docSnap));
            });

            Logger.info('StatusHistoryRepository', `Ditemukan ${results.length} riwayat status`);
            return results;
        } catch (error) {
            throw this.handleError(error, 'findByFamilyId');
        }
    }

    /**
     * Method convenience untuk menambah entri riwayat status baru.
     * @param {string} familyId - ID keluarga
     * @param {string} statusLama - Status sebelumnya
     * @param {string} statusBaru - Status baru
     * @param {string} uid - UID user yang mengubah
     * @param {string|null} catatan - Catatan opsional
     * @returns {Promise<string>} ID dokumen yang dibuat
     */
    async addEntry(familyId, statusLama, statusBaru, uid, catatan = null) {
        return await this.create({
            family_id: familyId,
            status_lama: statusLama,
            status_baru: statusBaru,
            dicatat_oleh_uid: uid,
            catatan: catatan
        });
    }
}