/**
 * FamilyFormController - Mengelola form input data keluarga (Lembar 1).
 * 
 * TUGAS:
 * - Baca data dari DOM (form fields)
 * - Validasi real-time (pakai Validator)
 * - Panggil FamilyService untuk simpan data
 * - Tampilkan feedback ke user (alert sukses/error)
 * 
 * ATURAN EMAS:
 * - Controller BOLEH akses DOM
 * - Controller TIDAK BOLEH akses Repository/Firestore langsung
 * - Semua logika bisnis ada di Service
 */
import { BaseController } from './BaseController.js';
import { FamilyService } from '../services/FamilyService.js';
import { PersonService } from '../services/PersonService.js';
import { Validator } from '../services/Validator.js';
import { Logger } from '../core/Logger.js';

const MODULE_NAME = 'FamilyFormController';

class FamilyFormController extends BaseController {
    constructor() {
        super('familyForm'); // rootElementId = 'familyForm'
        this.familyService = new FamilyService();
        this.personService = new PersonService();
        this.isEditMode = false;
        this.currentFamilyId = null;
    }

    /**
     * Inisialisasi controller — pasang event listener, setup validasi real-time.
     */
    init() {
        super.init();
        Logger.info(MODULE_NAME, 'Inisialisasi form keluarga');

        // Cek apakah ini mode edit (ada parameter ?id=xxx di URL)
        const urlParams = new URLSearchParams(window.location.search);
        const familyId = urlParams.get('id');
        if (familyId) {
            this.isEditMode = true;
            this.currentFamilyId = familyId;
            this.loadFamilyData(familyId);
        }

        // Pasang event listener
        this.setupEventListeners();
        this.setupRealtimeValidation();
        this.setupAutoFormat();
    }

    /**
     * Pasang event listener untuk form dan tombol.
     */
    setupEventListeners() {
        // Submit form
        this.rootElement.addEventListener('submit', (e) => this.handleSubmit(e));

        // Tombol Batal
        document.getElementById('btnBatal').addEventListener('click', () => {
            if (confirm('Yakin ingin membatalkan? Data yang sudah diisi akan hilang.')) {
                window.location.href = '/';
            }
        });

        // Tombol Simpan Draft (untuk nanti — saat ini belum implementasi)
        document.getElementById('btnSimpanDraft').addEventListener('click', () => {
            this.showAlert('Fitur Simpan Draft akan segera tersedia', 'info');
        });
    }

    /**
     * Setup validasi real-time untuk field-field kritis.
     * Dipanggil saat user selesai mengetik (event 'blur') atau saat mengetik (event 'input').
     */
    setupRealtimeValidation() {
        // No. KK — validasi saat user selesai mengetik (blur)
        const noKKField = document.getElementById('no_kk');
        noKKField.addEventListener('blur', () => this.validateNoKK());
        noKKField.addEventListener('input', () => this.clearFieldError('no_kk'));

        // NIK Kepala Keluarga — validasi saat blur
        const nikField = document.getElementById('nik_kepala_keluarga');
        nikField.addEventListener('blur', () => this.validateNIK());
        nikField.addEventListener('input', () => this.clearFieldError('nik_kepala_keluarga'));

        // Field wajib lainnya — validasi saat blur
        const requiredFields = [
            'nama_kepala_keluarga',
            'alamat_jalan',
            'alamat_rt',
            'alamat_rw',
            'alamat_kelurahan',
            'alamat_kecamatan'
        ];

        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('blur', () => this.validateRequired(fieldId));
                field.addEventListener('input', () => this.clearFieldError(fieldId));
            }
        });
    }

    /**
     * Setup auto-format untuk field angka (NIK, No. KK, penghasilan).
     * Hanya izinkan input angka, hapus karakter non-digit otomatis.
     */
    setupAutoFormat() {
        // No. KK & NIK — hanya angka
        ['no_kk', 'nik_kepala_keluarga'].forEach(fieldId => {
            const field = document.getElementById(fieldId);
            field.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '');
            });
        });

        // Penghasilan — format rupiah (titik ribuan)
        const penghasilanField = document.getElementById('penghasilan_kk');
        penghasilanField.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value === '') {
                e.target.value = '';
                return;
            }
            // Format dengan titik ribuan
            e.target.value = new Intl.NumberFormat('id-ID').format(value);
        });

        // Saat field kehilangan fokus, pastikan format benar
        penghasilanField.addEventListener('blur', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value === '') {
                e.target.value = '';
            } else {
                e.target.value = new Intl.NumberFormat('id-ID').format(value);
            }
        });
    }

    /**
     * Validasi No. KK — cek format (16 digit) dan duplikasi.
     */
    async validateNoKK() {
        const field = document.getElementById('no_kk');
        const value = field.value.trim();

        // Kosongkan error sebelumnya
        this.clearFieldError('no_kk');

        // Cek required
        if (value === '') {
            this.showFieldError('no_kk', 'Nomor KK wajib diisi');
            return false;
        }

        // Cek format
        try {
            Validator.isValidNoKK(value);
        } catch (error) {
            this.showFieldError('no_kk', error.message);
            return false;
        }

        // Cek duplikasi (hanya di mode create)
        if (!this.isEditMode) {
            try {
                const existingFamily = await this.familyService.familyRepo.findByNoKK(value);
                if (existingFamily) {
                    this.showFieldError('no_kk', `No. KK ${value} sudah terdaftar`);
                    return false;
                }
            } catch (error) {
                Logger.warn(MODULE_NAME, 'Gagal cek duplikasi No. KK', error);
                // Jangan blokir user kalau cek duplikasi gagal — lanjutkan
            }
        }

        // Valid — tampilkan indikator sukses
        field.classList.add('is-valid');
        return true;
    }

    /**
     * Validasi NIK Kepala Keluarga — cek format (16 digit) dan duplikasi.
     */
    async validateNIK() {
        const field = document.getElementById('nik_kepala_keluarga');
        const value = field.value.trim();

        this.clearFieldError('nik_kepala_keluarga');

        if (value === '') {
            this.showFieldError('nik_kepala_keluarga', 'NIK Kepala Keluarga wajib diisi');
            return false;
        }

        try {
            Validator.isValidNIK(value);
        } catch (error) {
            this.showFieldError('nik_kepala_keluarga', error.message);
            return false;
        }

        // Cek duplikasi (hanya di mode create)
        if (!this.isEditMode) {
            try {
                const existingPerson = await this.personService.personRepo.findByNIK(value);
                if (existingPerson) {
                    this.showFieldError('nik_kepala_keluarga', `NIK ${value} sudah terdaftar atas nama: ${existingPerson.nama}`);
                    return false;
                }
            } catch (error) {
                Logger.warn(MODULE_NAME, 'Gagal cek duplikasi NIK', error);
            }
        }

        field.classList.add('is-valid');
        return true;
    }

    /**
     * Validasi field required.
     * 
     * @param {string} fieldId - ID field
     * @returns {boolean} true jika valid
     */
    validateRequired(fieldId) {
        const field = document.getElementById(fieldId);
        const value = field.value.trim();

        this.clearFieldError(fieldId);

        if (value === '') {
            const fieldName = field.previousElementSibling?.textContent?.replace(' *', '') || fieldId;
            this.showFieldError(fieldId, `${fieldName} wajib diisi`);
            return false;
        }

        field.classList.add('is-valid');
        return true;
    }

    /**
     * Handle submit form — validasi semua field, lalu simpan ke database.
     * 
     * @param {Event} event - Event submit
     */
    async handleSubmit(event) {
        event.preventDefault();
        Logger.info(MODULE_NAME, 'Submit form dimulai');

        // Bersihkan semua error sebelumnya
        this.clearAllFieldErrors();

        // Validasi semua field
        const isValid = await this.validateAllFields();
        if (!isValid) {
            this.showAlert('Mohon periksa kembali field yang ditandai merah', 'warning');
            // Scroll ke field error pertama
            const firstError = this.rootElement.querySelector('.is-invalid');
            if (firstError) {
                this.scrollToField(firstError.id);
            }
            return;
        }

        // Ambil data dari form
        const formData = this.collectFormData();

        // Tampilkan loading
        this.showLoading(true);

        try {
            if (this.isEditMode) {
                // Mode edit — update data
                await this.familyService.updateFamily(
                    this.currentFamilyId,
                    formData.familyData,
                    formData.namaKepalaKeluarga
                );
                this.showAlert('Data keluarga berhasil diperbarui', 'success');
            } else {
                // Mode create — buat data baru
                const result = await this.familyService.createFamily(
                    formData.familyData,
                    null, // economicData akan ditambahkan di Hari 2
                    formData.namaKepalaKeluarga
                );

                // Buat person kepala keluarga
                const personId = await this.personService.createPerson({
                    family_id: result.familyId,
                    nik: formData.kepalaKeluargaData.nik,
                    nama: formData.namaKepalaKeluarga,
                    tempat_lahir: formData.kepalaKeluargaData.tempat_lahir,
                    tanggal_lahir: formData.kepalaKeluargaData.tanggal_lahir,
                    jenis_kelamin: formData.kepalaKeluargaData.jenis_kelamin,
                    hubungan_dlm_keluarga: 'kepala_keluarga',
                    pendidikan_terakhir: formData.kepalaKeluargaData.pendidikan,
                    pekerjaan: formData.kepalaKeluargaData.pekerjaan,
                    penghasilan_bulan: formData.kepalaKeluargaData.penghasilan,
                    status_abi: formData.kepalaKeluargaData.status_abi
                });

                // Update family dengan kepala_keluarga_person_id
                await this.familyService.updateFamily(result.familyId, {
                    kepala_keluarga_person_id: personId
                });

                this.showAlert('Data keluarga berhasil disimpan!', 'success', 0); // tidak auto-dismiss

                // Redirect ke halaman detail keluarga (untuk nanti)
                setTimeout(() => {
                    window.location.href = `/?familyId=${result.familyId}`;
                }, 2000);
            }

            Logger.info(MODULE_NAME, 'Submit form berhasil');
        } catch (error) {
            this.showError(error, 'Gagal menyimpan data keluarga');
            Logger.error(MODULE_NAME, 'Submit form gagal', error);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Validasi semua field sebelum submit.
     * 
     * @returns {Promise<boolean>} true jika semua valid
     */
    async validateAllFields() {
        let isValid = true;

        // Validasi No. KK
        if (!await this.validateNoKK()) isValid = false;

        // Validasi NIK Kepala Keluarga
        if (!await this.validateNIK()) isValid = false;

        // Validasi field required lainnya
        const requiredFields = [
            'nama_kepala_keluarga',
            'alamat_jalan',
            'alamat_rt',
            'alamat_rw',
            'alamat_kelurahan',
            'alamat_kecamatan'
        ];

        for (const fieldId of requiredFields) {
            if (!this.validateRequired(fieldId)) isValid = false;
        }

        return isValid;
    }

    /**
     * Kumpulkan semua data dari form ke dalam object terstruktur.
     * 
     * @returns {Object} Data terstruktur untuk FamilyService
     */
    collectFormData() {
        // Data Kepala Keluarga (untuk PersonModel)
        const namaKepalaKeluarga = this.getFieldValue('nama_kepala_keluarga');
        const penghasilanRaw = this.getFieldValue('penghasilan_kk').replace(/\./g, '');
        const penghasilan = penghasilanRaw ? parseInt(penghasilanRaw, 10) : 0;

        const kepalaKeluargaData = {
            nik: this.getFieldValue('nik_kepala_keluarga'),
            tempat_lahir: this.getFieldValue('tempat_lahir_kk'),
            tanggal_lahir: this.getFieldValue('tanggal_lahir_kk') || null,
            jenis_kelamin: this.getFieldValue('jenis_kelamin_kk'),
            pendidikan: this.getFieldValue('pendidikan_kk'),
            pekerjaan: this.getFieldValue('pekerjaan_kk'),
            penghasilan: penghasilan,
            status_abi: this.getFieldValue('status_abi_kk')
        };

        // Data Keluarga (untuk FamilyModel)
        const familyData = {
            no_kk: this.getFieldValue('no_kk'),
            alamat: {
                jalan: this.getFieldValue('alamat_jalan'),
                rt: this.getFieldValue('alamat_rt'),
                rw: this.getFieldValue('alamat_rw'),
                kelurahan: this.getFieldValue('alamat_kelurahan'),
                kecamatan: this.getFieldValue('alamat_kecamatan'),
                kota: this.getFieldValue('alamat_kota')
            },
            status_kepemilikan_rumah: this.getFieldValue('status_kepemilikan_rumah'),
            kondisi_rumah: this.getFieldValue('kondisi_rumah'),
            akses_air_bersih: this.getFieldValue('akses_air_bersih'),
            status_bantuan: 'belum_ditentukan' // default untuk keluarga baru
        };

        return {
            namaKepalaKeluarga,
            kepalaKeluargaData,
            familyData
        };
    }

    /**
     * Load data keluarga dari database (untuk mode edit).
     * 
     * @param {string} familyId - ID keluarga
     */
    async loadFamilyData(familyId) {
        Logger.info(MODULE_NAME, `Load data keluarga ${familyId} untuk mode edit`);
        this.showLoading(true);

        try {
            const { family } = await this.familyService.getFamilyDetail(familyId);

            // Populate form dengan data keluarga
            this.setFieldValue('no_kk', family.no_kk);
            this.setFieldValue('alamat_jalan', family.alamat.jalan);
            this.setFieldValue('alamat_rt', family.alamat.rt);
            this.setFieldValue('alamat_rw', family.alamat.rw);
            this.setFieldValue('alamat_kelurahan', family.alamat.kelurahan);
            this.setFieldValue('alamat_kecamatan', family.alamat.kecamatan);
            this.setFieldValue('alamat_kota', family.alamat.kota);
            this.setFieldValue('status_kepemilikan_rumah', family.status_kepemilikan_rumah);
            this.setFieldValue('kondisi_rumah', family.kondisi_rumah);
            this.setFieldValue('akses_air_bersih', family.akses_air_bersih);

            // Load data kepala keluarga jika ada
            if (family.kepala_keluarga_person_id) {
                const persons = await this.personService.getPersonsByFamily(familyId);
                const kepalaKeluarga = persons.find(p => p.hubungan_dlm_keluarga === 'kepala_keluarga');
                if (kepalaKeluarga) {
                    this.setFieldValue('nama_kepala_keluarga', kepalaKeluarga.nama);
                    this.setFieldValue('nik_kepala_keluarga', kepalaKeluarga.nik);
                    this.setFieldValue('tempat_lahir_kk', kepalaKeluarga.tempat_lahir);
                    this.setFieldValue('tanggal_lahir_kk', kepalaKeluarga.tanggal_lahir);
                    this.setFieldValue('jenis_kelamin_kk', kepalaKeluarga.jenis_kelamin);
                    this.setFieldValue('pendidikan_kk', kepalaKeluarga.pendidikan_terakhir);
                    this.setFieldValue('pekerjaan_kk', kepalaKeluarga.pekerjaan);
                    this.setFieldValue('penghasilan_kk', new Intl.NumberFormat('id-ID').format(kepalaKeluarga.penghasilan_bulan));
                    this.setFieldValue('status_abi_kk', kepalaKeluarga.status_abi);
                }
            }

            Logger.info(MODULE_NAME, 'Data keluarga berhasil dimuat untuk edit');
        } catch (error) {
            this.showError(error, 'Gagal memuat data keluarga');
            Logger.error(MODULE_NAME, 'Load data keluarga gagal', error);
        } finally {
            this.showLoading(false);
        }
    }
}

// Inisialisasi controller saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
    const controller = new FamilyFormController();
    controller.init();

    // Expose ke window untuk debug (hapus sebelum production)
    window.familyFormController = controller;
    console.log('✅ FamilyFormController dimuat');
});