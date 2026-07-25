/**
 * FamilyFormValidator - Menangani semua validasi form keluarga.
 * 
 * TANGGUNG JAWAB:
 * - Validasi format (NIK 16 digit, No. KK 16 digit)
 * - Validasi duplikasi ke database (cek via Repository)
 * - Validasi field wajib
 * - Orkestrasi validasi keseluruhan (validateAllFields)
 * 
 * AKSES:
 * - Controller (untuk getFieldError, showFieldError, familyService, personService, isEditMode)
 * - Validator (untuk cek format)
 */
import { Validator } from '../../services/Validator.js';
import { Logger } from '../../core/Logger.js';

const MODULE_NAME = 'FamilyFormValidator';

export class FamilyFormValidator {
    /**
     * @param {FamilyFormController} controller - Reference ke controller utama
     */
    constructor(controller) {
        this.controller = controller;
    }

    /**
     * Setup event listener validasi real-time untuk semua field.
     */
    setupRealtimeValidation() {
        const noKKField = document.getElementById('no_kk');
        noKKField.addEventListener('blur', () => this.validateNoKK());
        noKKField.addEventListener('input', () => this.controller.clearFieldError('no_kk'));

        const nikField = document.getElementById('nik_kepala_keluarga');
        nikField.addEventListener('blur', () => this.validateNIK());
        nikField.addEventListener('input', () => this.controller.clearFieldError('nik_kepala_keluarga'));

        const requiredFields = [
            'nama_kepala_keluarga', 'alamat_jalan', 'alamat_rt', 'alamat_rw',
            'alamat_kelurahan', 'alamat_kecamatan',
            'eco_periode', 'eco_sumber_pendapatan', 'eco_total_pendapatan'
        ];
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('blur', () => this.validateRequired(fieldId));
                field.addEventListener('input', () => this.controller.clearFieldError(fieldId));
            }
        });
    }

    async validateNoKK() {
        const field = document.getElementById('no_kk');
        const value = field.value.trim();
        this.controller.clearFieldError('no_kk');

        if (value === '') {
            this.controller.showFieldError('no_kk', 'Nomor KK wajib diisi');
            return false;
        }

        try {
            Validator.isValidNoKK(value);
        } catch (error) {
            this.controller.showFieldError('no_kk', error.message);
            return false;
        }

        // Cek duplikasi (hanya di mode create)
        if (!this.controller.isEditMode) {
            try {
                const existingFamily = await this.controller.familyService.familyRepo.findByNoKK(value);
                if (existingFamily) {
                    this.controller.showFieldError('no_kk', `No. KK ${value} sudah terdaftar`);
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
        this.controller.clearFieldError('nik_kepala_keluarga');

        if (value === '') {
            this.controller.showFieldError('nik_kepala_keluarga', 'NIK Kepala Keluarga wajib diisi');
            return false;
        }

        try {
            Validator.isValidNIK(value);
        } catch (error) {
            this.controller.showFieldError('nik_kepala_keluarga', error.message);
            return false;
        }

        if (!this.controller.isEditMode) {
            try {
                const existingPerson = await this.controller.personService.personRepo.findByNIK(value);
                if (existingPerson) {
                    this.controller.showFieldError('nik_kepala_keluarga', `NIK ${value} sudah terdaftar atas nama: ${existingPerson.nama}`);
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
        this.controller.clearFieldError(fieldId);

        if (value === '') {
            const fieldName = field.previousElementSibling?.textContent?.replace(' *', '') || fieldId;
            this.controller.showFieldError(fieldId, `${fieldName} wajib diisi`);
            return false;
        }

        field.classList.add('is-valid');
        return true;
    }

    async validateAllFields() {
        let isValid = true;
        if (!await this.validateNoKK()) isValid = false;
        if (!await this.validateNIK()) isValid = false;

        const requiredFields = [
            'nama_kepala_keluarga', 'alamat_jalan', 'alamat_rt', 'alamat_rw',
            'alamat_kelurahan', 'alamat_kecamatan',
            'eco_periode', 'eco_sumber_pendapatan', 'eco_total_pendapatan'
        ];
        for (const fieldId of requiredFields) {
            if (!this.validateRequired(fieldId)) isValid = false;
        }
        return isValid;
    }
}