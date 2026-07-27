/**
 * PersonService - Logika bisnis untuk data individu (anggota keluarga).
 *
 * TUGAS UTAMA:
 * - Orkestrasi PersonRepository + PersonRelationRepository
 * - Validasi NIK (format + cek duplikasi)
 * - Kelola relasi antar-person (linkRelation)
 */
import { PersonRepository } from '../repositories/PersonRepository.js';
import { PersonRelationRepository } from '../repositories/PersonRelationRepository.js';
import { PersonModel } from '../models/PersonModel.js';
import { PersonRelationModel } from '../models/PersonRelationModel.js';
import { Validator } from './Validator.js';
import { AppError } from '../core/AppError.js';
import { Logger } from '../core/Logger.js';

const MODULE_NAME = 'PersonService';

export class PersonService {
    constructor() {
        this.personRepo = new PersonRepository();
        this.relationRepo = new PersonRelationRepository();
    }

    /**
     * Buat person baru (anggota keluarga).
     *
     * @param {Object} personData - Data person (sesuai PersonModel)
     * @returns {Promise<string>} ID person yang dibuat
     */
    async createPerson(personData) {
        try {
            Logger.info(MODULE_NAME, 'Membuat person baru', { nik: personData.nik });

            // Validasi format NIK
            Validator.isValidNIK(personData.nik);

            // Cek duplikasi NIK
            const existingPerson = await this.personRepo.findByNIK(personData.nik);
            if (existingPerson) {
                throw new AppError(
                    `NIK ${personData.nik} sudah terdaftar atas nama: ${existingPerson.nama}`,
                    MODULE_NAME,
                    'DUPLICATE_NIK'
                );
            }

            // Validasi model
            const personModel = new PersonModel(personData);
            const validationErrors = personModel.validate();
            if (validationErrors.length > 0) {
                throw new AppError(
                    `Validasi person gagal: ${validationErrors.join(', ')}`,
                    MODULE_NAME,
                    'VALIDATION_FAILED'
                );
            }

            const personId = await this.personRepo.create(personModel);
            Logger.info(MODULE_NAME, `Person berhasil dibuat`, { personId });
            return personId;
        } catch (error) {
            throw this._handleError(error, 'createPerson');
        }
    }

    /**
     * Update data person.
     *
     * @param {string} personId - ID person
     * @param {Object} updateData - Data yang akan diupdate
     */
    async updatePerson(personId, updateData) {
        try {
            Logger.info(MODULE_NAME, `Mengupdate person ${personId}`);

            // Validasi NIK jika diupdate
            if (updateData.nik) {
                Validator.isValidNIK(updateData.nik);

                // Cek duplikasi (kecuali NIK sama dengan yang lama)
                const existingPerson = await this.personRepo.findByNIK(updateData.nik);
                if (existingPerson && existingPerson.id !== personId) {
                    throw new AppError(
                        `NIK ${updateData.nik} sudah digunakan oleh person lain`,
                        MODULE_NAME,
                        'DUPLICATE_NIK'
                    );
                }
            }

            await this.personRepo.update(personId, updateData);
            Logger.info(MODULE_NAME, `Person ${personId} berhasil diupdate`);
        } catch (error) {
            throw this._handleError(error, 'updatePerson');
        }
    }

    /**
     * Ambil semua anggota keluarga.
     *
     * @param {string} familyId - ID keluarga
     * @returns {Promise<PersonModel[]>}
     */
    async getPersonsByFamily(familyId) {
        try {
            Logger.info(MODULE_NAME, `Mengambil anggota keluarga ${familyId}`);
            const persons = await this.personRepo.findByFamilyId(familyId);
            Logger.info(MODULE_NAME, `Ditemukan ${persons.length} anggota`);
            return persons;
        } catch (error) {
            throw this._handleError(error, 'getPersonsByFamily');
        }
    }

    /**
     * Buat relasi antar-person (misal: paman-keponakan beda KK).
     *
     * @param {string} personId - ID person pertama
     * @param {string} relatedPersonId - ID person kedua
     * @param {string} tipeRelasi - Tipe relasi (anak, orang_tua, saudara, dll)
     * @returns {Promise<string>} ID relasi yang dibuat
     */
    async linkRelation(personId, relatedPersonId, tipeRelasi) {
        try {
            Logger.info(MODULE_NAME, `Membuat relasi ${personId} → ${relatedPersonId} (${tipeRelasi})`);

            // Validasi: tidak boleh relasi dengan diri sendiri
            if (personId === relatedPersonId) {
                throw new AppError(
                    'Person tidak bisa berelasi dengan dirinya sendiri',
                    MODULE_NAME,
                    'SELF_RELATION'
                );
            }

            // Cek duplikasi relasi
            const existing = await this.relationRepo.findBetween(personId, relatedPersonId);
            if (existing) {
                throw new AppError(
                    `Relasi antara ${personId} dan ${relatedPersonId} sudah ada (ID: ${existing.id})`,
                    MODULE_NAME,
                    'DUPLICATE_RELATION'
                );
            }

            // Validasi model
            const relationModel = new PersonRelationModel({
                person_id: personId,
                related_person_id: relatedPersonId,
                tipe_relasi: tipeRelasi
            });
            const validationErrors = relationModel.validate();
            if (validationErrors.length > 0) {
                throw new AppError(
                    `Validasi relasi gagal: ${validationErrors.join(', ')}`,
                    MODULE_NAME,
                    'VALIDATION_FAILED'
                );
            }

            const relationId = await this.relationRepo.create(relationModel);
            Logger.info(MODULE_NAME, `Relasi berhasil dibuat`, { relationId });
            return relationId;
        } catch (error) {
            throw this._handleError(error, 'linkRelation');
        }
    }

    /**
     * Ambil semua relasi yang melibatkan person tertentu.
     * Dipakai untuk menampilkan daftar relasi existing di UI.
     *
     * @param {string} personId - ID person
     * @returns {Promise<Array<{relation: PersonRelationModel, relatedPerson: PersonModel}>>}
     */
    async getRelationsForPerson(personId) {
        try {
            Logger.info(MODULE_NAME, `Mengambil relasi untuk person ${personId}`);
            const relations = await this.relationRepo.findByPersonId(personId);

            // Untuk setiap relasi, ambil data person terkait (target)
            const enrichedRelations = [];
            for (const rel of relations) {
                // Tentukan mana yang "target" (bukan personId yang sedang dilihat)
                const targetPersonId = rel.person_id === personId
                    ? rel.related_person_id
                    : rel.person_id;

                const targetPerson = await this.personRepo.getById(targetPersonId);

                enrichedRelations.push({
                    relation: rel,
                    relatedPerson: targetPerson,
                    direction: rel.person_id === personId ? 'source' : 'target'
                });
            }

            Logger.info(MODULE_NAME, `Ditemukan ${enrichedRelations.length} relasi untuk person ${personId}`);
            return enrichedRelations;
        } catch (error) {
            throw this._handleError(error, 'getRelationsForPerson');
        }
    }

    /**
     * 🆕 Hapus relasi berdasarkan ID.
     * @param {string} relationId - ID relasi yang akan dihapus
     */
    async deleteRelation(relationId) {
        try {
            Logger.info(MODULE_NAME, `Menghapus relasi ${relationId}`);
            await this.relationRepo.delete(relationId);
            Logger.info(MODULE_NAME, `Relasi ${relationId} berhasil dihapus`);
        } catch (error) {
            throw this._handleError(error, 'deleteRelation');
        }
    }

    /**
     * Cari person berdasarkan NIK (digunakan untuk mencari target relasi).
     *
     * @param {string} nik - NIK (16 digit)
     * @returns {Promise<PersonModel|null>}
     */
    async getPersonByNIK(nik) {
        try {
            Logger.info(MODULE_NAME, `Mencari person berdasarkan NIK: ${nik}`);
            Validator.isValidNIK(nik);
            const person = await this.personRepo.findByNIK(nik);
            return person;
        } catch (error) {
            throw this._handleError(error, 'getPersonByNIK');
        }
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
            error.code || 'PERSON_SERVICE_ERROR',
            error
        );
    }
}