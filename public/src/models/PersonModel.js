/**
 * PersonModel - Representasi data individu (anggota keluarga).
 * Model ini bertanggung jawab untuk:
 * - Validasi field (NIK, nama, dll)
 * - Konversi dari/to format Firestore
 * - Hitung usia dari tanggal lahir
 * 
 * Analogi VB: Seperti Class Module untuk data person dengan method validasi dan kalkulasi.
 */

export class PersonModel {
    /**
     * @param {Object} data - Data person
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.family_id = data.family_id || null;
        this.nik = data.nik || '';
        this.nama = data.nama || '';
        this.nama_lower = data.nama_lower || '';
        this.tempat_lahir = data.tempat_lahir || '';
        this.tanggal_lahir = data.tanggal_lahir || null;
        this.usia = data.usia || null;
        this.jenis_kelamin = data.jenis_kelamin || 'L';
        this.hubungan_dlm_keluarga = data.hubungan_dlm_keluarga || 'lainnya';
        this.pendidikan_terakhir = data.pendidikan_terakhir || '';
        this.pekerjaan = data.pekerjaan || '';
        this.penghasilan_bulan = data.penghasilan_bulan || 0;
        this.penghasilan_bracket = data.penghasilan_bracket || '<1jt';
        this.status_abi = data.status_abi || 'simpatisan';
        this.kaderisasi = data.kaderisasi || [];
        this.is_independent = data.is_independent || false;
        this.is_active = data.is_active !== undefined ? data.is_active : true;
        this.catatan = data.catatan || '';
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
        this.created_by = data.created_by || null;
        this.updated_by = data.updated_by || null;
    }

    /**
     * Validasi field-field wajib
     * @returns {Array<string>} Array error messages (kosong jika valid)
     */
    validate() {
        const errors = [];

        if (!this.nik || this.nik.length !== 16) {
            errors.push('NIK harus 16 digit');
        }

        if (!this.nama) {
            errors.push('Nama wajib diisi');
        }

        if (!this.family_id) {
            errors.push('Family ID wajib diisi');
        }

        const jenisKelaminValid = ['L', 'P'];
        if (!jenisKelaminValid.includes(this.jenis_kelamin)) {
            errors.push('Jenis kelamin tidak valid');
        }

        const hubunganValid = ['kepala_keluarga', 'istri', 'anak', 'lainnya'];
        if (!hubunganValid.includes(this.hubungan_dlm_keluarga)) {
            errors.push('Hubungan dalam keluarga tidak valid');
        }

        const statusAbiValid = ['simpatisan', 'anggota', 'kader'];
        if (!statusAbiValid.includes(this.status_abi)) {
            errors.push('Status ABI tidak valid');
        }

        if (!Array.isArray(this.kaderisasi)) {
            errors.push('Kaderisasi harus berupa array');
        }

        return errors;
    }

    /**
     * Hitung usia dari tanggal lahir
     * @returns {number} Usia dalam tahun
     */
    calculateAge() {
        if (!this.tanggal_lahir) return null;

        const today = new Date();
        const birthDate = this.tanggal_lahir instanceof Date
            ? this.tanggal_lahir
            : new Date(this.tanggal_lahir);

        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        return age;
    }

    /**
     * Tentukan bracket penghasilan dari angka
     * @returns {string} Bracket penghasilan
     */
    determinePenghasilanBracket() {
        if (this.penghasilan_bulan < 1000000) return '<1jt';
        if (this.penghasilan_bulan < 2000000) return '1-2jt';
        if (this.penghasilan_bulan < 3000000) return '2-3jt';
        return '>3jt';
    }

    /**
     * Konversi dari format Firestore ke Model instance
     * @param {Object} docSnap - Firestore document snapshot
     * @returns {PersonModel}
     */
    static fromFirestore(docSnap) {
        const data = docSnap.data();
        return new PersonModel({
            id: docSnap.id,
            ...data
        });
    }

    /**
     * Konversi dari Model ke format Firestore
     * @returns {Object}
     */
    toFirestore() {
        // Hitung usia dan bracket sebelum simpan
        this.usia = this.calculateAge();
        this.penghasilan_bracket = this.determinePenghasilanBracket();
        this.nama_lower = this.nama.toLowerCase();

        return {
            family_id: this.family_id,
            nik: this.nik,
            nama: this.nama,
            nama_lower: this.nama_lower,
            tempat_lahir: this.tempat_lahir,
            tanggal_lahir: this.tanggal_lahir,
            usia: this.usia,
            jenis_kelamin: this.jenis_kelamin,
            hubungan_dlm_keluarga: this.hubungan_dlm_keluarga,
            pendidikan_terakhir: this.pendidikan_terakhir,
            pekerjaan: this.pekerjaan,
            penghasilan_bulan: this.penghasilan_bulan,
            penghasilan_bracket: this.penghasilan_bracket,
            status_abi: this.status_abi,
            kaderisasi: this.kaderisasi,
            is_independent: this.is_independent,
            is_active: this.is_active,
            catatan: this.catatan
        };
    }
}