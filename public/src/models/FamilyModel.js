/**
 * FamilyModel - Representasi data keluarga (1 KK / rumah tangga).
 * Model ini bertanggung jawab untuk:
 * - Validasi field
 * - Konversi dari/to format Firestore
 * - Business logic sederhana (misal: generate search fields)
 * 
 * Analogi VB: Seperti Class Module yang mendefinisikan struktur data dan validasinya.
 */

export class FamilyModel {
    /**
     * @param {Object} data - Data keluarga
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.no_kk = data.no_kk || '';
        this.kepala_keluarga_person_id = data.kepala_keluarga_person_id || null;
        this.alamat = data.alamat || {
            jalan: '',
            rt: '',
            rw: '',
            kelurahan: '',
            kecamatan: '',
            kota: 'Palembang',
            koordinat: null
        };
        this.status_kepemilikan_rumah = data.status_kepemilikan_rumah || 'milik_sendiri';
        this.kondisi_rumah = data.kondisi_rumah || 'permanen';
        this.akses_air_bersih = data.akses_air_bersih || 'pdam';
        this.status_bantuan = data.status_bantuan || 'belum_ditentukan';
        this.status_bantuan_updated_at = data.status_bantuan_updated_at || null;
        this.status_bantuan_updated_by = data.status_bantuan_updated_by || null;
        this.search_name_lower = data.search_name_lower || '';
        this.search_address_lower = data.search_address_lower || '';
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

        if (!this.no_kk || this.no_kk.length !== 16) {
            errors.push('No. KK harus 16 digit');
        }

        if (!this.alamat.jalan) {
            errors.push('Alamat jalan wajib diisi');
        }

        if (!this.alamat.rt || !this.alamat.rw) {
            errors.push('RT dan RW wajib diisi');
        }

        if (!this.alamat.kelurahan) {
            errors.push('Kelurahan wajib diisi');
        }

        if (!this.alamat.kecamatan) {
            errors.push('Kecamatan wajib diisi');
        }

        const statusKepemilikanValid = ['milik_sendiri', 'kontrak', 'menumpang'];
        if (!statusKepemilikanValid.includes(this.status_kepemilikan_rumah)) {
            errors.push('Status kepemilikan rumah tidak valid');
        }

        const kondisiRumahValid = ['permanen', 'semi_permanen', 'tidak_permanen'];
        if (!kondisiRumahValid.includes(this.kondisi_rumah)) {
            errors.push('Kondisi rumah tidak valid');
        }

        const aksesAirValid = ['pdam', 'sumur', 'lainnya'];
        if (!aksesAirValid.includes(this.akses_air_bersih)) {
            errors.push('Akses air bersih tidak valid');
        }

        const statusBantuanValid = ['mustahiq', 'donatur', 'belum_ditentukan'];
        if (!statusBantuanValid.includes(this.status_bantuan)) {
            errors.push('Status bantuan tidak valid');
        }

        return errors;
    }

    /**
     * Konversi dari format Firestore ke Model instance
     * @param {Object} docSnap - Firestore document snapshot
     * @returns {FamilyModel}
     */
    static fromFirestore(docSnap) {
        const data = docSnap.data();
        return new FamilyModel({
            id: docSnap.id,
            ...data
        });
    }

    /**
     * Konversi dari Model ke format Firestore
     * @returns {Object}
     */
    toFirestore() {
        return {
            no_kk: this.no_kk,
            kepala_keluarga_person_id: this.kepala_keluarga_person_id,
            alamat: this.alamat,
            status_kepemilikan_rumah: this.status_kepemilikan_rumah,
            kondisi_rumah: this.kondisi_rumah,
            akses_air_bersih: this.akses_air_bersih,
            status_bantuan: this.status_bantuan,
            status_bantuan_updated_at: this.status_bantuan_updated_at,
            status_bantuan_updated_by: this.status_bantuan_updated_by,
            search_name_lower: this.search_name_lower,
            search_address_lower: this.search_address_lower
        };
    }

    /**
     * Generate field pencarian (lowercase) dari nama kepala keluarga dan alamat
     * Dipanggil sebelum simpan ke Firestore
     * @param {string} namaKepalaKeluarga - Nama kepala keluarga
     */
    generateSearchFields(namaKepalaKeluarga) {
        this.search_name_lower = (namaKepalaKeluarga || '').toLowerCase();

        const alamatParts = [
            this.alamat.jalan,
            this.alamat.rt,
            this.alamat.rw,
            this.alamat.kelurahan,
            this.alamat.kecamatan
        ].filter(part => part);

        this.search_address_lower = alamatParts.join(' ').toLowerCase();
    }
}