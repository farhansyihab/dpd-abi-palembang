/**
 * SearchController - Orchestrator untuk halaman pencarian data keluarga.
 * 
 * TUGAS UTAMA:
 * - Auth Guard saat halaman dimuat.
 * - Memuat indeks pencarian ke memory browser (via SearchService).
 * - Mengikat event listener pada input pencarian dengan Debounce (300ms).
 * - Mendelegasikan rendering hasil ke SearchResultRenderer.
 * 
 * DELEGASI:
 * - Rendering DOM -> SearchResultRenderer
 * - Logika pencarian & caching -> SearchService
 */
import { BaseController } from './BaseController.js';
import { SearchService } from '../services/SearchService.js';
import { debounce } from '../utils/Debounce.js';
import { Logger } from '../core/Logger.js';
import { SearchResultRenderer } from './search/SearchResultRenderer.js';

const MODULE_NAME = 'SearchController';

class SearchController extends BaseController {
    constructor() {
        super('searchView');
        this.searchService = new SearchService();
        this.renderer = new SearchResultRenderer('searchResultsContainer');

        // Bind debounced function agar 'this' context tetap terjaga
        this.debouncedSearch = debounce(this.handleSearch.bind(this), 300);
    }

    async init() {
        super.init();
        Logger.info(MODULE_NAME, 'Inisialisasi halaman pencarian');

        // 1. AUTH GUARD
        const isAuthorized = await this.requireAuth();
        if (!isAuthorized) return;

        // 2. Setup UI & Event Listeners
        this.setupEventListeners();

        // 3. Load Index ke Memory Browser (Caching)
        try {
            this.showLoading(true);
            document.getElementById('loadingText').textContent = 'Memuat indeks pencarian ke memory...';
            await this.searchService.loadIndex();
            Logger.info(MODULE_NAME, 'Indeks pencarian berhasil dimuat');
        } catch (error) {
            this.showError(error, 'Gagal memuat indeks pencarian');
        } finally {
            this.showLoading(false);
        }
    }

    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        const clearBtn = document.getElementById('clearSearchBtn');

        if (searchInput) {
            // Gunakan debounce untuk menunda eksekusi sampai user berhenti mengetik 300ms
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.trim();

                // Toggle tombol clear
                if (clearBtn) {
                    clearBtn.classList.toggle('d-none', term === '');
                }

                if (term === '') {
                    this.renderer.showInitialState();
                } else {
                    this.debouncedSearch(term);
                }
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                clearBtn.classList.add('d-none');
                this.renderer.showInitialState();
                searchInput.focus();
            });
        }
    }

    /**
     * Handler pencarian yang dipanggil setelah debounce.
     * @param {string} term - Kata kunci pencarian
     */
    handleSearch(term) {
        try {
            Logger.info(MODULE_NAME, `Mencari dengan kata kunci: "${term}"`);
            // 🆕 HARI 2: Gunakan method search terpadu (Nama ATAU Alamat)
            const results = this.searchService.search(term);
            this.renderer.render(results);
        } catch (error) {
            this.showError(error, 'Terjadi kesalahan saat mencari data');
        }
    }
}

// Inisialisasi saat DOM siap
document.addEventListener('DOMContentLoaded', async () => {
    const controller = new SearchController();
    await controller.init();
    window.searchController = controller; // Untuk debugging di console
    console.log('✅ SearchController dimuat');
});