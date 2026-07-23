/**
 * ProgramRepository - Repository khusus untuk collection 'programs'.
 */
import { BaseRepository } from './BaseRepository.js';
import { ProgramModel } from '../models/ProgramModel.js';
import { Logger } from '../core/Logger.js';

export class ProgramRepository extends BaseRepository {
    constructor() {
        super('programs', ProgramModel);
    }

    /**
     * Cari semua program yang sedang berjalan.
     * @returns {Promise<Array<ProgramModel>>}
     */
    async findActivePrograms() {
        try {
            Logger.info('ProgramRepository', 'Mencari program yang sedang berjalan');
            const results = await this.query([['status', '==', 'berjalan']]);
            Logger.info('ProgramRepository', `Ditemukan ${results.length} program aktif`);
            return results;
        } catch (error) {
            throw this.handleError(error, 'findActivePrograms');
        }
    }

    /**
     * Cari program berdasarkan nama (case-insensitive sederhana via query exact match dulu, 
     * atau bisa dikembangkan ke client-side filter jika perlu).
     */
    async findByName(nama) {
        try {
            Logger.info('ProgramRepository', `Mencari program dengan nama: ${nama}`);
            // Untuk pencarian fleksibel, lebih baik ambil semua 'draft'/'berjalan' lalu filter di client
            // tapi untuk exact match:
            const results = await this.query([['nama', '==', nama]]);
            return results.length > 0 ? results[0] : null;
        } catch (error) {
            throw this.handleError(error, 'findByName');
        }
    }
}