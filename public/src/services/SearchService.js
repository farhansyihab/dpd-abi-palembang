/**
 * SearchService - Pencarian & filtering data keluarga.
 *
 * STRATEGI (sesuai Rancangan bagian 4):
 * - Load daftar ringkas keluarga ke memory browser saat halaman pencarian dibuka
 * - Filter di client dengan .includes() + debounce
 * - Jauh lebih cepat & murah (read quota) dibanding query Firestore tiap ketik
 *
 * CATATAN: Untuk skala >10.000 record, pertimbangkan migrasi ke Typesense/Meilisearch.
 */
import { FamilyRepository } from '../repositories/FamilyRepository.js';
import { AppError } from '../core/AppError.js';
import { Logger } from '../core/Logger.js';

const MODULE_NAME = 'SearchService';

export class SearchService {
    constructor() {
        this.familyRepo = new FamilyRepository();
        this._cachedIndex = []; // Cache daftar keluarga di memory
        this._lastLoadTime = null; // Timestamp terakhir load
        this._cacheTTL = 5 * 60 * 1000; // Cache valid 5 menit
    }

    /**
     * Load indeks keluarga ke memory browser.
     * Dipanggil sekali saat halaman pencarian dibuka, atau saat cache expired.
     *
     * @param {boolean} forceReload - Paksa reload meski cache belum expired
     */
    async loadIndex(forceReload = false) {
        try {
            Logger.info(MODULE_NAME, 'Memuat indeks keluarga ke memory');

            // Cek apakah cache masih valid
            const now = Date.now();
            if (!forceReload && this._cachedIndex.length > 0 && this._lastLoadTime) {
                const age = now - this._lastLoadTime;
                if (age < this._cacheTTL) {
                    Logger.info(MODULE_NAME, `Cache masih valid (umur: ${Math.round(age / 1000)}s)`);
                    return;
                }
            }

            // Load dari Firestore (limit besar untuk pencarian)
            const families = await this.familyRepo.list(10000);

            // Simpan hanya field yang diperlukan untuk pencarian (hemat memory)
            this._cachedIndex = families.map(f => ({
                id: f.id,
                no_kk: f.no_kk,
                search_name_lower: f.search_name_lower || '',
                search_address_lower: f.search_address_lower || '',
                status_bantuan: f.status_bantuan,
                kepala_keluarga_person_id: f.kepala_keluarga_person_id
            }));

            this._lastLoadTime = now;
            Logger.info(MODULE_NAME, `Indeks berhasil dimuat: ${this._cachedIndex.length} keluarga`);
        } catch (error) {
            throw this._handleError(error, 'loadIndex');
        }
    }

    /**
     * Cari keluarga berdasarkan nama (kepala keluarga).
     * Filter di client menggunakan .includes() pada field search_name_lower.
     *
     * @param {string} term - Kata kunci pencarian (case-insensitive)
     * @returns {Array<Object>} Array keluarga yang cocok
     */
    searchByName(term) {
        try {
            if (!term || term.trim() === '') {
                return [];
            }

            const termLower = term.toLowerCase().trim();
            Logger.info(MODULE_NAME, `Mencari nama: "${term}"`);

            const results = this._cachedIndex.filter(family =>
                family.search_name_lower.includes(termLower)
            );

            Logger.info(MODULE_NAME, `Ditemukan ${results.length} hasil`);
            return results;
        } catch (error) {
            throw this._handleError(error, 'searchByName');
        }
    }

    /**
     * Cari keluarga berdasarkan alamat.
     * Filter di client menggunakan .includes() pada field search_address_lower.
     *
     * @param {string} term - Kata kunci pencarian (case-insensitive)
     * @returns {Array<Object>} Array keluarga yang cocok
     */
    searchByAddress(term) {
        try {
            if (!term || term.trim() === '') {
                return [];
            }

            const termLower = term.toLowerCase().trim();
            Logger.info(MODULE_NAME, `Mencari alamat: "${term}"`);

            const results = this._cachedIndex.filter(family =>
                family.search_address_lower.includes(termLower)
            );

            Logger.info(MODULE_NAME, `Ditemukan ${results.length} hasil`);
            return results;
        } catch (error) {
            throw this._handleError(error, 'searchByAddress');
        }
    }

    /**
     * Cari keluarga berdasarkan No. KK (exact match).
     *
     * @param {string} noKK - No. KK (16 digit)
     * @returns {Object|null} Keluarga yang cocok atau null
     */
    searchByNoKK(noKK) {
        try {
            if (!noKK || noKK.trim() === '') {
                return null;
            }

            Logger.info(MODULE_NAME, `Mencari No. KK: "${noKK}"`);

            const result = this._cachedIndex.find(family => family.no_kk === noKK);
            Logger.info(MODULE_NAME, result ? 'Ditemukan' : 'Tidak ditemukan');
            return result || null;
        } catch (error) {
            throw this._handleError(error, 'searchByNoKK');
        }
    }

    /**
     * Filter keluarga berdasarkan status bantuan.
     *
     * @param {string} status - Status ('mustahiq', 'donatur', 'belum_ditentukan')
     * @returns {Array<Object>} Array keluarga dengan status tersebut
     */
    filterByStatus(status) {
        try {
            Logger.info(MODULE_NAME, `Filter status: "${status}"`);

            const results = this._cachedIndex.filter(family =>
                family.status_bantuan === status
            );

            Logger.info(MODULE_NAME, `Ditemukan ${results.length} hasil`);
            return results;
        } catch (error) {
            throw this._handleError(error, 'filterByStatus');
        }
    }

    /**
     * Invalidate cache (paksa reload di pencarian berikutnya).
     * Dipanggil setelah ada perubahan data (create/update/delete family).
     */
    invalidateCache() {
        Logger.info(MODULE_NAME, 'Cache di-invalidate');
        this._cachedIndex = [];
        this._lastLoadTime = null;
    }

    /**
     * Helper: bungkus error jadi AppError
     */
    _handleError(error, methodName) {
        if (error instanceof AppError) {
            return error;
        }
        return new AppError(
            `Gagal ${methodName}: ${error.message}`,
            MODULE_NAME,
            error.code || 'SEARCH_SERVICE_ERROR',
            error
        );
    }
}