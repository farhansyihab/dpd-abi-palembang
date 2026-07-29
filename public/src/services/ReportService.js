import { FamilyRepository } from '../repositories/FamilyRepository.js';
import { PersonRepository } from '../repositories/PersonRepository.js';
import { AppError } from '../core/AppError.js';
import { Logger } from '../core/Logger.js';

const MODULE_NAME = 'ReportService';

export class ReportService {
    constructor() {
        this.familyRepo = new FamilyRepository();
        this.personRepo = new PersonRepository();
    }

    /**
     * Mengambil data keluarga beserta anggotanya, siap untuk dirender ke tabel.
     * @returns {Promise<Array<{family: Object, persons: Array}>>}
     */
    async getEnrichedReportData() {
        try {
            Logger.info(MODULE_NAME, 'Memulai pengambilan data untuk laporan PDF');

            // 1. Ambil semua keluarga (aktif)
            const families = await this.familyRepo.list(10000);
            const reportData = [];

            for (const family of families) {
                // 2. Ambil semua person dalam keluarga ini
                const persons = await this.personRepo.findByFamilyId(family.id);

                // 3. Filter hanya yang aktif
                const activePersons = persons.filter(p => p.is_active !== false);
                if (activePersons.length === 0) continue;

                // 4. SORTING: Kepala Keluarga HARUS selalu di indeks 0 (baris pertama)
                activePersons.sort((a, b) => {
                    if (a.hubungan_dlm_keluarga === 'kepala_keluarga') return -1;
                    if (b.hubungan_dlm_keluarga === 'kepala_keluarga') return 1;
                    // Jika bukan KK, urutkan berdasarkan nama
                    return a.nama.localeCompare(b.nama);
                });

                reportData.push({
                    family,
                    persons: activePersons
                });
            }

            Logger.info(MODULE_NAME, `Berhasil menyiapkan data untuk ${reportData.length} keluarga`);
            return reportData;

        } catch (error) {
            throw new AppError(
                `Gagal mengambil data laporan: ${error.message}`,
                MODULE_NAME,
                'REPORT_DATA_FETCH_FAILED',
                error
            );
        }
    }
}