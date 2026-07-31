// public/src/controllers/search/FamilySearchHandler.js
/**
 * FamilySearchHandler - Menangani Tab 1: Pencarian Keluarga.
 *
 * TANGGUNG JAWAB:
 * - Setup event listener untuk searchInput (dengan debounce 300ms)
 * - Setup event listener untuk clearBtn (reset search)
 * - Delegasi pencarian ke SearchService.search()
 * - Delegasi rendering ke SearchResultRenderer
 *
 * DIPISAH dari SearchController karena:
 * - Tab 1 (Family Search) dan Tab 2 (Person Filter) independen satu sama lain
 * - Konsisten dengan pola Composition Pattern yang sudah dipakai di family-form/ dan person-form/
 * - SearchController bisa tetap ramping sebagai orchestrator
 *
 * DELEGASI KE: SearchService.search(), SearchResultRenderer.render()
 */
import { Logger } from '../../core/Logger.js';
import { debounce } from '../../utils/Debounce.js';

const MODULE_NAME = 'FamilySearchHandler';

export class FamilySearchHandler {
    /**
     * @param {SearchController} controller - Reference ke orchestrator
     */
    constructor(controller) {
        this.controller = controller;
        this.searchService = controller.searchService;
        this.renderer = controller.familyRenderer;

        // Debounce 300ms untuk pencarian (sesuai strategi bagian 4 dokumen rancangan)
        this.debouncedSearch = debounce(this.handleSearch.bind(this), 300);

        this.setupListeners();
    }

    /**
     * Setup event listener untuk input pencarian dan tombol clear.
     */
    setupListeners() {
        const searchInput = document.getElementById('searchInput');
        const clearBtn = document.getElementById('clearSearchBtn');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.trim();

                // Toggle visibility clearBtn
                if (clearBtn) {
                    clearBtn.classList.toggle('d-none', term === '');
                }

                // Jika input kosong, tampilkan initial state
                if (term === '') {
                    this.renderer.showInitialState();
                } else {
                    // Debounced search
                    this.debouncedSearch(term);
                }
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                }
                clearBtn.classList.add('d-none');
                this.renderer.showInitialState();
                searchInput?.focus();
            });
        }
    }

    /**
     * Handle pencarian keluarga berdasarkan kata kunci.
     * Dipanggil via debounce dari event listener searchInput.
     *
     * @param {string} term - Kata kunci pencarian (nama/alamat)
     */
    handleSearch(term) {
        try {
            Logger.info(MODULE_NAME, `Mencari families dengan kata kunci: "${term}"`);
            const results = this.searchService.search(term);
            this.renderer.render(results);
        } catch (error) {
            this.controller.showError(error, 'Terjadi kesalahan saat mencari data');
        }
    }
}