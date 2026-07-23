/**
 * EconomicAssessmentRepository - Repository khusus untuk collection 'economic_assessments'.
 * Mewarisi BaseRepository dan menambahkan method spesifik untuk snapshot ekonomi keluarga.
 *
 * Analogi VB: Seperti Class yang inherit dari base class, lalu tambah method untuk
 * ambil "snapshot terbaru" atau "riwayat lengkap" per keluarga.
 *
 * CATATAN PENTING: Collection ini menyimpan HISTORI (tidak overwrite).
 * Setiap survei = 1 dokumen baru dengan periode berbeda.
 */
import { BaseRepository } from './BaseRepository.js';
import { EconomicAssessmentModel } from '../models/EconomicAssessmentModel.js';
import { query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Logger } from '../core/Logger.js';

export class EconomicAssessmentRepository extends BaseRepository {
    constructor() {
        super('economic_assessments', EconomicAssessmentModel);
    }

    /**
     * Cari semua snapshot ekonomi untuk satu keluarga (riwayat lengkap).
     * Diurutkan berdasarkan periode (descending) supaya yang terbaru muncul di atas.
     *
     * @param {string} familyId - ID keluarga
     * @returns {Promise<Array<EconomicAssessmentModel>>}
     */
    async findByFamilyId(familyId) {
        try {
            Logger.info('EconomicAssessmentRepository', `Mencari riwayat ekonomi untuk keluarga ${familyId}`);

            // Query manual karena butuh orderBy + where (butuh composite index kalau ada error)
            const q = query(
                this.collectionRef,
                where('family_id', '==', familyId),
                orderBy('periode', 'desc')
            );
            const querySnapshot = await getDocs(q);

            const results = [];
            querySnapshot.forEach((docSnap) => {
                results.push(EconomicAssessmentModel.fromFirestore(docSnap));
            });

            Logger.info('EconomicAssessmentRepository', `Ditemukan ${results.length} snapshot untuk keluarga ${familyId}`);
            return results;
        } catch (error) {
            throw this.handleError(error, 'findByFamilyId');
        }
    }

    /**
     * Cari snapshot ekonomi TERBARU untuk satu keluarga.
     * Dipakai di halaman detail keluarga untuk menampilkan "kondisi ekonomi saat ini".
     *
     * @param {string} familyId - ID keluarga
     * @returns {Promise<EconomicAssessmentModel|null>}
     */
    async findLatestByFamilyId(familyId) {
        try {
            Logger.info('EconomicAssessmentRepository', `Mencari snapshot terbaru untuk keluarga ${familyId}`);

            // Ambil hanya 1 dokumen terbaru (limit 1) — sangat efisien
            const q = query(
                this.collectionRef,
                where('family_id', '==', familyId),
                orderBy('periode', 'desc'),
                limit(1)
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                Logger.warn('EconomicAssessmentRepository', `Belum ada snapshot ekonomi untuk keluarga ${familyId}`);
                return null;
            }

            const latest = EconomicAssessmentModel.fromFirestore(querySnapshot.docs[0]);
            Logger.info('EconomicAssessmentRepository', `Snapshot terbaru ditemukan`, {
                familyId,
                periode: latest.periode,
                id: latest.id
            });
            return latest;
        } catch (error) {
            throw this.handleError(error, 'findLatestByFamilyId');
        }
    }

    /**
     * Cek apakah sudah ada snapshot untuk periode tertentu (cegah duplikasi).
     *
     * @param {string} familyId - ID keluarga
     * @param {string} periode - Periode (misal: "2026-S1")
     * @returns {Promise<EconomicAssessmentModel|null>}
     */
    async findByFamilyIdAndPeriode(familyId, periode) {
        try {
            Logger.info('EconomicAssessmentRepository', `Cek snapshot untuk keluarga ${familyId} periode ${periode}`);

            const results = await this.query([
                ['family_id', '==', familyId],
                ['periode', '==', periode]
            ]);

            if (results.length === 0) {
                return null;
            }
            return results[0];
        } catch (error) {
            throw this.handleError(error, 'findByFamilyIdAndPeriode');
        }
    }
}