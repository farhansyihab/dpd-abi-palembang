/**
* FamilyDetailController - Orchestrator untuk halaman detail keluarga (read-only) di mobile.
* 
* TUGAS UTAMA:
* - Auth Guard (requireAuth)
* - Load data keluarga + anggota dari database
* - Render data ke UI dalam format read-only
* - Handle tombol Edit (redirect ke family-form.html)
* 
* DELEGASI:
* - Load data → FamilyService.getFamilyDetail()
* - Load anggota → PersonService.getPersonsByFamily()
*/
import { BaseController } from './BaseController.js';
import { FamilyService } from '../services/FamilyService.js';
import { PersonService } from '../services/PersonService.js';
import { Logger } from '../core/Logger.js';

const MODULE_NAME = 'FamilyDetailController';

class FamilyDetailController extends BaseController {
    constructor() {
        super(null); // Tidak ada root element spesifik
        this.familyService = new FamilyService();
        this.personService = new PersonService();
        this.familyId = null;
    }

    async init() {
        super.init();
        Logger.info(MODULE_NAME, 'Inisialisasi halaman detail keluarga');

        // 🔐 1. AUTH GUARD
        const isAuthorized = await this.requireAuth();
        if (!isAuthorized) return;

        // 2. Ambil familyId dari URL
        const urlParams = new URLSearchParams(window.location.search);
        this.familyId = urlParams.get('id');

        if (!this.familyId) {
            this.showAlert('ID Keluarga tidak ditemukan.', 'danger', 0);
            setTimeout(() => window.location.href = '/mobile/search.html', 3000);
            return;
        }

        // 3. Setup event listeners
        this.setupEventListeners();

        // 4. Load data
        await this.loadFamilyData();
    }

    setupEventListeners() {
        // Tombol Edit → redirect ke family-form.html
        const btnEdit = document.getElementById('btnEdit');
        if (btnEdit) {
            btnEdit.addEventListener('click', () => {
                window.location.href = `/mobile/family-form.html?id=${this.familyId}`;
            });
        }
    }

    async loadFamilyData() {
        this.showLoading(true);

        try {
            Logger.info(MODULE_NAME, `Memuat data keluarga ${this.familyId}`);

            // 1. Load data keluarga + snapshot ekonomi terbaru
            const { family, latestAssessment } = await this.familyService.getFamilyDetail(this.familyId);

            // 2. Load kepala keluarga dari persons
            let kepalaKeluarga = null;
            if (family.kepala_keluarga_person_id) {
                const persons = await this.personService.getPersonsByFamily(this.familyId);
                kepalaKeluarga = persons.find(p => p.hubungan_dlm_keluarga === 'kepala_keluarga');
            }

            // 3. Render data keluarga
            this.renderFamilyData(family, kepalaKeluarga);

            // 4. Render data ekonomi (jika ada)
            if (latestAssessment) {
                this.renderEconomicData(latestAssessment);
            }

            // 5. Load & render daftar anggota
            await this.loadAndRenderPersons();

            Logger.info(MODULE_NAME, 'Data keluarga berhasil dimuat');
        } catch (error) {
            this.showError(error, 'Gagal memuat data keluarga');
            Logger.error(MODULE_NAME, 'Load data keluarga gagal', error);
        } finally {
            this.showLoading(false);
        }
    }

    renderFamilyData(family, kepalaKeluarga) {
        // A.1 Data Kepala Keluarga
        this.setTextContent('view_no_kk', family.no_kk);

        if (kepalaKeluarga) {
            this.setTextContent('view_nama_kk', kepalaKeluarga.nama);
            this.setTextContent('view_nik_kk', kepalaKeluarga.nik);
            this.setTextContent('view_tempat_lahir_kk', kepalaKeluarga.tempat_lahir);
            this.setTextContent('view_tanggal_lahir_kk', this.formatDate(kepalaKeluarga.tanggal_lahir));
            this.setTextContent('view_jenis_kelamin_kk', this.formatJenisKelamin(kepalaKeluarga.jenis_kelamin));
            this.setTextContent('view_pendidikan_kk', kepalaKeluarga.pendidikan_terakhir);
            this.setTextContent('view_pekerjaan_kk', kepalaKeluarga.pekerjaan);
            this.setTextContent('view_penghasilan_kk', this.formatRupiah(kepalaKeluarga.penghasilan_bulan));
            this.setTextContent('view_status_abi_kk', this.formatStatusABI(kepalaKeluarga.status_abi));
        }

        // A.2 Alamat Rumah
        this.setTextContent('view_alamat_jalan', family.alamat.jalan);
        this.setTextContent('view_alamat_rt', family.alamat.rt);
        this.setTextContent('view_alamat_rw', family.alamat.rw);
        this.setTextContent('view_alamat_kelurahan', family.alamat.kelurahan);
        this.setTextContent('view_alamat_kecamatan', family.alamat.kecamatan);
        this.setTextContent('view_alamat_kota', family.alamat.kota);

        // A.3 Data Rumah
        this.setTextContent('view_status_kepemilikan_rumah', this.formatStatusKepemilikan(family.status_kepemilikan_rumah));
        this.setTextContent('view_kondisi_rumah', this.formatKondisiRumah(family.kondisi_rumah));
        this.setTextContent('view_akses_air_bersih', this.formatAksesAir(family.akses_air_bersih));

        // Status Bantuan Badge
        this.renderStatusBantuan(family.status_bantuan);
    }

    renderEconomicData(assessment) {
        const container = document.getElementById('economicDataContainer');
        if (!container) return;

        const formatRupiah = (num) => new Intl.NumberFormat('id-ID', {
            style: 'currency', currency: 'IDR', minimumFractionDigits: 0
        }).format(num || 0);

        const totalPengeluaran = assessment.pengeluaran
            ? Object.values(assessment.pengeluaran).reduce((sum, val) => sum + (Number(val) || 0), 0)
            : 0;

        const selisih = (assessment.total_pendapatan || 0) - totalPengeluaran;

        // Render aset
        const asetList = assessment.aset
            ? Object.entries(assessment.aset).map(([key, value]) => {
                const label = key.charAt(0).toUpperCase() + key.slice(1);
                return `<span class="check-item ${value ? 'active' : 'inactive'}">
                    <i class="bi bi-${value ? 'check-circle-fill' : 'x-circle'}"></i>
                    ${label}
                </span>`;
            }).join('')
            : '';

        // Render bantuan pemerintah
        const bantuanList = assessment.penerima_bantuan_pemerintah && assessment.penerima_bantuan_pemerintah.length > 0
            ? assessment.penerima_bantuan_pemerintah.map(b =>
                `<span class="check-item active">
                    <i class="bi bi-check-circle-fill"></i>
                    ${b}
                </span>`
            ).join('')
            : '<span class="check-item inactive">Tidak ada</span>';

        container.innerHTML = `
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Periode Survei</div>
                    <div class="detail-value">${assessment.periode || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Sumber Pendapatan Utama</div>
                    <div class="detail-value">${assessment.sumber_pendapatan_utama || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Total Pendapatan</div>
                    <div class="detail-value">${formatRupiah(assessment.total_pendapatan)}</div>
                </div>
            </div>
            
            <div class="detail-section-title">Rincian Pengeluaran Bulanan</div>
            <div class="detail-grid-2col">
                <div class="detail-item">
                    <div class="detail-label">Makan & Minum</div>
                    <div class="detail-value">${formatRupiah(assessment.pengeluaran?.makan)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Listrik & Air</div>
                    <div class="detail-value">${formatRupiah(assessment.pengeluaran?.listrik_air)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Pendidikan</div>
                    <div class="detail-value">${formatRupiah(assessment.pengeluaran?.pendidikan)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Kesehatan</div>
                    <div class="detail-value">${formatRupiah(assessment.pengeluaran?.kesehatan)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Lainnya</div>
                    <div class="detail-value">${formatRupiah(assessment.pengeluaran?.lainnya)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label"><strong>Total Pengeluaran</strong></div>
                    <div class="detail-value"><strong>${formatRupiah(totalPengeluaran)}</strong></div>
                </div>
            </div>
            
            <div class="detail-item" style="margin-top: 12px; padding: 12px; background: ${selisih >= 0 ? '#d1e7dd' : '#f8d7da'}; border-radius: 8px;">
                <div class="detail-label">Saldo (Surplus/Defisit)</div>
                <div class="detail-value" style="color: ${selisih >= 0 ? '#0f5132' : '#842029'}; font-size: 16px;">
                    <strong>${formatRupiah(selisih)} (${selisih >= 0 ? 'Surplus' : 'Defisit'})</strong>
                </div>
            </div>
            
            <div class="detail-section-title">Aset yang Dimiliki</div>
            <div class="check-list">
                ${asetList}
            </div>
            
            <div class="detail-section-title">Penerima Bantuan Pemerintah</div>
            <div class="check-list">
                ${bantuanList}
            </div>
        `;
    }

    async loadAndRenderPersons() {
        const container = document.getElementById('personsContainer');
        const counter = document.getElementById('personCount');

        if (!container) return;

        try {
            const persons = await this.personService.getPersonsByFamily(this.familyId);
            const activePersons = persons.filter(p => p.is_active !== false);

            if (counter) {
                counter.textContent = activePersons.length.toString();
            }

            if (activePersons.length === 0) {
                container.innerHTML = `
                    <div class="text-center text-muted py-4">
                        <i class="bi bi-people" style="font-size: 32px; opacity: 0.3;"></i>
                        <p class="mt-2 mb-0">Belum ada anggota keluarga</p>
                    </div>
                `;
                return;
            }

            // Render list anggota
            container.innerHTML = activePersons.map(person => {
                const isKK = person.hubungan_dlm_keluarga === 'kepala_keluarga';
                return `
                    <div class="person-card ${isKK ? 'kepala-keluarga' : ''}">
                        <div class="person-card-header">
                            <div style="flex: 1;">
                                <h6 class="person-card-name">${person.nama}</h6>
                                <div class="person-card-nik">NIK: ${person.nik}</div>
                            </div>
                            ${isKK ? '<span class="badge bg-success">Kepala Keluarga</span>' : ''}
                        </div>
                        <div class="person-card-details">
                            <div class="detail-item">
                                <span class="detail-label">Hubungan</span>
                                <span class="detail-value">${this.formatHubungan(person.hubungan_dlm_keluarga)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Usia</span>
                                <span class="detail-value">${person.usia ? person.usia + ' thn' : '-'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Pekerjaan</span>
                                <span class="detail-value">${person.pekerjaan || '-'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Status ABI</span>
                                <span class="detail-value">${this.formatStatusABI(person.status_abi)}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            container.innerHTML = `
                <div class="text-center text-danger py-4">
                    <i class="bi bi-exclamation-triangle" style="font-size: 32px;"></i>
                    <p class="mt-2 mb-0">Gagal memuat data anggota</p>
                </div>
            `;
            Logger.error(MODULE_NAME, 'Load persons gagal', error);
        }
    }

    renderStatusBantuan(status) {
        const badge = document.getElementById('statusBantuanBadge');
        if (!badge) return;

        badge.className = 'status-badge';

        if (status === 'mustahiq') {
            badge.classList.add('mustahiq');
            badge.textContent = 'Mustahiq';
        } else if (status === 'donatur') {
            badge.classList.add('donatur');
            badge.textContent = 'Donatur';
        } else {
            badge.classList.add('belum');
            badge.textContent = 'Belum Ditentukan';
        }
    }

    // Helper formatters
    formatDate(date) {
        if (!date) return '-';
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    formatRupiah(num) {
        if (!num || num === 0) return 'Rp 0';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency', currency: 'IDR', minimumFractionDigits: 0
        }).format(num);
    }

    formatJenisKelamin(gender) {
        if (gender === 'L') return 'Laki-laki';
        if (gender === 'P') return 'Perempuan';
        return '-';
    }

    formatStatusABI(status) {
        if (!status) return '-';
        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    formatStatusKepemilikan(status) {
        const map = {
            'milik_sendiri': 'Milik Sendiri',
            'kontrak': 'Kontrak/Sewa',
            'menumpang': 'Menumpang'
        };
        return map[status] || status || '-';
    }

    formatKondisiRumah(kondisi) {
        const map = {
            'permanen': 'Permanen (Beton/Bata)',
            'semi_permanen': 'Semi Permanen',
            'tidak_permanen': 'Tidak Permanen (Kayu)'
        };
        return map[kondisi] || kondisi || '-';
    }

    formatAksesAir(akses) {
        const map = {
            'pdam': 'PDAM',
            'sumur': 'Sumur',
            'lainnya': 'Lainnya'
        };
        return map[akses] || akses || '-';
    }

    formatHubungan(hub) {
        if (!hub) return '-';
        return hub.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    setTextContent(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.textContent = value !== null && value !== undefined && value !== '' ? value : '-';
            if (value === null || value === undefined || value === '') {
                field.classList.add('empty');
            }
        }
    }
}

// Inisialisasi controller saat DOM siap
document.addEventListener('DOMContentLoaded', async () => {
    const controller = new FamilyDetailController();
    await controller.init();
    window.familyDetailController = controller;
    console.log('✅ FamilyDetailController dimuat');
});