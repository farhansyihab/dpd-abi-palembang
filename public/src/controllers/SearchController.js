// public/src/controllers/SearchController.js
/**
 * SearchController - Orchestrator untuk halaman pencarian & filter.
 *
 * TUGAS UTAMA:
 * - Auth Guard (requireAuth)
 * - Load indeks pencarian ke memory (SearchService.loadIndex)
 * - Komposisi 2 handler: FamilySearchHandler (Tab 1) dan PersonFilterHandler (Tab 2)
 *
 * DELEGASI:
 * - Tab 1 (Pencarian Keluarga) → FamilySearchHandler
 * - Tab 2 (Filter Person) → PersonFilterHandler
 *
 * PENTING: Class ini TIDAK mengandung logic pencarian atau filter sama sekali.
 * Semua didelegasikan ke handler masing-masing (Composition Pattern).
 *
 * Analogi: Seperti FamilyFormController dan PersonRelationManager setelah refactor —
 * orchestrator tipis yang memegang referensi ke helper, bukan tempat semua logika ditulis.
 */
import { BaseController } from './BaseController.js';
import { SearchService } from '../services/SearchService.js';
import { Logger } from '../core/Logger.js';
import { SearchResultRenderer } from './search/SearchResultRenderer.js';
import { PersonSearchResultRenderer } from './search/PersonSearchResultRenderer.js';
import { FamilySearchHandler } from './search/FamilySearchHandler.js';
import { PersonFilterHandler } from './search/PersonFilterHandler.js';

const MODULE_NAME = 'SearchController';

class SearchController extends BaseController {
    constructor() {
        super('searchView');

        // Service & renderers
        this.searchService = new SearchService();
        this.familyRenderer = new SearchResultRenderer('searchResultsContainer');
        this.personRenderer = new PersonSearchResultRenderer('personFilterResultsContainer');

        // Composition Pattern: Delegasi tanggung jawab ke handler
        this.familySearchHandler = new FamilySearchHandler(this);
        this.personFilterHandler = new PersonFilterHandler(this);
    }

    /**
     * Inisialisasi controller.
     * 
     * ALUR:
     * 1. Auth Guard
     * 2. Load indeks pencarian ke memory (dengan loading overlay)
     * 3. Populate dropdown filter (delegasi ke PersonFilterHandler)
     * 
     * PERBAIKAN BUG (dari kode lama):
     * - Loading overlay sekarang di-hide di blok finally, bukan hanya saat sukses
     * - loadingText element dicek null-nya sebelum diakses
     */
    async init() {
        super.init();
        Logger.info(MODULE_NAME, 'Inisialisasi halaman pencarian & filter');

        // 🔐 1. AUTH GUARD
        const isAuthorized = await this.requireAuth();
        if (!isAuthorized) return;

        // 2. Load indeks pencarian
        try {
            this.showLoading(true);

            // ✅ PERBAIKAN BUG B: null check untuk loadingText
            const loadingText = document.getElementById('loadingText');
            if (loadingText) {
                loadingText.textContent = 'Memuat indeks pencarian ke memory...';
            }

            await this.searchService.loadIndex();
            Logger.info(MODULE_NAME, 'Indeks berhasil dimuat');

            // Populate dropdown filter (delegasi ke PersonFilterHandler)
            this.personFilterHandler.populateFilterDropdowns();
        } catch (error) {
            this.showError(error, 'Gagal memuat indeks pencarian');
        } finally {
            // ✅ PERBAIKAN BUG A: loading overlay selalu di-hide, bahkan saat error
            this.showLoading(false);
        }
    }
}

// Inisialisasi controller saat DOM siap
document.addEventListener('DOMContentLoaded', async () => {
    const controller = new SearchController();
    await controller.init();
    window.searchController = controller;
    console.log('✅ SearchController dimuat');
});