/**
 * FamilyService - Logika bisnis untuk data keluarga.
 *
 * TUGAS UTAMA:
 * - Orkestrasi FamilyRepository + EconomicAssessmentRepository + StatusHistoryRepository
 * - Validasi lintas field (misal: No. KK tidak boleh duplikat)
 * - Menjamin atomicity untuk operasi multi-collection (changeStatus)
 *
 * ATURAN EMAS: Service TIDAK BOLEH import Firestore langsung.
 */
import { FamilyRepository } from '../repositories/FamilyRepository.js';
import { EconomicAssessmentRepository } from '../repositories/EconomicAssessmentRepository.js';
import { StatusHistoryRepository } from '../repositories/StatusHistoryRepository.js';
import { FamilyModel } from '../models/FamilyModel.js';
import { EconomicAssessmentModel } from '../models/EconomicAssessmentModel.js';
import { Validator } from './Validator.js';
import { AppError } from '../core/AppError.js';
import { Logger } from '../core/Logger.js';

const MODULE_NAME = 'FamilyService';

export class FamilyService {
    constructor() {
        this.familyRepo = new FamilyRepository();
        this.economicRepo = new EconomicAssessmentRepository();
        this.statusHistoryRepo = new StatusHistoryRepository();
    }

    /**
     * Buat keluarga baru + snapshot ekonomi awal (opsional).
     *
     * ALUR:
     * 1. Validasi No. KK (format + cek duplikasi)
     * 2. Generate search fields dari nama kepala keluarga
     * 3. Create family
     * 4. Jika ada data ekonomi, create economic assessment
     *
     * @param {Object} familyData - Data keluarga (sesuai FamilyModel)
     * @param {Object} economicData - Data ekonomi (opsional, sesuai EconomicAssessmentModel)
     * @param {string} namaKepalaKeluarga - Nama kepala keluarga (untuk search field)
     * @returns {Promise<{familyId: string, assessmentId: string|null}>}
     */
    async createFamily(familyData, economicData = null, namaKepalaKeluarga = '') {
        try {
            Logger.info(MODULE_NAME, 'Membuat keluarga baru', { no_kk: familyData.no_kk });

            // 1. Validasi format No. KK
            Validator.isValidNoKK(familyData.no_kk);

            // 2. Cek duplikasi No. KK
            const existingFamily = await this.familyRepo.findByNoKK(familyData.no_kk);
            if (existingFamily) {
                throw new AppError(
                    `No. KK ${familyData.no_kk} sudah terdaftar atas nama keluarga ID: ${existingFamily.id}`,
                    MODULE_NAME,
                    'DUPLICATE_NO_KK'
                );
            }

            // 3. Generate search fields
            const familyModel = new FamilyModel(familyData);
            familyModel.generateSearchFields(namaKepalaKeluarga);

            // Validasi model
            const validationErrors = familyModel.validate();
            if (validationErrors.length > 0) {
                throw new AppError(
                    `Validasi family gagal: ${validationErrors.join(', ')}`,
                    MODULE_NAME,
                    'VALIDATION_FAILED'
                );
            }

            // 4. Create family
            const familyId = await this.familyRepo.create(familyModel);
            Logger.info(MODULE_NAME, `Keluarga berhasil dibuat`, { familyId });

            // 5. Jika ada data ekonomi, buat snapshot awal
            let assessmentId = null;
            if (economicData) {
                assessmentId = await this.saveEconomicAssessment(familyId, economicData);
                Logger.info(MODULE_NAME, `Snapshot ekonomi awal dibuat`, { assessmentId });
            }

            return { familyId, assessmentId };
        } catch (error) {
            throw this._handleError(error, 'createFamily');
        }
    }

    /**
     * Update data keluarga.
     *
     * @param {string} familyId - ID keluarga
     * @param {Object} updateData - Data yang akan diupdate (hanya field yang berubah)
     * @param {string} namaKepalaKeluarga - Nama kepala keluarga (untuk regenerate search field, opsional)
     */
    async updateFamily(familyId, updateData, namaKepalaKeluarga = null) {
        try {
            Logger.info(MODULE_NAME, `Mengupdate keluarga ${familyId}`);

            // Validasi No. KK jika diupdate
            if (updateData.no_kk) {
                Validator.isValidNoKK(updateData.no_kk);

                // Cek duplikasi (kecuali No. KK sama dengan yang lama)
                const existingFamily = await this.familyRepo.findByNoKK(updateData.no_kk);
                if (existingFamily && existingFamily.id !== familyId) {
                    throw new AppError(
                        `No. KK ${updateData.no_kk} sudah digunakan oleh keluarga lain`,
                        MODULE_NAME,
                        'DUPLICATE_NO_KK'
                    );
                }
            }

            // Regenerate search fields jika nama kepala keluarga berubah
            if (namaKepalaKeluarga !== null) {
                const currentFamily = await this.familyRepo.getById(familyId);
                if (!currentFamily) {
                    throw new AppError(
                        `Keluarga ${familyId} tidak ditemukan`,
                        MODULE_NAME,
                        'FAMILY_NOT_FOUND'
                    );
                }
                currentFamily.generateSearchFields(namaKepalaKeluarga);
                updateData.search_name_lower = currentFamily.search_name_lower;
                updateData.search_address_lower = currentFamily.search_address_lower;
            }

            await this.familyRepo.update(familyId, updateData);
            Logger.info(MODULE_NAME, `Keluarga ${familyId} berhasil diupdate`);
        } catch (error) {
            throw this._handleError(error, 'updateFamily');
        }
    }

    /**
     * Simpan snapshot ekonomi keluarga untuk periode tertentu.
     *
     * PENTING: Collection economic_assessments adalah HISTORI (tidak overwrite).
     * Setiap survei = 1 dokumen baru dengan periode berbeda.
     * Method ini cek duplikasi periode untuk mencegah entry ganda.
     *
     * @param {string} familyId - ID keluarga
     * @param {Object} assessmentData - Data assessment (sesuai EconomicAssessmentModel)
     * @returns {Promise<string>} ID assessment yang dibuat
     */
    async saveEconomicAssessment(familyId, assessmentData) {
        try {
            Logger.info(MODULE_NAME, `Menyimpan snapshot ekonomi untuk keluarga ${familyId}`, {
                periode: assessmentData.periode
            });

            // Validasi format
            Validator.required(assessmentData.periode, 'Periode');

            // Cek duplikasi periode
            const existing = await this.economicRepo.findByFamilyIdAndPeriode(
                familyId,
                assessmentData.periode
            );
            if (existing) {
                throw new AppError(
                    `Snapshot ekonomi untuk periode ${assessmentData.periode} sudah ada (ID: ${existing.id}). Gunakan periode berbeda atau update yang existing.`,
                    MODULE_NAME,
                    'DUPLICATE_PERIODE'
                );
            }

            // Pastikan family_id ter-set
            assessmentData.family_id = familyId;

            // Validasi model
            const assessmentModel = new EconomicAssessmentModel(assessmentData);
            const validationErrors = assessmentModel.validate();
            if (validationErrors.length > 0) {
                throw new AppError(
                    `Validasi economic assessment gagal: ${validationErrors.join(', ')}`,
                    MODULE_NAME,
                    'VALIDATION_FAILED'
                );
            }

            const assessmentId = await this.economicRepo.create(assessmentModel);
            Logger.info(MODULE_NAME, `Snapshot ekonomi berhasil disimpan`, { assessmentId });
            return assessmentId;
        } catch (error) {
            throw this._handleError(error, 'saveEconomicAssessment');
        }
    }

    /**
     * Ubah status bantuan keluarga + catat di history (OPERASI MULTI-COLLECTION).
     *
     * INI METHOD KRITIS: harus menjamin kedua operasi berhasil atau tidak sama sekali.
     * Karena Firestore tidak support transaction lintas collection di client SDK
     * tanpa setup khusus, kita pakai pendekatan "best-effort with rollback":
     * - Update family dulu
     * - Jika add history gagal, log error tapi family sudah ter-update
     * - Controller/UI harus handle error ini dengan memberi warning ke user
     *
     * @param {string} familyId - ID keluarga
     * @param {string} newStatus - Status baru ('mustahiq' | 'donatur')
     * @param {string} uid - UID user yang melakukan perubahan
     * @param {string|null} catatan - Catatan opsional
     */
    async changeStatus(familyId, newStatus, uid, catatan = null) {
        try {
            Logger.info(MODULE_NAME, `Mengubah status keluarga ${familyId} ke ${newStatus}`);

            // Validasi status baru
            const validStatuses = ['mustahiq', 'donatur'];
            if (!validStatuses.includes(newStatus)) {
                throw new AppError(
                    `Status "${newStatus}" tidak valid. Pilih: ${validStatuses.join(', ')}`,
                    MODULE_NAME,
                    'INVALID_STATUS'
                );
            }

            // Ambil status lama
            const family = await this.familyRepo.getById(familyId);
            if (!family) {
                throw new AppError(
                    `Keluarga ${familyId} tidak ditemukan`,
                    MODULE_NAME,
                    'FAMILY_NOT_FOUND'
                );
            }
            const oldStatus = family.status_bantuan;

            // Jika status sama, tidak perlu doing anything
            if (oldStatus === newStatus) {
                Logger.info(MODULE_NAME, `Status sudah ${newStatus}, tidak ada perubahan`);
                return;
            }

            // Step 1: Update family
            await this.familyRepo.updateStatus(familyId, newStatus, uid);
            Logger.info(MODULE_NAME, `Status keluarga ${familyId} diupdate ke ${newStatus}`);

            // Step 2: Catat di history
            try {
                await this.statusHistoryRepo.addEntry(
                    familyId,
                    oldStatus,
                    newStatus,
                    uid,
                    catatan
                );
                Logger.info(MODULE_NAME, `Riwayat status berhasil dicatat`);
            } catch (historyError) {
                // CRITICAL: Family sudah ter-update, tapi history gagal
                // Log error tapi jangan rollback (risiko inkonsistensi lebih besar)
                Logger.error(
                    MODULE_NAME,
                    `GAGAL mencatat riwayat status untuk keluarga ${familyId}. Status family sudah berubah ke ${newStatus}, tapi history tidak tercatat.`,
                    historyError
                );
                // Lempar error ke caller dengan konteks lengkap
                throw new AppError(
                    `Status berhasil diubah ke ${newStatus}, TETAPI gagal mencatat riwayat. Silakan cek manual dan laporkan ke admin.`,
                    MODULE_NAME,
                    'STATUS_UPDATED_BUT_HISTORY_FAILED',
                    historyError
                );
            }
        } catch (error) {
            throw this._handleError(error, 'changeStatus');
        }
    }

    /**
     * Ambil detail lengkap keluarga: data keluarga + anggota + snapshot ekonomi terbaru.
     * Dipakai di halaman detail keluarga.
     *
     * @param {string} familyId - ID keluarga
     * @returns {Promise<{family: FamilyModel, latestAssessment: EconomicAssessmentModel|null}>}
     */
    async getFamilyDetail(familyId) {
        try {
            Logger.info(MODULE_NAME, `Mengambil detail keluarga ${familyId}`);

            const family = await this.familyRepo.getById(familyId);
            if (!family) {
                throw new AppError(
                    `Keluarga ${familyId} tidak ditemukan`,
                    MODULE_NAME,
                    'FAMILY_NOT_FOUND'
                );
            }

            const latestAssessment = await this.economicRepo.findLatestByFamilyId(familyId);

            Logger.info(MODULE_NAME, `Detail keluarga berhasil diambil`, {
                familyId,
                hasAssessment: latestAssessment !== null
            });

            return { family, latestAssessment };
        } catch (error) {
            throw this._handleError(error, 'getFamilyDetail');
        }
    }

    /**
     * Helper: bungkus error jadi AppError dengan konteks lengkap
     */
    _handleError(error, methodName) {
        if (error instanceof AppError) {
            return error;
        }
        return new AppError(
            `Gagal ${methodName}: ${error.message}`,
            MODULE_NAME,
            error.code || 'FAMILY_SERVICE_ERROR',
            error
        );
    }
}