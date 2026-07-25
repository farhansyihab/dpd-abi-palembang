import { Logger } from '../../core/Logger.js';

const MODULE_NAME = 'PersonListManager';

export class PersonListManager {
    constructor(controller) {
        this.controller = controller;
        this.tableBody = document.getElementById('personTableBody');
    }

    async loadAndRenderList(familyId) {
        this.tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">Memuat data...</td></tr>';

        try {
            const persons = await this.controller.personService.getPersonsByFamily(familyId);
            this.renderTable(persons);
        } catch (error) {
            this.controller.showError(error, 'Gagal memuat daftar anggota');
            this.tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">Gagal memuat data</td></tr>';
        }
    }

    renderTable(persons) {
        this.tableBody.innerHTML = '';

        if (persons.length === 0) {
            this.tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">Belum ada data anggota. Klik "Tambah Anggota".</td></tr>';
            return;
        }

        persons.forEach(person => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${person.nik}</td>
                <td class="fw-bold">${person.nama}</td>
                <td><span class="badge bg-secondary">${this.formatHubungan(person.hubungan_dlm_keluarga)}</span></td>
                <td>${person.usia || '-'} thn</td>
                <td>${person.pekerjaan || '-'}</td>
                <td><span class="badge bg-info text-dark">${person.status_abi}</span></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-warning me-1 btn-edit" data-id="${person.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-delete" data-id="${person.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            this.tableBody.appendChild(tr);
        });

        // Event Delegation untuk tombol Edit & Hapus (sangat efisien, tidak freeze)
        this.tableBody.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.btn-edit');
            const deleteBtn = e.target.closest('.btn-delete');

            if (editBtn) {
                const personId = editBtn.dataset.id;
                const personData = persons.find(p => p.id === personId);
                this.controller.modalManager.openForEdit(personData);
            }

            if (deleteBtn) {
                const personId = deleteBtn.dataset.id;
                this.handleDelete(personId);
            }
        });
    }

    formatHubungan(hub) {
        return hub.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    async handleDelete(personId) {
        if (!confirm('Yakin ingin menghapus anggota ini? Data tidak bisa dikembalikan.')) return;

        try {
            // Kita pakai update is_active=false (soft delete) atau delete langsung sesuai kebijakan
            // Untuk sekarang, kita pakai update is_active = false agar riwayat program tidak hilang
            await this.controller.personService.updatePerson(personId, { is_active: false });
            this.controller.showAlert('Anggota berhasil dihapus (dinonaktifkan).', 'success');
            await this.loadAndRenderList(this.controller.familyId);
        } catch (error) {
            this.controller.showError(error, 'Gagal menghapus data');
        }
    }
}