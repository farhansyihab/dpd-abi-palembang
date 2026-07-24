/**
 * FamilyFormController - Mengelola form input data keluarga (Lembar 1).
 * 
 * TUGAS:
 * - Baca data dari DOM (form fields)
 * - Validasi real-time (pakai Validator)
 * - Panggil FamilyService untuk simpan data + Economic Assessment
 * - Tampilkan feedback ke user (alert sukses/error)
 */
import { BaseController } from './BaseController.js';
import { FamilyService } from '../services/FamilyService.js';
import { PersonService } from '../services/PersonService.js';
import { Validator } from '../services/Validator.js';
import { EconomicAssessmentModel } from '../models/EconomicAssessmentModel.js';
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
     * Inisialisasi controller — cek auth dulu, baru setup form.
     */
    async init() {
        super.init();
        Logger.info(MODULE_NAME, 'Inisialisasi form keluarga');

        // 🔐 1. AUTH GUARD
        const isAuthorized = await this.requireAuth();
        if (!isAuthorized) return;

        // 🔐 2. Cek mode edit
        const urlParams = new URLSearchParams(window.location.search);
        const familyId = urlParams.get('id');
        if (familyId) {
            this.isEditMode = true;
            this.currentFamilyId = familyId;
            this.loadFamilyData(familyId);
        }

        // 🔐 3. Setup form
        this.setupEventListeners();
        this.setupRealtimeValidation();
        this.setupAutoFormat();
        this.setupRealtimeCalculation(); // BARU: Kalkulasi real-time ekonomi
    }

    setupEventListeners() {
        this.rootElement.addEventListener('submit', (e) => this.handleSubmit(e));
        document.getElementById('btnBatal').addEventListener('click', () => {
            if (confirm('Yakin ingin membatalkan? Data yang sudah diisi akan hilang.')) {
                window.location.href = '/';
            }
        });
        document.getElementById('btnSimpanDraft').addEventListener('click', () => {
            this.showAlert('Fitur Simpan Draft akan segera tersedia', 'info');
        });
    }

    setupRealtimeValidation() {
        const noKKField = document.getElementById('no_kk');
        noKKField.addEventListener('blur', () => this.validateNoKK());
        noKKField.addEventListener('input', () => this.clearFieldError('no_kk'));

        const nikField = document.getElementById('nik_kepala_keluarga');
        nikField.addEventListener('blur', () => this.validateNIK());
        nikField.addEventListener('input', () => this.clearFieldError('nik_kepala_keluarga'));

        const requiredFields = ['nama_kepala_keluarga', 'alamat_jalan', 'alamat_rt', 'alamat_rw', 'alamat_kelurahan', 'alamat_kecamatan', 'eco_periode', 'eco_sumber_pendapatan', 'eco_total_pendapatan'];
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('blur', () => this.validateRequired(fieldId));
                field.addEventListener('input', () => this.clearFieldError(fieldId));
            }
        });
    }

    setupAutoFormat() {
        // No. KK & NIK
        ['no_kk', 'nik_kepala_keluarga'].forEach(fieldId => {
            const field = document.getElementById(fieldId);
            field.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '');
            });
        });

        // Penghasilan KK
        const penghasilanField = document.getElementById('penghasilan_kk');
        penghasilanField.addEventListener('input', (e) => this._formatRupiahInput(e));
        penghasilanField.addEventListener('blur', (e) => this._formatRupiahBlur(e));

        // BARU: Semua field ekonomi yang berformat Rupiah
        const ecoRupiahFields = document.querySelectorAll('.format-rupiah');
        ecoRupiahFields.forEach(field => {
            field.addEventListener('input', (e) => this._formatRupiahInput(e));
            field.addEventListener('blur', (e) => this._formatRupiahBlur(e));
        });
    }

    // BARU: Setup kalkulasi real-time menggunakan EconomicAssessmentModel
    setupRealtimeCalculation() {
        const ecoInputs = document.querySelectorAll('.format-rupiah, #eco_total_pendapatan');
        ecoInputs.forEach(input => {
            input.addEventListener('input', () => this.updateEconomicSummary());
        });
    }

    // Helper: Format input Rupiah saat mengetik
    _formatRupiahInput(e) {
        let value = e.target.value.replace(/\D/g, '');
        e.target.value = value ? new Intl.NumberFormat('id-ID').format(value) : '';
    }

    // Helper: Format blur Rupiah (memastikan tidak ada titik di akhir jika kosong)
    _formatRupiahBlur(e) {
        let value = e.target.value.replace(/\D/g, '');
        e.target.value = value ? new Intl.NumberFormat('id-ID').format(value) : '';
    }

    // BARU: Update ringkasan pengeluaran & selisih secara real-time
    updateEconomicSummary() {
        try {
            const parseRupiah = (id) => {
                const val = this.getFieldValue(id).replace(/\./g, '');
                return val ? parseInt(val, 10) : 0;
            };

            const pengeluaran = {
                makan: parseRupiah('eco_pengeluaran_makan'),
                listrik_air: parseRupiah('eco_pengeluaran_listrik_air'),
                pendidikan: parseRupiah('eco_pengeluaran_pendidikan'),
                kesehatan: parseRupiah('eco_pengeluaran_kesehatan'),
                lainnya: parseRupiah('eco_pengeluaran_lainnya')
            };

            const totalPendapatan = parseRupiah('eco_total_pendapatan');

            // Gunakan Model untuk kalkulasi (Reuse logic yang sudah ada)
            const tempModel = new EconomicAssessmentModel({
                total_pendapatan: totalPendapatan,
                pengeluaran: pengeluaran
            });

            const totalPengeluaran = tempModel.calculateTotalPengeluaran();
            const selisih = tempModel.calculateSelisih();

            // Update UI
            document.getElementById('summary_total_pengeluaran').textContent = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalPengeluaran);

            const selisihEl = document.getElementById('summary_selisih');
            selisihEl.textContent = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(selisih);

            // Ubah warna berdasarkan surplus/defisit
            if (selisih >= 0) {
                selisihEl.className = 'fs-5 fw-bold text-success';
                selisihEl.textContent += ' (Surplus)';
            } else {
                selisihEl.className = 'fs-5 fw-bold text-danger';
                selisihEl.textContent += ' (Defisit)';
            }

        } catch (error) {
            Logger.warn(MODULE_NAME, 'Gagal kalkulasi real-time', error);
        }
    }

    async validateNoKK() {
        const field = document.getElementById('no_kk');
        const value = field.value.trim();
        this.clearFieldError('no_kk');
        if (value === '') {
            this.showFieldError('no_kk', 'Nomor KK wajib diisi');
            return false;
        }
        try {
            Validator.isValidNoKK(value);
        } catch (error) {
            this.showFieldError('no_kk', error.message);
            return false;
        }
        if (!this.isEditMode) {
            try {
                const existingFamily = await this.familyService.familyRepo.findByNoKK(value);
                if (existingFamily) {
                    this.showFieldError('no_kk', `No. KK ${value} sudah terdaftar`);
                    return false;
                }
            } catch (error) {
                Logger.warn(MODULE_NAME, 'Gagal cek duplikasi No. KK', error);
            }
        }
        field.classList.add('is-valid');
        return true;
    }

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

    async validateAllFields() {
        let isValid = true;
        if (!await this.validateNoKK()) isValid = false;
        if (!await this.validateNIK()) isValid = false;

        const requiredFields = ['nama_kepala_keluarga', 'alamat_jalan', 'alamat_rt', 'alamat_rw', 'alamat_kelurahan', 'alamat_kecamatan', 'eco_periode', 'eco_sumber_pendapatan', 'eco_total_pendapatan'];
        for (const fieldId of requiredFields) {
            if (!this.validateRequired(fieldId)) isValid = false;
        }
        return isValid;
    }

    // BARU: Kumpulkan data ekonomi dari form
    collectEconomicData() {
        const parseRupiah = (id) => {
            const val = this.getFieldValue(id).replace(/\./g, '');
            return val ? parseInt(val, 10) : 0;
        };

        const pengeluaran = {
            makan: parseRupiah('eco_pengeluaran_makan'),
            listrik_air: parseRupiah('eco_pengeluaran_listrik_air'),
            pendidikan: parseRupiah('eco_pengeluaran_pendidikan'),
            kesehatan: parseRupiah('eco_pengeluaran_kesehatan'),
            lainnya: parseRupiah('eco_pengeluaran_lainnya')
        };

        const aset = {
            motor: document.getElementById('aset_motor').checked,
            mobil: document.getElementById('aset_mobil').checked,
            kulkas: document.getElementById('aset_kulkas').checked,
            tv: document.getElementById('aset_tv').checked,
            tanah: document.getElementById('aset_tanah').checked
        };

        const penerimaBantuan = [];
        ['bantuan_pkh', 'bantuan_bpnt', 'bantuan_pbi', 'bantuan_kip', 'bantuan_lainnya'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el.checked) {
                penerimaBantuan.push(el.value);
            }
        });

        return {
            periode: this.getFieldValue('eco_periode'),
            total_pendapatan: parseRupiah('eco_total_pendapatan'),
            sumber_pendapatan_utama: this.getFieldValue('eco_sumber_pendapatan'),
            pengeluaran: pengeluaran,
            aset: aset,
            penerima_bantuan_pemerintah: penerimaBantuan
        };
    }

    collectFormData() {
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
            status_bantuan: 'belum_ditentukan'
        };

        // BARU: Sertakan data ekonomi
        const economicData = this.collectEconomicData();

        return {
            namaKepalaKeluarga,
            kepalaKeluargaData,
            familyData,
            economicData
        };
    }

    async handleSubmit(event) {
        event.preventDefault();
        Logger.info(MODULE_NAME, 'Submit form dimulai');
        this.clearAllFieldErrors();

        const isValid = await this.validateAllFields();
        if (!isValid) {
            this.showAlert('Mohon periksa kembali field yang ditandai merah', 'warning');
            const firstError = this.rootElement.querySelector('.is-invalid');
            if (firstError) this.scrollToField(firstError.id);
            return;
        }

        const formData = this.collectFormData();
        this.showLoading(true);

        try {
            if (this.isEditMode) {
                await this.familyService.updateFamily(this.currentFamilyId, formData.familyData, formData.namaKepalaKeluarga);
                this.showAlert('Data keluarga berhasil diperbarui', 'success');
            } else {
                // Step 1: Buat keluarga
                const { familyId } = await this.familyService.createFamily(
                    formData.familyData,
                    null, // economicData diproses di Step 4 agar familyId sudah ada
                    formData.namaKepalaKeluarga
                );

                // Step 2: Buat person kepala keluarga
                const personId = await this.personService.createPerson({
                    family_id: familyId,
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

                // Step 3: Update family dengan kepala_keluarga_person_id
                await this.familyService.updateFamily(familyId, {
                    kepala_keluarga_person_id: personId
                });

                // Step 4 (BARU): Simpan data ekonomi
                if (formData.economicData && formData.economicData.periode) {
                    await this.familyService.saveEconomicAssessment(familyId, formData.economicData);
                    Logger.info(MODULE_NAME, 'Data ekonomi berhasil disimpan', { familyId });
                }

                this.showAlert('Data keluarga dan ekonomi berhasil disimpan!', 'success', 0);
                setTimeout(() => {
                    window.location.href = `/?familyId=${familyId}`;
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

    async loadFamilyData(familyId) {
        Logger.info(MODULE_NAME, `Load data keluarga ${familyId} untuk mode edit`);
        this.showLoading(true);
        try {
            const { family } = await this.familyService.getFamilyDetail(familyId);

            // Populate Bagian A
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

            // BARU: Populate Bagian C (Data Ekonomi) jika ada
            const { latestAssessment } = await this.familyService.getFamilyDetail(familyId); // Re-fetch atau ambil dari object yang sama jika di-refactor
            if (latestAssessment) {
                this.setFieldValue('eco_periode', latestAssessment.periode);
                this.setFieldValue('eco_sumber_pendapatan', latestAssessment.sumber_pendapatan_utama);
                this.setFieldValue('eco_total_pendapatan', new Intl.NumberFormat('id-ID').format(latestAssessment.total_pendapatan));

                this.setFieldValue('eco_pengeluaran_makan', new Intl.NumberFormat('id-ID').format(latestAssessment.pengeluaran.makan));
                this.setFieldValue('eco_pengeluaran_listrik_air', new Intl.NumberFormat('id-ID').format(latestAssessment.pengeluaran.listrik_air));
                this.setFieldValue('eco_pengeluaran_pendidikan', new Intl.NumberFormat('id-ID').format(latestAssessment.pengeluaran.pendidikan));
                this.setFieldValue('eco_pengeluaran_kesehatan', new Intl.NumberFormat('id-ID').format(latestAssessment.pengeluaran.kesehatan));
                this.setFieldValue('eco_pengeluaran_lainnya', new Intl.NumberFormat('id-ID').format(latestAssessment.pengeluaran.lainnya));

                if (latestAssessment.aset) {
                    document.getElementById('aset_motor').checked = latestAssessment.aset.motor;
                    document.getElementById('aset_mobil').checked = latestAssessment.aset.mobil;
                    document.getElementById('aset_kulkas').checked = latestAssessment.aset.kulkas;
                    document.getElementById('aset_tv').checked = latestAssessment.aset.tv;
                    document.getElementById('aset_tanah').checked = latestAssessment.aset.tanah;
                }

                if (latestAssessment.penerima_bantuan_pemerintah) {
                    latestAssessment.penerima_bantuan_pemerintah.forEach(bantuan => {
                        const el = document.querySelector(`input[name^="bantuan_"][value="${bantuan}"]`);
                        if (el) el.checked = true;
                    });
                }

                // Trigger kalkulasi awal
                this.updateEconomicSummary();
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

document.addEventListener('DOMContentLoaded', async () => {
    const controller = new FamilyFormController();
    await controller.init();
    window.familyFormController = controller;
    console.log('✅ FamilyFormController dimuat');
});