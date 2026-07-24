/**
 * ProgramService - Logika bisnis untuk program bantuan (misal: Tebus Sembako Murah).
 *
 * TUGAS UTAMA:
 * - Kelola program (create, update status)
 * - Assign peserta (Mustahiq/Donatur) dengan validasi kuota
 * - Generate kode voucher unik
 */
import { ProgramRepository } from '../repositories/ProgramRepository.js';
import { ProgramParticipantRepository } from '../repositories/ProgramParticipantRepository.js';
import { ProgramModel } from '../models/ProgramModel.js';
import { ProgramParticipantModel } from '../models/ProgramParticipantModel.js';
import { AppError } from '../core/AppError.js';
import { Logger } from '../core/Logger.js';

const MODULE_NAME = 'ProgramService';

export class ProgramService {
    constructor() {
        this.programRepo = new ProgramRepository();
        this.participantRepo = new ProgramParticipantRepository();
    }

    /**
     * Buat program baru.
     *
     * @param {Object} programData - Data program (sesuai ProgramModel)
     * @returns {Promise<string>} ID program yang dibuat
     */
    async createProgram(programData) {
        try {
            Logger.info(MODULE_NAME, 'Membuat program baru', { nama: programData.nama });

            // Validasi model
            const programModel = new ProgramModel(programData);
            const validationErrors = programModel.validate();
            if (validationErrors.length > 0) {
                throw new AppError(
                    `Validasi program gagal: ${validationErrors.join(', ')}`,
                    MODULE_NAME,
                    'VALIDATION_FAILED'
                );
            }

            const programId = await this.programRepo.create(programModel);
            Logger.info(MODULE_NAME, `Program berhasil dibuat`, { programId });
            return programId;
        } catch (error) {
            throw this._handleError(error, 'createProgram');
        }
    }

    /**
     * Assign peserta ke program (Mustahiq atau Donatur).
     *
     * VALIDASI KUOTA: Cek apakah kuota masih tersedia sebelum assign.
     *
     * @param {string} programId - ID program
     * @param {string|null} familyId - ID keluarga (salah satu familyId/personId wajib)
     * @param {string|null} personId - ID person (salah satu familyId/personId wajib)
     * @param {string} peran - 'mustahiq' atau 'donatur'
     * @param {number} jumlahSembako - Jumlah paket sembako (default: 1)
     * @returns {Promise<{participantId: string, kodeVoucher: string}>}
     */
    async assignParticipant(programId, familyId = null, personId = null, peran = 'mustahiq', jumlahSembako = 1) {
        try {
            Logger.info(MODULE_NAME, `Assign peserta ke program ${programId}`, {
                familyId,
                personId,
                peran
            });

            // Validasi: minimal salah satu familyId atau personId
            if (!familyId && !personId) {
                throw new AppError(
                    'Minimal family_id atau person_id harus diisi',
                    MODULE_NAME,
                    'MISSING_TARGET'
                );
            }

            // Ambil data program
            const program = await this.programRepo.getById(programId);
            if (!program) {
                throw new AppError(
                    `Program ${programId} tidak ditemukan`,
                    MODULE_NAME,
                    'PROGRAM_NOT_FOUND'
                );
            }

            // Cek status program
            if (program.status !== 'berjalan') {
                throw new AppError(
                    `Program tidak sedang berjalan (status: ${program.status})`,
                    MODULE_NAME,
                    'PROGRAM_NOT_ACTIVE'
                );
            }

            // Cek kuota (hitung peserta existing)
            const existingParticipants = await this.participantRepo.findByProgramId(programId);
            const totalAssigned = existingParticipants.reduce((sum, p) => sum + p.jumlah_sembako, 0);

            if (totalAssigned + jumlahSembako > program.kuota) {
                throw new AppError(
                    `Kuota program tidak mencukupi. Tersisa: ${program.kuota - totalAssigned}, diminta: ${jumlahSembako}`,
                    MODULE_NAME,
                    'QUOTA_EXCEEDED'
                );
            }

            // Generate kode voucher unik
            const kodeVoucher = this.generateVoucherCode();

            // Buat participant
            const participantData = {
                program_id: programId,
                family_id: familyId,
                person_id: personId,
                peran: peran,
                status_pembayaran: 'belum',
                jumlah_sembako: jumlahSembako,
                kode_voucher: kodeVoucher,
                dibagikan_via_wa: false
            };

            const participantModel = new ProgramParticipantModel(participantData);
            const validationErrors = participantModel.validate();
            if (validationErrors.length > 0) {
                throw new AppError(
                    `Validasi peserta gagal: ${validationErrors.join(', ')}`,
                    MODULE_NAME,
                    'VALIDATION_FAILED'
                );
            }

            const participantId = await this.participantRepo.create(participantModel);
            Logger.info(MODULE_NAME, `Peserta berhasil diassign`, { participantId, kodeVoucher });

            return { participantId, kodeVoucher };
        } catch (error) {
            throw this._handleError(error, 'assignParticipant');
        }
    }

    /**
     * Generate kode voucher unik.
     * Format: VOUCHER-{TIMESTAMP}-{RANDOM4}
     * Contoh: VOUCHER-20260724153045-A7B2
     *
     * @returns {string} Kode voucher unik
     */
    generateVoucherCode() {
        const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `VOUCHER-${timestamp}-${random}`;
    }

    /**
     * Helper: bungkus error jadi AppError
     */
    _handleError(error, methodName) {
        if (error instanceof AppError) {
            return error;
        }
        return new AppError(
            `Gagal ${methodName}: ${error.message}`,
            MODULE_NAME,
            error.code || 'PROGRAM_SERVICE_ERROR',
            error
        );
    }
}