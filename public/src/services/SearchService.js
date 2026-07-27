/**
 * SearchService - Pencarian & filtering data keluarga.
 * 
 * STRATEGI (sesuai Rancangan bagian 4):
 * - Load daftar ringkas keluarga ke memory browser saat halaman pencarian dibuka
 * - Filter di client dengan .includes() + debounce
 * - Jauh lebih cepat & murah (read quota) dibanding query Firestore tiap ketik
 * 
 * UPDATE HARI 2: Enrichment data dengan nama Kepala Keluarga dari persons collection
 */
import { FamilyRepository } from '../repositories/FamilyRepository.js';
import { PersonRepository } from '../repositories/PersonRepository.js'; // 🆕 IMPORT BARU
import { AppError } from '../core/AppError.js';
import { Logger } from '../core/Logger.js';

const MODULE_NAME = 'SearchService';

export class SearchService {
    constructor() {
        this.familyRepo = new FamilyRepository();
        this.personRepo = new PersonRepository(); // 🆕 TAMBAHAN
        this._cachedIndex = [];
        this._lastLoadTime = null;
        this._cacheTTL = 5 * 60 * 1000;
    }

    async loadIndex(forceReload = false) {
        try {
            Logger.info(MODULE_NAME, 'Memuat indeks keluarga ke memory');

            const now = Date.now();
            if (!forceReload && this._cachedIndex.length > 0 && this._lastLoadTime) {
                const age = now - this._lastLoadTime;
                if (age < this._cacheTTL) {
                    Logger.info(MODULE_NAME, `Cache masih valid (umur: ${Math.round(age / 1000)}s)`);
                    return;
                }
            }

            // 1. Load families
            const families = await this.familyRepo.list(10000);

            // 2. 🆕 Load persons untuk enrichment nama Kepala Keluarga
            Logger.info(MODULE_NAME, 'Memuat data persons untuk enrichment nama KK...');
            const allPersons = await this.personRepo.list(10000);

            // 3. 🆕 Buat Map lookup: person_id → nama (hanya untuk kepala_keluarga)
            const kepalaKeluargaMap = new Map();
            allPersons
                .filter(p => p.hubungan_dlm_keluarga === 'kepala_keluarga')
                .forEach(p => kepalaKeluargaMap.set(p.id, p.nama));

            Logger.info(MODULE_NAME, `Ditemukan ${kepalaKeluargaMap.size} kepala keluarga dari ${allPersons.length} persons`);

            // 4. Enrich family data dengan nama KK dan alamat singkat
            this._cachedIndex = families.map(f => ({
                id: f.id,
                no_kk: f.no_kk,
                nama_kepala_keluarga: kepalaKeluargaMap.get(f.kepala_keluarga_person_id) || 'Belum ada data',
                search_name_lower: f.search_name_lower || '',
                search_address_lower: f.search_address_lower || '',
                status_bantuan: f.status_bantuan,
                alamat_singkat: this._formatAlamatSingkat(f.alamat)
            }));

            this._lastLoadTime = now;
            Logger.info(MODULE_NAME, `Indeks berhasil dimuat: ${this._cachedIndex.length} keluarga`);
        } catch (error) {
            throw this._handleError(error, 'loadIndex');
        }
    }

    /**
     * 🆕 Format alamat menjadi versi singkat untuk display
     * Contoh: "Jl. Merdeka No. 10, RT 001, RW 002, Ilir Barat"
     */
    _formatAlamatSingkat(alamat) {
        if (!alamat) return '-';
        const parts = [
            alamat.jalan,
            alamat.rt ? `RT ${alamat.rt}` : '',
            alamat.rw ? `RW ${alamat.rw}` : '',
            alamat.kelurahan || '',
            alamat.kecamatan || ''
        ].filter(p => p);
        return parts.join(', ');
    }

    /**
     * PENCARIAN TERPADU (Hari 2)
     * Mencari berdasarkan Nama ATAU Alamat secara bersamaan.
     */
    search(term) {
        try {
            if (!term || term.trim() === '') {
                return [];
            }
            const termLower = term.toLowerCase().trim();
            Logger.info(MODULE_NAME, `Mencari (Nama/Alamat): "${term}"`);

            const results = this._cachedIndex.filter(family =>
                family.search_name_lower.includes(termLower) ||
                family.search_address_lower.includes(termLower)
            );

            Logger.info(MODULE_NAME, `Ditemukan ${results.length} hasil`);
            return results;
        } catch (error) {
            throw this._handleError(error, 'search');
        }
    }

    searchByName(term) { return this.search(term); }
    searchByAddress(term) { return this.search(term); }

    searchByNoKK(noKK) {
        try {
            if (!noKK || noKK.trim() === '') return null;
            Logger.info(MODULE_NAME, `Mencari No. KK: "${noKK}"`);
            const result = this._cachedIndex.find(family => family.no_kk === noKK);
            return result || null;
        } catch (error) {
            throw this._handleError(error, 'searchByNoKK');
        }
    }

    filterByStatus(status) {
        try {
            Logger.info(MODULE_NAME, `Filter status: "${status}"`);
            const results = this._cachedIndex.filter(family => family.status_bantuan === status);
            return results;
        } catch (error) {
            throw this._handleError(error, 'filterByStatus');
        }
    }

    invalidateCache() {
        Logger.info(MODULE_NAME, 'Cache di-invalidate');
        this._cachedIndex = [];
        this._lastLoadTime = null;
    }

    _handleError(error, methodName) {
        if (error instanceof AppError) return error;
        return new AppError(`Gagal ${methodName}: ${error.message}`, MODULE_NAME, error.code || 'SEARCH_SERVICE_ERROR', error);
    }
}