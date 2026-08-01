import { Logger } from '../../core/Logger.js';
const MODULE_NAME = 'PersonListManager';

export class PersonListManager {
    constructor(controller) {
        this.controller = controller;
        this.tableBody = document.getElementById('personTableBody');

        // 🆕 Simpan referensi data persons saat ini agar bisa diakses oleh event delegation
        this.currentPersons = [];

        // ✅ PERBAIKAN BUG UTAMA: Event Delegation dipasang SEKALI saja di constructor
        this.tableBody.addEventListener('click', (e) => {
            const relasiBtn = e.target.closest('.btn-relasi');
            const editBtn = e.target.closest('.btn-edit');
            const deleteBtn = e.target.closest('.btn-delete');

            if (relasiBtn) {
                const personId = relasiBtn.dataset.id;
                this.controller.relationManager.openForPerson(personId);
            }
            if (editBtn) {
                const personId = editBtn.dataset.id;
                const personData = this.currentPersons.find(p => p.id === personId);
                if (personData) {
                    this.controller.modalManager.openForEdit(personData);
                }
            }
            if (deleteBtn) {
                const personId = deleteBtn.dataset.id;
                this.handleDelete(personId);
            }
        });
    }

    async loadAndRenderList(familyId) {
        // 1. Tampilkan state loading awal
        this.tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                    Memuat data anggota...
                </td>
            </tr>
        `;

        try {
            // 2. Bungkus dengan Promise.race untuk mencegah "Infinite Hang"
            const fetchPromise = this.controller.personService.getPersonsByFamily(familyId);

            // Timeout 10 detik: Jika emulator mati tapi port masih 'nyangkut', ini akan memaksa error
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('TIMEOUT_DATABASE')), 10000);
            });

            // Tunggu mana yang lebih dulu: data datang ATAU timeout tercapai
            const persons = await Promise.race([fetchPromise, timeoutPromise]);

            // 3. Jika berhasil, render tabel
            this.renderTable(persons);

        } catch (error) {
            // 4. Tangani error dengan pesan yang JELAS dan MANUSIAWI untuk user
            const isTimeout = error.message === 'TIMEOUT_DATABASE' || error.message.includes('Timeout');

            const errorMessage = isTimeout
                ? 'Koneksi ke database terputus atau terlalu lama. Pastikan Firestore Emulator berjalan.'
                : 'Gagal memuat data anggota. Periksa koneksi jaringan atau hubungi admin.';

            // Tampilkan UI error merah yang informatif di dalam tabel
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger py-4">
                        <i class="bi bi-exclamation-triangle-fill fs-3 mb-2 d-block"></i>
                        <strong>${errorMessage}</strong>
                        <br>
                        <small class="text-muted mt-2 d-block">
                            Silakan refresh halaman atau periksa terminal emulator Anda.
                        </small>
                        <button class="btn btn-sm btn-outline-danger mt-3" onclick="window.location.reload()">
                            <i class="bi bi-arrow-clockwise me-1"></i>Refresh Halaman
                       
                 </td>
                </tr>
            `;

            // Tetap log error teknis ke console untuk debugging developer
            this.controller.showError(error, 'Gagal memuat daftar anggota di PersonListManager');
        }
    }

    renderTable(persons) {
        this.tableBody.innerHTML = '';

        // 🆕 Update referensi data persons saat ini sebelum me-render ulang DOM
        this.currentPersons = persons;

        if (persons.length === 0) {
            this.tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">Belum ada data anggota. Tap tombol + untuk menambah.</td></tr>';
            const counter = document.getElementById('personCount');
            if (counter) counter.textContent = '0';
            return;
        }

        const counter = document.getElementById('personCount');
        if (counter) counter.textContent = persons.length.toString();

        persons.forEach(person => {
            const tr = document.createElement('tr');
            if (person.hubungan_dlm_keluarga === 'kepala_keluarga') {
                tr.classList.add('kepala-keluarga-row');
            }
            tr.innerHTML = `
                <td data-label="NIK">${person.nik}</td>
                <td data-label="Nama" class="fw-bold">${person.nama}</td>
                <td data-label="Hubungan"><span class="badge bg-secondary">${this.formatHubungan(person.hubungan_dlm_keluarga)}</span></td>
                <td data-label="Usia">${person.usia || '-'} thn</td>
                <td data-label="Pekerjaan">${person.pekerjaan || '-'}</td>
                <td data-label="Status ABI"><span class="badge bg-info text-dark">${person.status_abi}</span></td>
                <td data-label="Aksi" class="text-center">
                    <button class="btn btn-sm btn-info me-1 btn-relasi" data-id="${person.id}" title="Kelola Relasi">
                        <i class="bi bi-diagram-3"></i>
                    </button>
                    <button class="btn btn-sm btn-warning me-1 btn-edit" data-id="${person.id}" title="Edit">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-delete" data-id="${person.id}" title="Hapus">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            this.tableBody.appendChild(tr);
        });
    }

    formatHubungan(hub) {
        return hub.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    async handleDelete(personId) {
        if (!confirm('Yakin ingin menghapus anggota ini? Data tidak bisa dikembalikan.')) return;
        try {
            await this.controller.personService.updatePerson(personId, { is_active: false });
            this.controller.showAlert('Anggota berhasil dihapus (dinonaktifkan).', 'success');
            await this.loadAndRenderList(this.controller.familyId);
        } catch (error) {
            this.controller.showError(error, 'Gagal menghapus data');
        }
    }
}