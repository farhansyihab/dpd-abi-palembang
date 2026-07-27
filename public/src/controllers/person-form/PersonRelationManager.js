import { Logger } from '../../core/Logger.js';

const MODULE_NAME = 'PersonRelationManager';

export class PersonRelationManager {
    constructor(controller) {
        this.controller = controller;
        this.modalEl = document.getElementById('relationModal');
        this.modalInstance = this.modalEl ? new bootstrap.Modal(this.modalEl) : null;
        this.form = document.getElementById('relationForm');
        this.setupListeners();
    }

    setupListeners() {
        // Tombol Cari Target
        document.getElementById('btnCariTarget')?.addEventListener('click', () => this.handleCariTarget());

        // Tombol Simpan Relasi
        document.getElementById('btnSimpanRelasi')?.addEventListener('click', () => this.handleSimpanRelasi());

        // Reset state saat modal ditutup
        this.modalEl?.addEventListener('hidden.bs.modal', () => {
            this.form?.reset();
            this.controller.clearAllFieldErrors();
            document.getElementById('target_nama_display').textContent = '-';
            document.getElementById('target_person_id').value = '';
        });
    }

    openForPerson(personId) {
        document.getElementById('source_person_id').value = personId;
        this.controller.clearAllFieldErrors();
        this.form?.reset();
        document.getElementById('target_nama_display').textContent = '-';
        document.getElementById('target_person_id').value = '';
        this.modalInstance?.show();
    }

    async handleCariTarget() {
        const nikTarget = document.getElementById('relasi_target_nik').value.trim();
        this.controller.clearFieldError('relasi_target_nik');

        if (!nikTarget) {
            this.controller.showFieldError('relasi_target_nik', 'NIK Target wajib diisi');
            return;
        }

        try {
            this.controller.showLoading(true);
            // Delegasi ke Service Layer (Strict Layered Architecture)
            const targetPerson = await this.controller.personService.getPersonByNIK(nikTarget);

            if (!targetPerson) {
                this.controller.showFieldError('relasi_target_nik', 'Person dengan NIK tersebut tidak ditemukan di sistem');
                return;
            }

            const sourceId = document.getElementById('source_person_id').value;
            if (targetPerson.id === sourceId) {
                this.controller.showFieldError('relasi_target_nik', 'Tidak bisa membuat relasi dengan diri sendiri');
                return;
            }

            // Simpan ID target yang valid ke hidden field
            document.getElementById('target_person_id').value = targetPerson.id;
            document.getElementById('target_nama_display').textContent = `${targetPerson.nama} (NIK: ${targetPerson.nik})`;
            this.controller.showAlert('Target relasi ditemukan!', 'success', 3000);
        } catch (error) {
            this.controller.showError(error, 'Gagal mencari target relasi');
        } finally {
            this.controller.showLoading(false);
            // Hapus class loading dari tombol cari jika ada
            const btnCari = document.getElementById('btnCariTarget');
            if (btnCari) btnCari.disabled = false;
            this.controller.showAlert('Gagal mencari target relasi', 'danger', 3000);
        }
    }

    async handleSimpanRelasi() {
        const sourceId = document.getElementById('source_person_id').value;
        const targetId = document.getElementById('target_person_id').value;
        const tipeRelasi = document.getElementById('relasi_tipe').value;
        const btnSimpan = document.getElementById('btnSimpanRelasi');
        const spinner = document.getElementById('relasiLoading');

        this.controller.clearAllFieldErrors();

        if (!targetId) {
            this.controller.showFieldError('relasi_target_nik', 'Harap cari dan pastikan target relasi ditemukan terlebih dahulu');
            return;
        }
        if (!tipeRelasi) {
            this.controller.showFieldError('relasi_tipe', 'Tipe relasi wajib dipilih');
            return;
        }

        try {
            btnSimpan.disabled = true;
            spinner.classList.remove('d-none');

            // Delegasi ke Service Layer
            await this.controller.personService.linkRelation(sourceId, targetId, tipeRelasi);

            this.controller.showAlert('Relasi antar-person berhasil ditambahkan!', 'success');
            this.modalInstance?.hide();

        } catch (error) {
            // 🩹 QUICK WORKAROUND: Jika error karena data sudah ada (akibat retry emulator), anggap sukses.
            if (error.message.includes('ALREADY_EXISTS') || error.code === 'DUPLICATE_RELATION') {
                this.controller.showAlert('Relasi sudah tercatat di sistem (Data valid).', 'success');
                this.modalInstance?.hide();
            } else {
                // Jika error lain (misal: validasi gagal, network mati total), tampilkan error asli
                this.controller.showError(error, 'Gagal menyimpan relasi');
            }
        } finally {
            btnSimpan.disabled = false;
            spinner.classList.add('d-none');
        }
    }

    async openForPerson(personId) {
        document.getElementById('source_person_id').value = personId;
        this.controller.clearAllFieldErrors();
        this.form?.reset();
        document.getElementById('target_nama_display').textContent = '-';
        document.getElementById('target_person_id').value = '';

        // 🆕 Load daftar relasi existing
        await this.loadExistingRelations(personId);

        this.modalInstance?.show();
    }

    /**
     * 🆕 Muat dan render daftar relasi yang sudah ada untuk person ini.
     */
    async loadExistingRelations(personId) {
        const container = document.getElementById('existingRelationsContainer');
        const listEl = document.getElementById('existingRelationsList');

        try {
            this.controller.showLoading(true);
            const relations = await this.controller.personService.getRelationsForPerson(personId);

            if (relations.length === 0) {
                listEl.innerHTML = '<p class="text-muted text-center py-3 mb-0">Belum ada relasi tercatat untuk person ini.</p>';
            } else {
                listEl.innerHTML = relations.map(({ relation, relatedPerson, direction }) => {
                    if (!relatedPerson) return ''; // Skip jika person target sudah dihapus

                    // Tentukan label berdasarkan arah relasi
                    let label;
                    if (direction === 'source') {
                        // Person ini → target
                        label = `${this.formatTipeRelasi(relation.tipe_relasi)} dari ${relatedPerson.nama}`;
                    } else {
                        // Target → person ini (relasi terbalik)
                        label = `${this.formatTipeRelasi(relation.tipe_relasi)} ke ${relatedPerson.nama}`;
                    }

                    return `
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <i class="bi bi-diagram-3 text-info me-2"></i>
                                <strong>${relatedPerson.nama}</strong>
                                <small class="text-muted d-block">NIK: ${relatedPerson.nik} — ${label}</small>
                            </div>
                            <button class="btn btn-sm btn-outline-danger btn-hapus-relasi" 
                                    data-relation-id="${relation.id}" 
                                    title="Hapus relasi">
                                <i class="bi bi-trash"></i>
                            </button>
                        </li>
                    `;
                }).join('');

                // Event delegation untuk tombol hapus
                listEl.querySelectorAll('.btn-hapus-relasi').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const relationId = e.currentTarget.dataset.relationId;
                        this.handleHapusRelasi(relationId, personId);
                    });
                });
            }

            container.classList.remove('d-none');
        } catch (error) {
            this.controller.showError(error, 'Gagal memuat daftar relasi');
            listEl.innerHTML = '<p class="text-danger text-center py-3 mb-0">Gagal memuat data relasi.</p>';
        } finally {
            this.controller.showLoading(false);
        }
    }

    /**
     * 🆕 Format tipe relasi ke bahasa manusia
     */
    formatTipeRelasi(tipe) {
        const map = {
            'anak': 'Anak',
            'orang_tua': 'Orang Tua',
            'saudara': 'Saudara Kandung',
            'paman_bibi': 'Paman/Bibi',
            'keponakan': 'Keponakan',
            'mertua': 'Mertua',
            'ipar': 'Ipar',
            'sepupu': 'Sepupu',
            'lainnya': 'Lainnya'
        };
        return map[tipe] || tipe;
    }

    /**
     * 🆕 Hapus relasi (soft delete — hapus dokumen dari collection)
     */
    async handleHapusRelasi(relationId, personId) {
        if (!confirm('Yakin ingin menghapus relasi ini?')) return;

        try {
            this.controller.showLoading(true);
            // Kita perlu akses langsung ke relationRepo untuk delete
            // Ini sedikit melanggar strict layered, tapi untuk operasi delete sederhana masih bisa diterima
            // Alternatif: tambahkan method deleteRelation() di PersonService
            // await this.controller.personService.relationRepo.delete(relationId);
            await this.controller.personService.deleteRelation(relationId);
            this.controller.showAlert('Relasi berhasil dihapus.', 'success');
            // Reload daftar relasi
            await this.loadExistingRelations(personId);
        } catch (error) {
            this.controller.showError(error, 'Gagal menghapus relasi');
        } finally {
            this.controller.showLoading(false);
        }
    }
}