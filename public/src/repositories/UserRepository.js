/**
 * UserRepository - Repository khusus untuk collection 'users'.
 */
import { BaseRepository } from './BaseRepository.js';
import { UserModel } from '../models/UserModel.js';
import { Logger } from '../core/Logger.js';

export class UserRepository extends BaseRepository {
    constructor() {
        super('users', UserModel);
    }

    /**
     * Cari user berdasarkan email.
     * @param {string} email - Email user
     * @returns {Promise<UserModel|null>}
     */
    async findByEmail(email) {
        try {
            Logger.info('UserRepository', `Mencari user dengan email: ${email}`);
            const results = await this.query([['email', '==', email]]);

            if (results.length === 0) {
                Logger.warn('UserRepository', `User dengan email ${email} tidak ditemukan`);
                return null;
            }
            return results[0];
        } catch (error) {
            throw this.handleError(error, 'findByEmail');
        }
    }

    /**
     * Cari semua user yang masih aktif.
     * @returns {Promise<Array<UserModel>>}
     */
    async findActiveUsers() {
        try {
            Logger.info('UserRepository', 'Mencari semua user yang aktif');
            const results = await this.query([['is_active', '==', true]]);
            Logger.info('UserRepository', `Ditemukan ${results.length} user aktif`);
            return results;
        } catch (error) {
            throw this.handleError(error, 'findActiveUsers');
        }
    }
}