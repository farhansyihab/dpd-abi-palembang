import { PersonFormValidator } from './PersonFormValidator.js';
import { PersonFormFormatter } from './PersonFormFormatter.js';
import { Logger } from '../../core/Logger.js';

const MODULE_NAME = 'PersonFormModalManager';

export class PersonFormModalManager {
    constructor(controller) {
        this.controller = controller;
        this.form = document.getElementById('personModalForm');
        this.validator = new PersonFormValidator(this);
        this.formatter = new PersonFormFormatter(this);

        // Setup listener sekali saja saat inisialisasi
        this.setupModalListeners();
    }

    setupModalListeners() {
        // Auto-format Rupiah & NIK di dalam modal
        this.formatter.setupAutoFormat();

        // Validasi real-time di modal
        this.validator.setupRealtimeValidation();

        // ✅ PERBAIKAN: Tambahkan defensive check untuk btnSimpanModal
        const btnSimpan = document.getElementById('btnSimpanModal');
        if (btnSimpan) {
            btnSimpan.addEventListener('click', () => this.handleSubmit());
        } else {
            console.warn(`[${MODULE_NAME}] PERINGATAN: Elemen 'btnSimpanModal' tidak ditemukan di DOM. Periksa file person-form.html!`);
        }

        // ✅ PERBAIKAN: Tambahkan defensive check untuk personModal
        const personModal = document.getElementById('personModal');
        if (personModal) {
            personModal.addEventListener('hidden.bs.modal', () => {
                if (this.form) {
                    this.form.reset();
                    this.form.classList.remove('was-validated');
                }
                this.controller.clearAllFieldErrors();
            });
        }
    }

    openForAdd() {
        document.getElementById('modalTitle').textContent = 'Tambah Anggota Baru';
        document.getElementById('modal_person_id').value = '';
        this.form.reset();
        this.controller.clearAllFieldErrors();
        this.controller.modalInstance.show();
    }

    openForEdit(person) {
        document.getElementById('modalTitle').textContent = 'Edit Data Anggota';
        document.getElementById('modal_person_id').value = person.id;

        // Populate data
        this.setModalValue('modal_nik', person.nik);
        this.setModalValue('modal_nama', person.nama);
        this.setModalValue('modal_hubungan', person.hubungan_dlm_keluarga);
        this.setModalValue('modal_tempat_lahir', person.tempat_lahir);

        if (person.tanggal_lahir) {
            const dateObj = person.tanggal_lahir.toDate ? person.tanggal_lahir.toDate() : new Date(person.tanggal_lahir);
            this.setModalValue('modal_tanggal_lahir', dateObj.toISOString().split('T')[0]);
        }

        this.setModalValue('modal_jenis_kelamin', person.jenis_kelamin);
        this.setModalValue('modal_pendidikan', person.pendidikan_terakhir);
        this.setModalValue('modal_pekerjaan', person.pekerjaan);
        this.setModalValue('modal_penghasilan', this.formatter.formatRupiah(person.penghasilan_bulan || 0));
        this.setModalValue('modal_status_abi', person.status_abi);
        this.setModalValue('modal_no_telp', person.no_telp || '');
        this.setModalValue('modal_skills', person.skills || '');

        // Checkbox kaderisasi
        document.getElementById('modal_kader_ptd').checked = person.kaderisasi?.includes('PTD') || false;
        document.getElementById('modal_kader_ptm').checked = person.kaderisasi?.includes('PTM') || false;

        this.controller.clearAllFieldErrors();
        this.controller.modalInstance.show();
    }

    setModalValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value !== null && value !== undefined ? value : '';
    }

    async handleSubmit() {
        this.controller.clearAllFieldErrors();
        const isValid = await this.validator.validateModalForm();

        if (!isValid) {
            this.controller.showAlert('Mohon periksa field yang ditandai merah.', 'warning');
            return;
        }

        const btnSimpan = document.getElementById('btnSimpanModal');
        const spinner = document.getElementById('modalLoading');
        btnSimpan.disabled = true;
        spinner.classList.remove('d-none');

        try {
            const personId = document.getElementById('modal_person_id').value;
            const kaderisasi = [];
            if (document.getElementById('modal_kader_ptd').checked) kaderisasi.push('PTD');
            if (document.getElementById('modal_kader_ptm').checked) kaderisasi.push('PTM');

            const personData = {
                family_id: this.controller.familyId,
                nik: this.getModalValue('modal_nik'),
                nama: this.getModalValue('modal_nama'),
                hubungan_dlm_keluarga: this.getModalValue('modal_hubungan'),
                tempat_lahir: this.getModalValue('modal_tempat_lahir'),
                tanggal_lahir: this.getModalValue('modal_tanggal_lahir') || null,
                jenis_kelamin: this.getModalValue('modal_jenis_kelamin'),
                pendidikan_terakhir: this.getModalValue('modal_pendidikan'),
                pekerjaan: this.getModalValue('modal_pekerjaan'),

                // ✅ PERBAIKAN DI SINI: Panggil static method dari Class langsung
                penghasilan_bulan: PersonFormFormatter.parseRupiah(this.getModalValue('modal_penghasilan')),

                status_abi: this.getModalValue('modal_status_abi'),
                kaderisasi: kaderisasi,
                no_telp: this.getModalValue('modal_no_telp'),
                skills: this.getModalValue('modal_skills'),
                is_active: true
            };

            console.log("🚀 DATA YANG AKAN DIKIRIM KE FIRESTORE:", personData);

            if (personId) {
                await this.controller.personService.updatePerson(personId, personData);
                this.controller.showAlert('Data anggota berhasil diperbarui.', 'success');
            } else {
                await this.controller.personService.createPerson(personData);
                this.controller.showAlert('Anggota baru berhasil ditambahkan.', 'success');
            }

            this.controller.modalInstance.hide();
            // Refresh tabel
            await this.controller.listManager.loadAndRenderList(this.controller.familyId);

        } catch (error) {
            this.controller.showError(error, 'Gagal menyimpan data anggota');
        } finally {
            btnSimpan.disabled = false;
            spinner.classList.add('d-none');
        }
    }

    getModalValue(id) {
        const el = document.getElementById(id);
        return el ? el.value.trim() : '';
    }
}