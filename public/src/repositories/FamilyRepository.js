/**
 * FamilyRepository - Repository khusus untuk collection 'families'.
 * Mewarisi BaseRepository dan menambahkan method spesifik untuk keluarga.
 * 
 * Analogi VB: Seperti Class yang inherit dari base class, lalu tambah method spesifik.
 */
import { BaseRepository } from './BaseRepository.js';
import { FamilyModel } from '../models/FamilyModel.js';
import { where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Logger } from '../core/Logger.js';

export class FamilyRepository extends BaseRepository {
    constructor() {
        super('families', FamilyModel);
    }

    /**
     * Cari keluarga berdasarkan No. KK
     * @param {string} noKK - Nomor KK (16 digit)
     * @returns {Promise<FamilyModel|null>}
     */
    async findByNoKK(noKK) {
        try {
            Logger.info('FamilyRepository', `Mencari keluarga dengan No. KK: ${noKK}`);

            const results = await this.query([['no_kk', '==', noKK]]);

            if (results.length === 0) {
                Logger.warn('FamilyRepository', `Keluarga dengan No. KK ${noKK} tidak ditemukan`);
                return null;
            }

            return results[0];
        } catch (error) {
            throw this.handleError(error, 'findByNoKK');
        }
    }

    /**
     * Cari keluarga berdasarkan nama atau alamat (menggunakan field search)
     * @param {string} term - Kata kunci pencarian
     * @returns {Promise<Array<FamilyModel>>}
     */
    async searchByNameOrAddress(term) {
        try {
            Logger.info('FamilyRepository', `Mencari keluarga dengan term: ${term}`);

            const termLower = term.toLowerCase();

            // Ambil semua keluarga (limit besar untuk pencarian)
            const allFamilies = await this.list(1000);

            // Filter di client side berdasarkan search fields
            const results = allFamilies.filter(family =>
                family.search_name_lower.includes(termLower) ||
                family.search_address_lower.includes(termLower)
            );

            Logger.info('FamilyRepository', `Ditemukan ${results.length} keluarga`);
            return results;
        } catch (error) {
            throw this.handleError(error, 'searchByNameOrAddress');
        }
    }

    /**
     * Update status bantuan keluarga
     * @param {string} familyId - ID keluarga
     * @param {string} status - Status baru ('mustahiq', 'donatur', 'belum_ditentukan')
     * @param {string} uid - UID user yang melakukan perubahan
     */
    async updateStatus(familyId, status, uid) {
        try {
            Logger.info('FamilyRepository', `Mengupdate status keluarga ${familyId} ke ${status}`);

            await this.update(familyId, {
                status_bantuan: status,
                status_bantuan_updated_at: new Date(),
                status_bantuan_updated_by: uid
            });

            Logger.info('FamilyRepository', `Status keluarga ${familyId} berhasil diupdate`);
        } catch (error) {
            throw this.handleError(error, 'updateStatus');
        }
    }
}