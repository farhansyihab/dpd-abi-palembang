/**
 * Validator - Kumpulan fungsi validasi format data.
 *
 * Kenapa static? Karena Validator tidak punya "state" — ia murni fungsi matematis/logis.
 * Cukup panggil Validator.isValidNIK(nik), tidak perlu new Validator().
 *
 * PENTING: Validator hanya cek FORMAT, bukan keberadaan data di database.
 * Contoh: isValidNIK cek "16 digit angka", BUKAN "NIK ini sudah terdaftar atau belum".
 * Cek keberadaan data adalah tugas Repository/Service.
 *
 * Analogi VB: Seperti modul berisi fungsi-fungsi IsNumeric, IsDate, dll.
 */
import { AppError } from '../core/AppError.js';
import { Logger } from '../core/Logger.js';

const MODULE_NAME = 'Validator';

export class Validator {
    /**
     * Cek apakah value tidak kosong (bukan null, undefined, atau string kosong setelah trim).
     *
     * @param {any} value - Nilai yang dicek
     * @param {string} fieldName - Nama field (untuk pesan error)
     * @throws {AppError} jika value kosong
     */
    static required(value, fieldName) {
        if (value === null || value === undefined) {
            throw new AppError(
                `${fieldName} wajib diisi`,
                MODULE_NAME,
                'REQUIRED_FIELD'
            );
        }
        if (typeof value === 'string' && value.trim() === '') {
            throw new AppError(
                `${fieldName} wajib diisi`,
                MODULE_NAME,
                'REQUIRED_FIELD'
            );
        }
    }

    /**
     * Cek format NIK: tepat 16 digit angka.
     *
     * Kenapa tidak cek ke Dukcapil? Sesuai Rancangan bagian 9 — cukup validasi format,
     * tanpa integrasi API resmi. Verifikasi keaslian dilakukan lewat formulir kertas.
     *
     * @param {string} nik - NIK yang akan divalidasi
     * @returns {boolean} true jika valid
     * @throws {AppError} jika format salah
     */
    static isValidNIK(nik) {
        if (typeof nik !== 'string') {
            throw new AppError('NIK harus berupa string', MODULE_NAME, 'INVALID_NIK_TYPE');
        }
        // Regex: tepat 16 digit, tidak boleh ada karakter lain
        const nikRegex = /^\d{16}$/;
        if (!nikRegex.test(nik)) {
            throw new AppError(
                `NIK harus tepat 16 digit angka (ditemukan: ${nik.length} karakter)`,
                MODULE_NAME,
                'INVALID_NIK_FORMAT'
            );
        }
        return true;
    }

    /**
     * Cek format No. KK: tepat 16 digit angka.
     *
     * @param {string} noKK - No. KK yang akan divalidasi
     * @returns {boolean} true jika valid
     * @throws {AppError} jika format salah
     */
    static isValidNoKK(noKK) {
        if (typeof noKK !== 'string') {
            throw new AppError('No. KK harus berupa string', MODULE_NAME, 'INVALID_NOKK_TYPE');
        }
        const noKKRegex = /^\d{16}$/;
        if (!noKKRegex.test(noKK)) {
            throw new AppError(
                `No. KK harus tepat 16 digit angka (ditemukan: ${noKK.length} karakter)`,
                MODULE_NAME,
                'INVALID_NOKK_FORMAT'
            );
        }
        return true;
    }

    /**
     * Cek format nomor HP Indonesia.
     * Menerima format: 08xxxxxxxxxx, +628xxxxxxxxx, atau 628xxxxxxxxx
     * Total digit setelah kode negara: 9-13 digit (fleksibel untuk berbagai operator).
     *
     * @param {string} phone - Nomor HP yang akan divalidasi
     * @returns {boolean} true jika valid
     * @throws {AppError} jika format salah
     */
    static isValidPhone(phone) {
        if (typeof phone !== 'string') {
            throw new AppError('Nomor HP harus berupa string', MODULE_NAME, 'INVALID_PHONE_TYPE');
        }
        // Normalisasi: hapus spasi, strip, tanda kurung
        const cleaned = phone.replace(/[\s\-\(\)]/g, '');
        // Pola: 08xxx (10-13 digit total) ATAU +628xxx / 628xxx (11-14 digit total)
        const phoneRegex = /^(^08\d{8,11}$)|(^\+628\d{8,11}$)|(^628\d{8,11}$)/;
        if (!phoneRegex.test(cleaned)) {
            throw new AppError(
                'Format nomor HP tidak valid. Gunakan: 08xxxxxxxxxx atau +628xxxxxxxxx',
                MODULE_NAME,
                'INVALID_PHONE_FORMAT'
            );
        }
        return true;
    }

    /**
     * Cek apakah string adalah email valid (format dasar).
     *
     * @param {string} email - Email yang akan divalidasi
     * @returns {boolean} true jika valid
     * @throws {AppError} jika format salah
     */
    static isValidEmail(email) {
        if (typeof email !== 'string') {
            throw new AppError('Email harus berupa string', MODULE_NAME, 'INVALID_EMAIL_TYPE');
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new AppError(
                'Format email tidak valid',
                MODULE_NAME,
                'INVALID_EMAIL_FORMAT'
            );
        }
        return true;
    }

    /**
     * Cek apakah nilai adalah angka dalam rentang tertentu.
     *
     * @param {any} value - Nilai yang dicek
     * @param {string} fieldName - Nama field (untuk pesan error)
     * @param {number} min - Nilai minimum (inklusif)
     * @param {number} max - Nilai maksimum (inklusif)
     * @returns {boolean} true jika valid
     * @throws {AppError} jika tidak valid
     */
    static isNumberInRange(value, fieldName, min = -Infinity, max = Infinity) {
        if (typeof value !== 'number' || isNaN(value)) {
            throw new AppError(
                `${fieldName} harus berupa angka`,
                MODULE_NAME,
                'INVALID_NUMBER'
            );
        }
        if (value < min || value > max) {
            throw new AppError(
                `${fieldName} harus antara ${min} dan ${max} (ditemukan: ${value})`,
                MODULE_NAME,
                'NUMBER_OUT_OF_RANGE'
            );
        }
        return true;
    }
}