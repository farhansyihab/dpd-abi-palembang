import { BaseController } from './BaseController.js';
import { FamilyService } from '../services/FamilyService.js';
import { PersonService } from '../services/PersonService.js';
import { Logger } from '../core/Logger.js';

import { PersonListManager } from './person-form/PersonListManager.js';
import { PersonFormModalManager } from './person-form/PersonFormModalManager.js';

const MODULE_NAME = 'PersonFormController';

class PersonFormController extends BaseController {
    constructor() {
        super('personTable');
        this.familyService = new FamilyService();
        this.personService = new PersonService();
        this.familyId = null;
        this.modalInstance = null; // Akan diinisialisasi saat init

        // Composition
        this.listManager = new PersonListManager(this);
        this.modalManager = new PersonFormModalManager(this);
    }

    async init() {
        super.init();
        const isAuthorized = await this.requireAuth();
        if (!isAuthorized) return;

        const urlParams = new URLSearchParams(window.location.search);
        this.familyId = urlParams.get('familyId');

        if (!this.familyId) {
            this.showAlert('ID Keluarga tidak ditemukan.', 'danger', 0);
            setTimeout(() => window.location.href = '/', 3000);
            return;
        }

        // Inisialisasi Bootstrap Modal
        const modalEl = document.getElementById('personModal');
        this.modalInstance = new bootstrap.Modal(modalEl);

        // Setup event listener tombol utama
        document.getElementById('btnTambahAnggota').addEventListener('click', () => {
            this.modalManager.openForAdd();
        });

        // Load data awal
        await this.loadFamilyInfo();
        await this.listManager.loadAndRenderList(this.familyId);
    }

    async loadFamilyInfo() {
        try {
            const { family } = await this.familyService.getFamilyDetail(this.familyId);
            this.setTextContent('info_no_kk', family.no_kk);
            this.setTextContent('info_alamat', `${family.alamat.jalan}, RT ${family.alamat.rt}/RW ${family.alamat.rw}, ${family.alamat.kelurahan}`);

            if (family.kepala_keluarga_person_id) {
                const persons = await this.personService.getPersonsByFamily(this.familyId);
                const kk = persons.find(p => p.hubungan_dlm_keluarga === 'kepala_keluarga');
                this.setTextContent('info_nama_kk', kk ? kk.nama : 'Belum ada data');
            } else {
                this.setTextContent('info_nama_kk', 'Belum ada data');
            }
        } catch (error) {
            this.showError(error, 'Gagal memuat info keluarga');
        }
    }

    // Helper untuk setTextContent (tambahkan ini di BaseController.js jika belum ada)
    setTextContent(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) field.textContent = value !== null && value !== undefined ? value : '-';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const controller = new PersonFormController();
    await controller.init();
    window.personFormController = controller;
});