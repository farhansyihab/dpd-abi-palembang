/**
 * PersonRepository - Repository khusus untuk collection 'persons'.
 * Mewarisi BaseRepository dan menambahkan method spesifik untuk person.
 * 
 * Analogi VB: Seperti Class yang inherit dari base class, lalu tambah method spesifik.
 */
import { BaseRepository } from './BaseRepository.js';
import { PersonModel } from '../models/PersonModel.js';
import { Logger } from '../core/Logger.js';

export class PersonRepository extends BaseRepository {
    constructor() {
        super('persons', PersonModel);
    }

    /**
     * Cari semua person dalam satu keluarga
     * @param {string} familyId - ID keluarga
     * @returns {Promise<Array<PersonModel>>}
     */
    async findByFamilyId(familyId) {
        try {
            Logger.info('PersonRepository', `Mencari person dalam keluarga ${familyId}`);

            const results = await this.query([['family_id', '==', familyId]]);

            Logger.info('PersonRepository', `Ditemukan ${results.length} person`);
            return results;
        } catch (error) {
            throw this.handleError(error, 'findByFamilyId');
        }
    }

    /**
     * Cari person berdasarkan NIK
     * @param {string} nik - NIK (16 digit)
     * @returns {Promise<PersonModel|null>}
     */
    async findByNIK(nik) {
        try {
            Logger.info('PersonRepository', `Mencari person dengan NIK: ${nik}`);

            const results = await this.query([['nik', '==', nik]]);

            if (results.length === 0) {
                Logger.warn('PersonRepository', `Person dengan NIK ${nik} tidak ditemukan`);
                return null;
            }

            return results[0];
        } catch (error) {
            throw this.handleError(error, 'findByNIK');
        }
    }

    /**
     * Cari kepala keluarga dalam satu keluarga
     * @param {string} familyId - ID keluarga
     * @returns {Promise<PersonModel|null>}
     */
    async findKepalaKeluarga(familyId) {
        try {
            Logger.info('PersonRepository', `Mencari kepala keluarga ${familyId}`);

            const results = await this.query([
                ['family_id', '==', familyId],
                ['hubungan_dlm_keluarga', '==', 'kepala_keluarga']
            ]);

            if (results.length === 0) {
                Logger.warn('PersonRepository', `Kepala keluarga tidak ditemukan untuk keluarga ${familyId}`);
                return null;
            }

            return results[0];
        } catch (error) {
            throw this.handleError(error, 'findKepalaKeluarga');
        }
    }
}