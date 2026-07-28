/**
 * SearchService - Pencarian & filtering data keluarga DAN person.
 * 
 * UPDATE HARI 3: Ditambahkan cache persons untuk filter pekerjaan, status ABI, kaderisasi
 */
import { FamilyRepository } from '../repositories/FamilyRepository.js';
import { PersonRepository } from '../repositories/PersonRepository.js';
import { AppError } from '../core/AppError.js';
import { Logger } from '../core/Logger.js';

const MODULE_NAME = 'SearchService';

export class SearchService {
    constructor() {
        this.familyRepo = new FamilyRepository();
        this.personRepo = new PersonRepository();

        // Cache families (untuk pencarian nama/alamat)
        this._cachedFamilies = [];

        // 🆕 Cache persons (untuk filter pekerjaan, status ABI, kaderisasi)
        this._cachedPersons = [];

        // Lookup map: family_id → family data (untuk enrich person dengan info keluarga)
        this._familyLookupMap = new Map();

        this._lastLoadTime = null;
        this._cacheTTL = 5 * 60 * 1000;
    }

    async loadIndex(forceReload = false) {
        try {
            Logger.info(MODULE_NAME, 'Memuat indeks families & persons ke memory');

            const now = Date.now();
            if (!forceReload && this._cachedFamilies.length > 0 && this._lastLoadTime) {
                const age = now - this._lastLoadTime;
                if (age < this._cacheTTL) {
                    Logger.info(MODULE_NAME, `Cache masih valid (umur: ${Math.round(age / 1000)}s)`);
                    return;
                }
            }

            // 1. Load families
            Logger.info(MODULE_NAME, 'Loading families...');
            const families = await this.familyRepo.list(10000);

            // 2. Load persons
            Logger.info(MODULE_NAME, 'Loading persons...');
            const allPersons = await this.personRepo.list(10000);

            // 3. 🆕 Build lookup map untuk Kepala Keluarga (dari persons)
            const kepalaKeluargaMap = new Map();
            allPersons
                .filter(p => p.hubungan_dlm_keluarga === 'kepala_keluarga')
                .forEach(p => kepalaKeluargaMap.set(p.id, p.nama));

            // 4. Build lookup map untuk families (alamat, no_kk)
            this._familyLookupMap.clear();
            families.forEach(f => {
                this._familyLookupMap.set(f.id, {
                    id: f.id,
                    no_kk: f.no_kk,
                    alamat_singkat: this._formatAlamatSingkat(f.alamat)
                });
            });

            // 5. Cache families (untuk pencarian nama/alamat)
            this._cachedFamilies = families.map(f => ({
                id: f.id,
                no_kk: f.no_kk,
                nama_kepala_keluarga: kepalaKeluargaMap.get(f.kepala_keluarga_person_id) || 'Belum ada data', // ✅ Sekarang aman
                search_name_lower: f.search_name_lower || '',
                search_address_lower: f.search_address_lower || '',
                status_bantuan: f.status_bantuan,
                kepala_keluarga_person_id: f.kepala_keluarga_person_id,
                alamat_singkat: this._formatAlamatSingkat(f.alamat)
            }));

            // 6. Cache persons (untuk filter)
            this._cachedPersons = allPersons
                .filter(p => p.is_active !== false)
                .map(p => ({
                    id: p.id,
                    family_id: p.family_id,
                    nik: p.nik,
                    nama: p.nama,
                    pekerjaan: p.pekerjaan || '',
                    status_abi: p.status_abi || '',
                    kaderisasi: p.kaderisasi || [],
                    penghasilan_bulan: p.penghasilan_bulan || 0,
                    penghasilan_bracket: p.penghasilan_bracket || '<1jt', // 🆕 Pastikan ada
                    usia: p.usia || null
                }));

            this._lastLoadTime = now;
            Logger.info(MODULE_NAME, `Indeks berhasil dimuat: ${this._cachedFamilies.length} families, ${this._cachedPersons.length} persons`);
        } catch (error) {
            throw this._handleError(error, 'loadIndex');
        }
    }

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

    // ========================================
    // PENCARIAN FAMILIES (Hari 1-2)
    // ========================================

    search(term) {
        try {
            if (!term || term.trim() === '') return [];
            const termLower = term.toLowerCase().trim();
            Logger.info(MODULE_NAME, `Mencari families (Nama/Alamat): "${term}"`);

            const results = this._cachedFamilies.filter(family =>
                family.search_name_lower.includes(termLower) ||
                family.search_address_lower.includes(termLower)
            );

            Logger.info(MODULE_NAME, `Ditemukan ${results.length} families`);
            return results;
        } catch (error) {
            throw this._handleError(error, 'search');
        }
    }

    searchByName(term) { return this.search(term); }
    searchByAddress(term) { return this.search(term); }

    // ========================================
    // 🆕 FILTER PERSONS (Hari 3 + Hari 4)
    // ========================================

    /**
     * Filter persons berdasarkan kriteria (kombinasi AND)
     * @param {Object} criteria - { 
     *   pekerjaan?, status_abi?, kaderisasi?,
     *   usia_min?, usia_max?,
     *   penghasilan_bracket?, penghasilan_min?, penghasilan_max?
     * }
     * @returns {Array<Object>} Array persons yang cocok (dengan info keluarga)
     */
    filterPersons(criteria = {}) {
        try {
            Logger.info(MODULE_NAME, 'Filter persons', criteria);

            let results = [...this._cachedPersons];

            // 1. Filter pekerjaan (case-insensitive partial match)
            if (criteria.pekerjaan && criteria.pekerjaan.trim() !== '') {
                const pekerjaanLower = criteria.pekerjaan.toLowerCase().trim();
                results = results.filter(p =>
                    p.pekerjaan.toLowerCase().includes(pekerjaanLower)
                );
            }

            // 2. Filter status ABI (exact match)
            if (criteria.status_abi && criteria.status_abi.trim() !== '') {
                results = results.filter(p => p.status_abi === criteria.status_abi);
            }

            // 3. Filter kaderisasi (array contains)
            if (criteria.kaderisasi && criteria.kaderisasi.trim() !== '') {
                results = results.filter(p =>
                    p.kaderisasi.includes(criteria.kaderisasi)
                );
            }

            // 4. 🆕 Filter Usia (range)
            if (criteria.usia_min !== undefined && criteria.usia_min !== null && criteria.usia_min !== '') {
                const min = parseInt(criteria.usia_min, 10);
                if (!isNaN(min)) {
                    results = results.filter(p => p.usia !== null && p.usia >= min);
                }
            }
            if (criteria.usia_max !== undefined && criteria.usia_max !== null && criteria.usia_max !== '') {
                const max = parseInt(criteria.usia_max, 10);
                if (!isNaN(max)) {
                    results = results.filter(p => p.usia !== null && p.usia <= max);
                }
            }

            // 5. 🆕 Filter Penghasilan (bracket ATAU range)
            // Prioritas: jika penghasilan_min/max diisi, gunakan range. Jika tidak, gunakan bracket.
            const hasCustomRange =
                (criteria.penghasilan_min !== undefined && criteria.penghasilan_min !== null && criteria.penghasilan_min !== '') ||
                (criteria.penghasilan_max !== undefined && criteria.penghasilan_max !== null && criteria.penghasilan_max !== '');

            if (hasCustomRange) {
                // Mode Custom: range query di penghasilan_bulan
                if (criteria.penghasilan_min !== undefined && criteria.penghasilan_min !== null && criteria.penghasilan_min !== '') {
                    const min = parseInt(criteria.penghasilan_min, 10);
                    if (!isNaN(min)) {
                        results = results.filter(p => p.penghasilan_bulan >= min);
                    }
                }
                if (criteria.penghasilan_max !== undefined && criteria.penghasilan_max !== null && criteria.penghasilan_max !== '') {
                    const max = parseInt(criteria.penghasilan_max, 10);
                    if (!isNaN(max)) {
                        results = results.filter(p => p.penghasilan_bulan <= max);
                    }
                }
            } else if (criteria.penghasilan_bracket && criteria.penghasilan_bracket.trim() !== '' && criteria.penghasilan_bracket !== 'custom') {
                // Mode Bracket: exact match di penghasilan_bracket
                results = results.filter(p => p.penghasilan_bracket === criteria.penghasilan_bracket);
            }

            // Enrich dengan info keluarga
            const enrichedResults = results.map(p => {
                const family = this._familyLookupMap.get(p.family_id);
                return {
                    ...p,
                    family_no_kk: family?.no_kk || '-',
                    family_alamat: family?.alamat_singkat || '-'
                };
            });

            Logger.info(MODULE_NAME, `Ditemukan ${enrichedResults.length} persons setelah filter`);
            return enrichedResults;
        } catch (error) {
            throw this._handleError(error, 'filterPersons');
        }
    }

    /**
     * Ambil daftar unik pekerjaan dari cache (untuk dropdown filter)
     * @returns {Array<string>}
     */
    getUniquePekerjaan() {
        const pekerjaanSet = new Set();
        this._cachedPersons.forEach(p => {
            if (p.pekerjaan && p.pekerjaan.trim() !== '') {
                pekerjaanSet.add(p.pekerjaan);
            }
        });
        return Array.from(pekerjaanSet).sort();
    }

    /**
     * Ambil daftar unik status ABI (untuk dropdown filter)
     * @returns {Array<string>}
     */
    getUniqueStatusABI() {
        const statusSet = new Set();
        this._cachedPersons.forEach(p => {
            if (p.status_abi && p.status_abi.trim() !== '') {
                statusSet.add(p.status_abi);
            }
        });
        return Array.from(statusSet).sort();
    }

    /**
     * Ambil daftar unik kaderisasi (untuk dropdown filter)
     * @returns {Array<string>}
     */
    getUniqueKaderisasi() {
        const kaderSet = new Set();
        this._cachedPersons.forEach(p => {
            p.kaderisasi.forEach(k => {
                if (k && k.trim() !== '') {
                    kaderSet.add(k);
                }
            });
        });
        return Array.from(kaderSet).sort();
    }

    /**
     * 🆕 Ambil daftar unik penghasilan_bracket dari cache (untuk dropdown filter)
     * @returns {Array<string>}
     */
    getUniquePenghasilanBracket() {
        const bracketSet = new Set();
        this._cachedPersons.forEach(p => {
            if (p.penghasilan_bracket && p.penghasilan_bracket.trim() !== '') {
                bracketSet.add(p.penghasilan_bracket);
            }
        });
        // Urutkan sesuai urutan logis (bukan alfabet)
        const order = ['<1jt', '1-2jt', '2-3jt', '>3jt'];
        return order.filter(b => bracketSet.has(b));
    }


    // ========================================
    // METHOD LAIN (tetap sama)
    // ========================================

    searchByNoKK(noKK) {
        try {
            if (!noKK || noKK.trim() === '') return null;
            Logger.info(MODULE_NAME, `Mencari No. KK: "${noKK}"`);
            const result = this._cachedFamilies.find(family => family.no_kk === noKK);
            return result || null;
        } catch (error) {
            throw this._handleError(error, 'searchByNoKK');
        }
    }

    filterByStatus(status) {
        try {
            Logger.info(MODULE_NAME, `Filter status keluarga: "${status}"`);
            const results = this._cachedFamilies.filter(family =>
                family.status_bantuan === status
            );
            Logger.info(MODULE_NAME, `Ditemukan ${results.length} hasil`);
            return results;
        } catch (error) {
            throw this._handleError(error, 'filterByStatus');
        }
    }

    invalidateCache() {
        Logger.info(MODULE_NAME, 'Cache di-invalidate');
        this._cachedFamilies = [];
        this._cachedPersons = [];
        this._familyLookupMap.clear();
        this._lastLoadTime = null;
    }

    _handleError(error, methodName) {
        if (error instanceof AppError) return error;
        return new AppError(`Gagal ${methodName}: ${error.message}`, MODULE_NAME, error.code || 'SEARCH_SERVICE_ERROR', error);
    }
}