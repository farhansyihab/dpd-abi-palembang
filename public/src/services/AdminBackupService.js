/**
 * AdminBackupService - Menangani ekspor dan impor data seluruh sistem.
 * 
 * TUGAS:
 * - Mengambil semua data dari 9 collection via Repository.
 * - Mengonversi Model instances kembali ke plain object + ID untuk JSON.
 * - Mengirim plain object + ID kembali ke Repository untuk di-restore.
 */
import { FamilyRepository } from '../repositories/FamilyRepository.js';
import { PersonRepository } from '../repositories/PersonRepository.js';
import { PersonRelationRepository } from '../repositories/PersonRelationRepository.js';
import { EconomicAssessmentRepository } from '../repositories/EconomicAssessmentRepository.js';
import { ProgramRepository } from '../repositories/ProgramRepository.js';
import { ProgramParticipantRepository } from '../repositories/ProgramParticipantRepository.js';
import { StatusHistoryRepository } from '../repositories/StatusHistoryRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { Logger } from '../core/Logger.js';
import { AppError } from '../core/AppError.js';

const MODULE_NAME = 'AdminBackupService';
const ADMIN_EMAIL = 'agiptek@gmail.com'; // Hardcoded sesuai permintaan

export class AdminBackupService {
    constructor() {
        this.familyRepo = new FamilyRepository();
        this.personRepo = new PersonRepository();
        this.relationRepo = new PersonRelationRepository();
        this.economicRepo = new EconomicAssessmentRepository();
        this.programRepo = new ProgramRepository();
        this.participantRepo = new ProgramParticipantRepository();
        this.historyRepo = new StatusHistoryRepository();
        this.userRepo = new UserRepository();
    }

    /**
     * Ekspor semua data ke format JSON
     */
    async exportAllData() {
        try {
            Logger.info(MODULE_NAME, 'Memulai proses backup data...');

            // Helper untuk convert Model array ke plain object array + id
            const toPlain = (models) => models.map(m => ({ id: m.id, ...m.toFirestore() }));

            const backupData = {
                metadata: {
                    exportedAt: new Date().toISOString(),
                    exportedBy: ADMIN_EMAIL,
                    version: '1.0'
                },
                families: toPlain(await this.familyRepo.list(10000)),
                persons: toPlain(await this.personRepo.list(10000)),
                person_relations: toPlain(await this.relationRepo.list(10000)),
                economic_assessments: toPlain(await this.economicRepo.list(10000)),
                programs: toPlain(await this.programRepo.list(10000)),
                program_participants: toPlain(await this.participantRepo.list(10000)),
                status_history: toPlain(await this.historyRepo.list(10000)),
                users: toPlain(await this.userRepo.list(10000))
                // authorized_emails tidak di-backup via sini untuk keamanan, 
                // atau bisa ditambahkan jika diinginkan.
            };

            Logger.info(MODULE_NAME, 'Backup data berhasil dikumpulkan');
            return backupData;
        } catch (error) {
            throw new AppError(`Gagal ekspor data: ${error.message}`, MODULE_NAME, 'EXPORT_FAILED', error);
        }
    }

    /**
     * Restore data dari objek JSON
     * @param {Object} jsonData - Data hasil parse file JSON
     */
    async importAllData(jsonData) {
        try {
            Logger.info(MODULE_NAME, 'Memulai proses restore data...');

            if (!jsonData || !jsonData.metadata) {
                throw new AppError('Format file backup tidak valid', MODULE_NAME, 'INVALID_BACKUP_FORMAT');
            }

            // Helper untuk restore per collection
            const restoreCollection = async (repo, dataArray, collectionName) => {
                if (!dataArray || dataArray.length === 0) return 0;
                let successCount = 0;
                for (const item of dataArray) {
                    const { id, ...data } = item; // Pisahkan ID dari data
                    await repo.setWithId(id, data);
                    successCount++;
                }
                Logger.info(MODULE_NAME, `Restore ${collectionName} selesai: ${successCount} dokumen`);
                return successCount;
            };

            let totalRestored = 0;
            totalRestored += await restoreCollection(this.familyRepo, jsonData.families, 'families');
            totalRestored += await restoreCollection(this.personRepo, jsonData.persons, 'persons');
            totalRestored += await restoreCollection(this.relationRepo, jsonData.person_relations, 'person_relations');
            totalRestored += await restoreCollection(this.economicRepo, jsonData.economic_assessments, 'economic_assessments');
            totalRestored += await restoreCollection(this.programRepo, jsonData.programs, 'programs');
            totalRestored += await restoreCollection(this.participantRepo, jsonData.program_participants, 'program_participants');
            totalRestored += await restoreCollection(this.historyRepo, jsonData.status_history, 'status_history');
            totalRestored += await restoreCollection(this.userRepo, jsonData.users, 'users');

            Logger.info(MODULE_NAME, `Proses restore selesai. Total ${totalRestored} dokumen.`);
            return totalRestored;
        } catch (error) {
            throw new AppError(`Gagal restore data: ${error.message}`, MODULE_NAME, 'IMPORT_FAILED', error);
        }
    }
}