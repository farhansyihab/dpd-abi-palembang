/**
 * SearchController - Orchestrator untuk halaman pencarian & filter.
 * 
 * UPDATE HARI 3: Ditambahkan tab filter person (pekerjaan, status ABI, kaderisasi)
 */
import { BaseController } from './BaseController.js';
import { SearchService } from '../services/SearchService.js';
import { debounce } from '../utils/Debounce.js';
import { Logger } from '../core/Logger.js';
import { SearchResultRenderer } from './search/SearchResultRenderer.js';
import { PersonSearchResultRenderer } from './search/PersonSearchResultRenderer.js';

const MODULE_NAME = 'SearchController';

class SearchController extends BaseController {
    constructor() {
        super('searchView');
        this.searchService = new SearchService();
        this.familyRenderer = new SearchResultRenderer('searchResultsContainer');
        this.personRenderer = new PersonSearchResultRenderer('personFilterResultsContainer');

        this.debouncedSearch = debounce(this.handleFamilySearch.bind(this), 300);
    }

    async init() {
        super.init();
        Logger.info(MODULE_NAME, 'Inisialisasi halaman pencarian & filter');

        const isAuthorized = await this.requireAuth();
        if (!isAuthorized) return;

        this.setupEventListeners();

        try {
            this.showLoading(true);
            document.getElementById('loadingText').textContent = 'Memuat indeks pencarian ke memory...';
            await this.searchService.loadIndex();
            Logger.info(MODULE_NAME, 'Indeks berhasil dimuat');

            // Populate dropdown filter
            this.populateFilterDropdowns();
        } catch (error) {
            this.showError(error, 'Gagal memuat indeks pencarian');
        } finally {
            this.showLoading(false);
        }
    }

    setupEventListeners() {
        // ========================================
        // Tab 1: Cari Keluarga (Hari 1-2)
        // ========================================
        const searchInput = document.getElementById('searchInput');
        const clearBtn = document.getElementById('clearSearchBtn');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.trim();

                if (clearBtn) {
                    clearBtn.classList.toggle('d-none', term === '');
                }

                if (term === '') {
                    this.familyRenderer.showInitialState();
                } else {
                    this.debouncedSearch(term);
                }
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                clearBtn.classList.add('d-none');
                this.familyRenderer.showInitialState();
                searchInput.focus();
            });
        }

        // ========================================
        // Tab 2: Filter Person (Hari 3 + Hari 4)
        // ========================================
        const btnTerapkanFilter = document.getElementById('btnTerapkanFilter');
        const btnResetFilter = document.getElementById('btnResetFilter');
        const bracketSelect = document.getElementById('filterPenghasilanBracket');
        const customContainer = document.getElementById('customPenghasilanContainer');

        if (btnTerapkanFilter) {
            btnTerapkanFilter.addEventListener('click', () => this.handleApplyFilter());
        }

        if (btnResetFilter) {
            btnResetFilter.addEventListener('click', () => this.handleResetFilter());
        }

        // 🆕 HARI 4: Toggle mode custom penghasilan
        if (bracketSelect && customContainer) {
            bracketSelect.addEventListener('change', () => {
                if (bracketSelect.value === 'custom') {
                    customContainer.classList.remove('d-none');
                } else {
                    customContainer.classList.add('d-none');
                    // Clear input custom saat beralih ke bracket
                    document.getElementById('filterPenghasilanMin').value = '';
                    document.getElementById('filterPenghasilanMax').value = '';
                }
            });
        }
    }

    populateFilterDropdowns() {
        try {
            // Populate Status ABI
            const statusABISelect = document.getElementById('filterStatusABI');
            if (statusABISelect) {
                const statusList = this.searchService.getUniqueStatusABI();
                statusList.forEach(status => {
                    const option = document.createElement('option');
                    option.value = status;
                    option.textContent = status.charAt(0).toUpperCase() + status.slice(1);
                    statusABISelect.appendChild(option);
                });
            }

            // Populate Kaderisasi
            const kaderisasiSelect = document.getElementById('filterKaderisasi');
            if (kaderisasiSelect) {
                const kaderList = this.searchService.getUniqueKaderisasi();
                kaderList.forEach(kader => {
                    const option = document.createElement('option');
                    option.value = kader;
                    option.textContent = kader;
                    kaderisasiSelect.appendChild(option);
                });
            }

            // 🆕 HARI 4: Populate Penghasilan Bracket
            const bracketSelect = document.getElementById('filterPenghasilanBracket');
            if (bracketSelect) {
                const bracketList = this.searchService.getUniquePenghasilanBracket();
                // Sisipkan sebelum opsi "Custom"
                const customOption = bracketSelect.querySelector('option[value="custom"]');
                bracketList.forEach(bracket => {
                    const option = document.createElement('option');
                    option.value = bracket;
                    option.textContent = bracket;
                    bracketSelect.insertBefore(option, customOption);
                });
            }

            Logger.info(MODULE_NAME, 'Dropdown filter berhasil di-populate');
        } catch (error) {
            Logger.warn(MODULE_NAME, 'Gagal populate dropdown filter', error);
        }
    }

    handleFamilySearch(term) {
        try {
            Logger.info(MODULE_NAME, `Mencari families dengan kata kunci: "${term}"`);
            const results = this.searchService.search(term);
            this.familyRenderer.render(results);
        } catch (error) {
            this.showError(error, 'Terjadi kesalahan saat mencari data');
        }
    }

    // ========================================
    // Handler Filter Person (Hari 3 + Hari 4)
    // ========================================

    handleApplyFilter() {
        try {
            // Helper: parse string Rupiah ke integer
            const parseRupiah = (str) => {
                if (!str) return null;
                const val = str.replace(/\./g, '');
                return val ? parseInt(val, 10) : null;
            };

            const bracketValue = document.getElementById('filterPenghasilanBracket')?.value || '';

            const criteria = {
                pekerjaan: document.getElementById('filterPekerjaan')?.value || '',
                status_abi: document.getElementById('filterStatusABI')?.value || '',
                kaderisasi: document.getElementById('filterKaderisasi')?.value || '',
                // 🆕 HARI 4
                usia_min: document.getElementById('filterUsiaMin')?.value || '',
                usia_max: document.getElementById('filterUsiaMax')?.value || '',
                penghasilan_bracket: bracketValue,
                penghasilan_min: bracketValue === 'custom'
                    ? parseRupiah(document.getElementById('filterPenghasilanMin')?.value)
                    : null,
                penghasilan_max: bracketValue === 'custom'
                    ? parseRupiah(document.getElementById('filterPenghasilanMax')?.value)
                    : null
            };

            // Validasi sederhana: min harus <= max
            if (criteria.usia_min && criteria.usia_max) {
                if (parseInt(criteria.usia_min, 10) > parseInt(criteria.usia_max, 10)) {
                    this.showAlert('Usia minimum tidak boleh lebih besar dari usia maximum', 'warning');
                    return;
                }
            }
            if (criteria.penghasilan_min !== null && criteria.penghasilan_max !== null) {
                if (criteria.penghasilan_min > criteria.penghasilan_max) {
                    this.showAlert('Penghasilan minimum tidak boleh lebih besar dari penghasilan maximum', 'warning');
                    return;
                }
            }

            Logger.info(MODULE_NAME, 'Menerapkan filter person', criteria);
            const results = this.searchService.filterPersons(criteria);
            this.personRenderer.render(results);
        } catch (error) {
            this.showError(error, 'Terjadi kesalahan saat memfilter data');
        }
    }

    handleResetFilter() {
        try {
            document.getElementById('filterPekerjaan').value = '';
            document.getElementById('filterStatusABI').value = '';
            document.getElementById('filterKaderisasi').value = '';
            // 🆕 HARI 4
            document.getElementById('filterUsiaMin').value = '';
            document.getElementById('filterUsiaMax').value = '';
            document.getElementById('filterPenghasilanBracket').value = '';
            document.getElementById('filterPenghasilanMin').value = '';
            document.getElementById('filterPenghasilanMax').value = '';
            document.getElementById('customPenghasilanContainer').classList.add('d-none');

            this.personRenderer.showInitialState();
            Logger.info(MODULE_NAME, 'Filter di-reset');
        } catch (error) {
            Logger.warn(MODULE_NAME, 'Gagal reset filter', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const controller = new SearchController();
    await controller.init();
    window.searchController = controller;
    console.log('✅ SearchController dimuat');
});