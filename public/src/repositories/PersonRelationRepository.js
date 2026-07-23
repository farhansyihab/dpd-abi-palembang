/**
 * PersonRelationRepository - Repository khusus untuk collection 'person_relations'.
 * Mewarisi BaseRepository dan menambahkan method spesifik untuk relasi antar-person.
 *
 * Analogi VB: Seperti Class yang inherit dari base class, lalu tambah method spesifik
 * untuk query relasi (misal: "siapa saja yang berelasi dengan person X?").
 */
import { BaseRepository } from './BaseRepository.js';
import { PersonRelationModel } from '../models/PersonRelationModel.js';
import { Logger } from '../core/Logger.js';

export class PersonRelationRepository extends BaseRepository {
    constructor() {
        super('person_relations', PersonRelationModel);
    }

    /**
     * Cari semua relasi yang melibatkan person tertentu (baik sebagai sumber maupun target).
     * Dipakai di halaman detail person untuk menampilkan "siapa terhubung ke siapa".
     *
     * @param {string} personId - ID person
     * @returns {Promise<Array<PersonRelationModel>>}
     */
    async findByPersonId(personId) {
        try {
            Logger.info('PersonRelationRepository', `Mencari relasi untuk person ${personId}`);

            // Firestore tidak support OR query langsung, jadi kita ambil 2 query lalu gabungkan.
            // Untuk skala ratusan-relasi per person, ini masih sangat ringan.
            const asSource = await this.query([['person_id', '==', personId]]);
            const asTarget = await this.query([['related_person_id', '==', personId]]);

            // Gabungkan & hilangkan duplikat (kalau ada relasi bolak-balik yang tercatat 2x)
            const combined = new Map();
            [...asSource, ...asTarget].forEach(rel => {
                combined.set(rel.id, rel);
            });

            const results = Array.from(combined.values());
            Logger.info('PersonRelationRepository', `Ditemukan ${results.length} relasi untuk person ${personId}`);
            return results;
        } catch (error) {
            throw this.handleError(error, 'findByPersonId');
        }
    }

    /**
     * Cari relasi spesifik antara 2 person (cek apakah sudah ada relasi tercatat).
     * Berguna untuk mencegah duplikasi entri relasi saat input.
     *
     * @param {string} personId - ID person pertama
     * @param {string} relatedPersonId - ID person kedua
     * @returns {Promise<PersonRelationModel|null>}
     */
    async findBetween(personId, relatedPersonId) {
        try {
            Logger.info('PersonRelationRepository', `Cek relasi antara ${personId} dan ${relatedPersonId}`);

            // Cek kedua arah (A→B dan B→A) karena relasi bisa tercatat dari sisi mana saja
            const results = await this.query([['person_id', '==', personId]]);
            const found = results.find(r => r.related_person_id === relatedPersonId);

            if (!found) {
                Logger.warn('PersonRelationRepository', `Relasi antara ${personId} dan ${relatedPersonId} tidak ditemukan`);
                return null;
            }
            return found;
        } catch (error) {
            throw this.handleError(error, 'findBetween');
        }
    }

    /**
     * Hapus semua relasi yang melibatkan person tertentu.
     * Dipanggil saat person dihapus atau ditandai is_active=false (opsional, tergantung kebijakan).
     *
     * @param {string} personId - ID person
     * @returns {Promise<number>} Jumlah relasi yang dihapus
     */
    async deleteByPersonId(personId) {
        try {
            Logger.info('PersonRelationRepository', `Menghapus semua relasi untuk person ${personId}`);

            const allRelations = await this.findByPersonId(personId);
            let deletedCount = 0;

            for (const rel of allRelations) {
                await this.delete(rel.id);
                deletedCount++;
            }

            Logger.info('PersonRelationRepository', `Berhasil menghapus ${deletedCount} relasi untuk person ${personId}`);
            return deletedCount;
        } catch (error) {
            throw this.handleError(error, 'deleteByPersonId');
        }
    }
}