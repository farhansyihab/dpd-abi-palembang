/**
 * SearchResultRenderer - Menangani rendering hasil pencarian ke DOM.
 * 
 * UPDATE HARI 2: Tampilkan nama Kepala Keluarga sebagai info utama,
 * dengan No. KK dan alamat sebagai info pendukung.
 */
import { Logger } from '../../core/Logger.js';

const MODULE_NAME = 'SearchResultRenderer';

export class SearchResultRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            Logger.warn(MODULE_NAME, `Container dengan ID ${containerId} tidak ditemukan di DOM.`);
        }
    }

    render(results) {
        if (!this.container) return;

        this.container.innerHTML = '';

        if (!results || results.length === 0) {
            this.container.innerHTML = `
                <div class="alert alert-warning text-center" role="alert">
                    <i class="bi bi-exclamation-circle me-2"></i>
                    Tidak ada data keluarga yang cocok dengan kata kunci tersebut.
                </div>
            `;
            return;
        }

        const listGroup = document.createElement('div');
        listGroup.className = 'list-group shadow-sm';

        results.forEach(family => {
            const item = document.createElement('div');
            item.className = 'list-group-item list-group-item-action result-item';

            let statusBadge = '<span class="badge bg-secondary">Belum Ditentukan</span>';
            if (family.status_bantuan === 'mustahiq') {
                statusBadge = '<span class="badge bg-danger">Mustahiq</span>';
            } else if (family.status_bantuan === 'donatur') {
                statusBadge = '<span class="badge bg-success">Donatur</span>';
            }

            // 🆕 TAMPILAN BARU: Nama KK sebagai info utama
            item.innerHTML = `
                <div class="d-flex w-100 justify-content-between align-items-center">
                    <div class="flex-grow-1">
                        <h6 class="mb-1 fw-bold text-primary">
                            <i class="bi bi-person-fill me-1"></i> ${family.nama_kepala_keluarga}
                        </h6>
                        <small class="text-muted d-block mb-1">
                            <i class="bi bi-card-text me-1"></i> No. KK: ${family.no_kk || '-'}
                        </small>
                        <small class="text-muted d-block">
                            <i class="bi bi-geo-alt me-1"></i> ${family.alamat_singkat || '-'}
                        </small>
                    </div>
                    <div class="text-end ms-3">
                        ${statusBadge}
                        <i class="bi bi-chevron-right text-muted ms-2"></i>
                    </div>
                </div>
            `;

            item.addEventListener('click', () => {
                Logger.info(MODULE_NAME, `User mengklik hasil pencarian, redirect ke family ID: ${family.id}`);
                // 🆕 DETEKSI OTOMATIS: Cek apakah sedang di folder mobile
                const isMobile = window.location.pathname.startsWith('/mobile/');

                if (isMobile) {
                    // Di mobile → buka family-detail.html (read-only viewer)
                    window.location.href = `/mobile/family-detail.html?id=${family.id}`;
                } else {
                    // Di desktop → buka family-form.html (form edit)
                    window.location.href = `/family-form.html?id=${family.id}`;
                }
            });

            listGroup.appendChild(item);
        });

        this.container.appendChild(listGroup);
    }

    showInitialState() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-inbox fs-1"></i>
                <p class="mt-2">Mulai ketik untuk mencari data keluarga.</p>
            </div>
        `;
    }
}