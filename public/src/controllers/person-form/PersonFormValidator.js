import { Validator } from '../../services/Validator.js';

export class PersonFormValidator {
    constructor(modalManager) {
        this.modalManager = modalManager;
    }

    setupRealtimeValidation() {
        const nikField = document.getElementById('modal_nik');
        nikField.addEventListener('blur', () => this.validateNIK());
        nikField.addEventListener('input', () => this.clearError('modal_nik'));

        const namaField = document.getElementById('modal_nama');
        namaField.addEventListener('blur', () => this.validateRequired('modal_nama', 'Nama'));
        namaField.addEventListener('input', () => this.clearError('modal_nama'));
    }

    async validateNIK() {
        const fieldId = 'modal_nik';
        const value = document.getElementById(fieldId).value.trim();
        this.clearError(fieldId);

        if (!value) {
            this.showError(fieldId, 'NIK wajib diisi');
            return false;
        }

        try {
            Validator.isValidNIK(value);
        } catch (error) {
            this.showError(fieldId, error.message);
            return false;
        }

        // Cek duplikasi (kecuali mode edit dan NIK tidak berubah)
        const currentPersonId = document.getElementById('modal_person_id').value;
        try {
            const existing = await this.modalManager.controller.personService.personRepo.findByNIK(value);
            if (existing && existing.id !== currentPersonId) {
                this.showError(fieldId, `NIK sudah terdaftar atas nama: ${existing.nama}`);
                return false;
            }
        } catch (error) {
            console.warn('Gagal cek duplikasi NIK', error);
        }

        return true;
    }

    validateRequired(fieldId, fieldName) {
        const value = document.getElementById(fieldId).value.trim();
        this.clearError(fieldId);
        if (!value) {
            this.showError(fieldId, `${fieldName} wajib diisi`);
            return false;
        }
        return true;
    }

    async validateModalForm() {
        let isValid = true;
        if (!await this.validateNIK()) isValid = false;
        if (!this.validateRequired('modal_nama', 'Nama')) isValid = false;
        if (!this.validateRequired('modal_hubungan', 'Hubungan')) isValid = false;
        if (!this.validateRequired('modal_jenis_kelamin', 'Jenis Kelamin')) isValid = false;
        return isValid;
    }

    showError(fieldId, message) {
        const field = document.getElementById(fieldId);
        field.classList.add('is-invalid');
        const feedback = field.parentElement.querySelector('.invalid-feedback');
        if (feedback) feedback.textContent = message;
    }

    clearError(fieldId) {
        const field = document.getElementById(fieldId);
        field.classList.remove('is-invalid');
    }
}