/**
 * ProgramParticipantRepository - Repository khusus untuk collection 'program_participants'.
 */
import { BaseRepository } from './BaseRepository.js';
import { ProgramParticipantModel } from '../models/ProgramParticipantModel.js';
import { Logger } from '../core/Logger.js';

export class ProgramParticipantRepository extends BaseRepository {
    constructor() {
        super('program_participants', ProgramParticipantModel);
    }

    /**
     * Cari semua peserta untuk satu program tertentu.
     * @param {string} programId - ID program
     * @returns {Promise<Array<ProgramParticipantModel>>}
     */
    async findByProgramId(programId) {
        try {
            Logger.info('ProgramParticipantRepository', `Mencari peserta untuk program ${programId}`);
            const results = await this.query([['program_id', '==', programId]]);
            Logger.info('ProgramParticipantRepository', `Ditemukan ${results.length} peserta`);
            return results;
        } catch (error) {
            throw this.handleError(error, 'findByProgramId');
        }
    }

    /**
     * Cari semua program yang diikuti oleh satu keluarga.
     * @param {string} familyId - ID keluarga
     * @returns {Promise<Array<ProgramParticipantModel>>}
     */
    async findByFamilyId(familyId) {
        try {
            Logger.info('ProgramParticipantRepository', `Mencari partisipasi keluarga ${familyId}`);
            const results = await this.query([['family_id', '==', familyId]]);
            return results;
        } catch (error) {
            throw this.handleError(error, 'findByFamilyId');
        }
    }

    /**
     * Cari semua program yang diikuti oleh satu individu (person).
     * @param {string} personId - ID person
     * @returns {Promise<Array<ProgramParticipantModel>>}
     */
    async findByPersonId(personId) {
        try {
            Logger.info('ProgramParticipantRepository', `Mencari partisipasi person ${personId}`);
            const results = await this.query([['person_id', '==', personId]]);
            return results;
        } catch (error) {
            throw this.handleError(error, 'findByPersonId');
        }
    }
}