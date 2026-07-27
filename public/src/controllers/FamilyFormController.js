/**
 * FamilyFormController - Orchestrator form input data keluarga (Lembar 1).
 * 
 * TUGAS UTAMA:
 * - Inisialisasi helper classes (validator, formatter, economic, dataCollector, loader)
 * - Setup event listener submit
 * - Orkestrasi submit: validasi → kumpulkan data → simpan via Service → feedback
 * 
 * DELEGASI:
 * - Validasi → FamilyFormValidator
 * - Auto-format → FamilyFormFormatter
 * - Kalkulasi ekonomi → FamilyFormEconomic
 * - Kumpulkan data → FamilyFormDataCollector
 * - Load data edit → FamilyFormLoader
 */
import { BaseController } from './BaseController.js';
import { FamilyService } from '../services/FamilyService.js';
import { PersonService } from '../services/PersonService.js';
import { Logger } from '../core/Logger.js';

// Import helper classes dari sub-folder
import { FamilyFormValidator } from './family-form/FamilyFormValidator.js';
import { FamilyFormFormatter } from './family-form/FamilyFormFormatter.js';
import { FamilyFormEconomic } from './family-form/FamilyFormEconomic.js';
import { FamilyFormDataCollector } from './family-form/FamilyFormDataCollector.js';
import { FamilyFormLoader } from './family-form/FamilyFormLoader.js';

const MODULE_NAME = 'FamilyFormController';

class FamilyFormController extends BaseController {
    constructor() {
        super('familyForm');
        this.familyService = new FamilyService();
        this.personService = new PersonService();
        this.isEditMode = false;
        this.currentFamilyId = null;

        // Compose helper classes
        this.validator = new FamilyFormValidator(this);
        this.formatter = new FamilyFormFormatter(this);
        this.economic = new FamilyFormEconomic(this);
        this.dataCollector = new FamilyFormDataCollector(this);
        this.loader = new FamilyFormLoader(this);
    }

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
            this.loader.loadFamilyData(familyId);
        }

        // 🔐 3. Setup form — delegasi ke helper
        this.setupEventListeners();
        this.validator.setupRealtimeValidation();
        this.formatter.setupAutoFormat();
        this.economic.setupRealtimeCalculation();
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

    async handleSubmit(event) {
        event.preventDefault();
        Logger.info(MODULE_NAME, 'Submit form dimulai');
        this.clearAllFieldErrors();

        const isValid = await this.validator.validateAllFields();
        if (!isValid) {
            this.showAlert('Mohon periksa kembali field yang ditandai merah', 'warning');
            const firstError = this.rootElement.querySelector('.is-invalid');
            if (firstError) this.scrollToField(firstError.id);
            return;
        }

        const formData = this.dataCollector.collectFormData();
        this.showLoading(true);

        try {
            if (this.isEditMode) {
                await this.familyService.updateFamily(this.currentFamilyId, formData.familyData, formData.namaKepalaKeluarga);
                this.showAlert('Data keluarga berhasil diperbarui', 'success');
            } else {
                // Step 1: Buat keluarga
                const { familyId } = await this.familyService.createFamily(
                    formData.familyData,
                    null,
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

                // Step 4: Simpan data ekonomi
                if (formData.economicData && formData.economicData.periode) {
                    await this.familyService.saveEconomicAssessment(familyId, formData.economicData);
                    Logger.info(MODULE_NAME, 'Data ekonomi berhasil disimpan', { familyId });
                }

                this.showAlert('Data keluarga dan ekonomi berhasil disimpan!', 'success', 0);
                setTimeout(() => {
                    window.location.href = `/family-form.html?id=${familyId}`;
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
}

document.addEventListener('DOMContentLoaded', async () => {
    const controller = new FamilyFormController();
    await controller.init();
    window.familyFormController = controller;
    console.log('✅ FamilyFormController dimuat');
});