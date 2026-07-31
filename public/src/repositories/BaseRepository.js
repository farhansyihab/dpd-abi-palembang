/**
 * BaseRepository - Repository generik yang menyediakan operasi CRUD dasar.
 * Semua repository turunan mewarisi class ini untuk menghindari duplikasi kode.
 * 
 * Analogi VB: Seperti class base yang menyediakan method umum, lalu diturunkan ke class spesifik.
 * Analogi Design Pattern: Repository Pattern - memisahkan logika akses data dari business logic.
 * 
 * Kenapa class ini penting?
 * - Tidak perlu tulis ulang kode Firestore untuk setiap collection
 * - Error handling konsisten di semua repository
 * - Kalau ada perubahan cara akses data, cukup ubah di sini saja
 */
import { db } from '../config/FirebaseConfig.js';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { AppError } from '../core/AppError.js';
import { Logger } from '../core/Logger.js';

export class BaseRepository {
    /**
     * @param {string} collectionName - Nama collection di Firestore (misal: 'families', 'persons')
     * @param {Function} ModelClass - Class model untuk konversi data (misal: FamilyModel, PersonModel)
     */
    constructor(collectionName, ModelClass) {
        this.collectionName = collectionName;
        this.ModelClass = ModelClass;
        this.db = db;
        this.collectionRef = collection(this.db, this.collectionName);
    }

    /**
     * Buat dokumen baru di collection
     * @param {Object} data - Data yang akan disimpan (akan divalidasi oleh Model)
     * @returns {Promise<string>} ID dokumen yang baru dibuat
     */
    async create(data) {
        try {
            Logger.info(this.constructor.name, `Membuat dokumen baru di ${this.collectionName}`);

            // Validasi data menggunakan Model
            const modelInstance = new this.ModelClass(data);
            const validationErrors = modelInstance.validate();
            if (validationErrors.length > 0) {
                throw new AppError(
                    `Validasi gagal: ${validationErrors.join(', ')}`,
                    this.constructor.name,
                    'VALIDATION_FAILED'
                );
            }

            // Konversi ke format Firestore
            const firestoreData = modelInstance.toFirestore();

            // Tambah metadata
            firestoreData.created_at = new Date();
            firestoreData.updated_at = new Date();

            // Simpan ke Firestore
            const docRef = await addDoc(this.collectionRef, firestoreData);

            Logger.info(this.constructor.name, `Dokumen berhasil dibuat`, { id: docRef.id });
            return docRef.id;
        } catch (error) {
            throw this.handleError(error, 'create');
        }
    }

    /**
     * Ambil dokumen berdasarkan ID
     * @param {string} id - ID dokumen
     * @returns {Promise<Object|null>} Instance Model atau null jika tidak ditemukan
     */
    async getById(id) {
        try {
            Logger.info(this.constructor.name, `Mengambil dokumen ${id} dari ${this.collectionName}`);

            const docRef = doc(this.db, this.collectionName, id);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                Logger.warn(this.constructor.name, `Dokumen ${id} tidak ditemukan`);
                return null;
            }

            // Konversi dari format Firestore ke Model
            const modelInstance = this.ModelClass.fromFirestore(docSnap);
            Logger.info(this.constructor.name, `Dokumen berhasil diambil`, { id });
            return modelInstance;
        } catch (error) {
            throw this.handleError(error, 'getById');
        }
    }

    /**
     * Update dokumen yang sudah ada
     * @param {string} id - ID dokumen
     * @param {Object} data - Data yang akan diupdate (hanya field yang diubah)
     */
    async update(id, data) {
        try {
            Logger.info(this.constructor.name, `Mengupdate dokumen ${id} di ${this.collectionName}`);

            const docRef = doc(this.db, this.collectionName, id);

            // Tambah metadata update
            data.updated_at = new Date();

            await updateDoc(docRef, data);

            Logger.info(this.constructor.name, `Dokumen berhasil diupdate`, { id });
        } catch (error) {
            throw this.handleError(error, 'update');
        }
    }

    /**
     * Hapus dokumen
     * @param {string} id - ID dokumen
     */
    async delete(id) {
        try {
            Logger.info(this.constructor.name, `Menghapus dokumen ${id} dari ${this.collectionName}`);

            const docRef = doc(this.db, this.collectionName, id);
            await deleteDoc(docRef);

            Logger.info(this.constructor.name, `Dokumen berhasil dihapus`, { id });
        } catch (error) {
            throw this.handleError(error, 'delete');
        }
    }

    /**
     * Ambil semua dokumen (dengan limit opsional)
     * @param {number} maxResults - Batas jumlah dokumen (default: 100)
     * @returns {Promise<Array>} Array of Model instances
     */
    async list(maxResults = 100) {
        try {
            Logger.info(this.constructor.name, `Mengambil daftar dari ${this.collectionName}`);

            const q = query(this.collectionRef, limit(maxResults));
            const querySnapshot = await getDocs(q);

            const results = [];
            querySnapshot.forEach((docSnap) => {
                results.push(this.ModelClass.fromFirestore(docSnap));
            });

            Logger.info(this.constructor.name, `Berhasil mengambil ${results.length} dokumen`);
            return results;
        } catch (error) {
            throw this.handleError(error, 'list');
        }
    }

    /**
     * Query dengan kondisi spesifik
     * @param {Array} conditions - Array kondisi [field, operator, value]
     * @param {string} orderByField - Field untuk sorting (opsional)
     * @param {string} orderDirection - 'asc' atau 'desc' (default: 'asc')
     * @param {number} maxResults - Batas jumlah dokumen (default: 100)
     * @returns {Promise<Array>} Array of Model instances
     */
    async query(conditions = [], orderByField = null, orderDirection = 'asc', maxResults = 100) {
        try {
            Logger.info(this.constructor.name, `Query di ${this.collectionName}`, { conditions });

            let q = this.collectionRef;

            // Tambahkan kondisi where
            conditions.forEach(([field, operator, value]) => {
                q = query(q, where(field, operator, value));
            });

            // Tambahkan ordering jika ada
            if (orderByField) {
                q = query(q, orderBy(orderByField, orderDirection));
            }

            // Tambahkan limit
            q = query(q, limit(maxResults));

            const querySnapshot = await getDocs(q);

            const results = [];
            querySnapshot.forEach((docSnap) => {
                results.push(this.ModelClass.fromFirestore(docSnap));
            });

            Logger.info(this.constructor.name, `Query berhasil, ditemukan ${results.length} dokumen`);
            return results;
        } catch (error) {
            throw this.handleError(error, 'query');
        }
    }

    /**
     * Set dokumen dengan ID spesifik (Digunakan untuk Restore Data)
     * @param {string} id - ID dokumen asli
     * @param {Object} data - Data plain object (sudah dalam format Firestore)
     */
    async setWithId(id, data) {
        try {
            const docRef = doc(this.db, this.collectionName, id);
            // Kita tidak pakai Model validation di sini karena data sudah valid dari backup
            await setDoc(docRef, data, { merge: true });
            Logger.info(this.constructor.name, `Dokumen di-restore dengan ID: ${id}`);
        } catch (error) {
            throw this.handleError(error, 'setWithId');
        }
    }

    /**
     * Handle error dan bungkus jadi AppError yang informatif
     * @param {Error} error - Error asli
     * @param {string} method - Nama method yang error
     * @returns {AppError}
     */
    handleError(error, method) {
        if (error instanceof AppError) {
            return error; // Sudah AppError, tidak perlu dibungkus lagi
        }

        return new AppError(
            `Gagal ${method} di ${this.collectionName}: ${error.message}`,
            this.constructor.name,
            error.code || 'FIRESTORE_ERROR',
            error
        );
    }
}