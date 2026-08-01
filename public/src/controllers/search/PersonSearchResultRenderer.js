/**
 * PersonSearchResultRenderer - Menangani rendering hasil filter person ke DOM.
 */
import { Logger } from '../../core/Logger.js';

const MODULE_NAME = 'PersonSearchResultRenderer';

export class PersonSearchResultRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            Logger.warn(MODULE_NAME, `Container dengan ID ${containerId} tidak ditemukan di DOM.`);
        }
    }

    render(persons) {
        if (!this.container) return;

        this.container.innerHTML = '';

        if (!persons || persons.length === 0) {
            this.container.innerHTML = `
                <div class="alert alert-warning text-center" role="alert">
                    <i class="bi bi-exclamation-circle me-2"></i>
                    Tidak ada person yang cocok dengan filter tersebut.
                </div>
            `;
            return;
        }

        const listGroup = document.createElement('div');
        listGroup.className = 'list-group shadow-sm';

        persons.forEach(person => {
            const item = document.createElement('div');
            item.className = 'list-group-item list-group-item-action result-item';

            // Badge status ABI
            let statusBadge = '<span class="badge bg-secondary">-</span>';
            if (person.status_abi === 'kader') {
                statusBadge = '<span class="badge bg-primary">Kader</span>';
            } else if (person.status_abi === 'anggota') {
                statusBadge = '<span class="badge bg-success">Anggota</span>';
            } else if (person.status_abi === 'simpatisan') {
                statusBadge = '<span class="badge bg-info">Simpatisan</span>';
            }

            // Badge kaderisasi
            let kaderisasiBadges = '';
            if (person.kaderisasi && person.kaderisasi.length > 0) {
                kaderisasiBadges = person.kaderisasi.map(k =>
                    `<span class="badge bg-warning text-dark me-1">${k}</span>`
                ).join('');
            }
            // Badge penghasilan
            let penghasilanBadge = '<span class="badge bg-light text-dark border">-</span>';
            if (person.penghasilan_bulan > 0) {
                const formatRupiah = (num) => new Intl.NumberFormat('id-ID', {
                    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
                }).format(num);
                penghasilanBadge = `<span class="badge bg-light text-dark border">${formatRupiah(person.penghasilan_bulan)}</span>`;
            }

            item.innerHTML = `
                <div class="d-flex w-100 justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="mb-1 fw-bold text-primary">
                            <i class="bi bi-person-fill me-1"></i> ${person.nama}
                        </h6>
                        <small class="text-muted d-block mb-1">
                            <i class="bi bi-card-text me-1"></i> NIK: ${person.nik}
                        </small>
                        <small class="text-muted d-block mb-1">
                            <i class="bi bi-briefcase me-1"></i> ${person.pekerjaan || '-'}
                            ${person.usia ? ` · ${person.usia} thn` : ''}
                            · ${penghasilanBadge}
                        </small>
                        <small class="text-muted d-block mb-2">
                            <i class="bi bi-people me-1"></i> KK: ${person.family_no_kk}
                            <span class="ms-2"><i class="bi bi-geo-alt me-1"></i>${person.family_alamat}</span>
                        </small>
                        <div>
                            ${statusBadge}
                            ${kaderisasiBadges}
                        </div>
                    </div>
                    <div class="text-end ms-3">
                        <i class="bi bi-chevron-right text-muted"></i>
                    </div>
                </div>
            `;

            item.addEventListener('click', () => {
                Logger.info(MODULE_NAME, `User mengklik person, redirect ke family ID: ${person.family_id}`);

                // 🆕 DETEKSI OTOMATIS: Cek apakah sedang di folder mobile
                const isMobile = window.location.pathname.startsWith('/mobile/');
                const basePath = isMobile ? '/mobile' : '';

                // Gunakan basePath yang dinamis
                window.location.href = `${basePath}/person-form.html?familyId=${person.family_id}`;
            });

            listGroup.appendChild(item);
        });

        this.container.appendChild(listGroup);
    }

    showInitialState() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-funnel fs-1"></i>
                <p class="mt-2">Gunakan filter di atas untuk mencari person berdasarkan pekerjaan, status ABI, atau kaderisasi.</p>
            </div>
        `;
    }
}