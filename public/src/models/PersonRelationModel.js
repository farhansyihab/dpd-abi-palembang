/**
 * PersonRelationModel - Representasi relasi antar-person yang TIDAK selalu searah KK.
 * 
 * Kenapa dipisah dari Person? Karena relasi seperti "paman-keponakan beda KK",
 * "kakek-cucu beda rumah", dst. tidak bisa direpresentasikan dengan field
 * hubungan_dlm_keluarga di PersonModel (yang hanya untuk relasi dalam 1 KK).
 * 
 * Analogi VB: Seperti Class Module untuk tabel relasi many-to-many di database relasional.
 * 
 * Skema (dari Rancangan bagian 3.3):
 * {
 *   person_id: string,
 *   related_person_id: string,
 *   tipe_relasi: "anak" | "orang_tua" | "saudara" | "paman_bibi" | "keponakan" | "lainnya"
 * }
 */
export class PersonRelationModel {
    /**
     * @param {Object} data - Data relasi
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.person_id = data.person_id || null;
        this.related_person_id = data.related_person_id || null;
        this.tipe_relasi = data.tipe_relasi || 'lainnya';
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    /**
     * Validasi field-field wajib
     * @returns {Array<string>} Array error messages (kosong jika valid)
     */
    validate() {
        const errors = [];

        if (!this.person_id) {
            errors.push('Person ID wajib diisi');
        }
        if (!this.related_person_id) {
            errors.push('Related Person ID wajib diisi');
        }
        if (this.person_id && this.related_person_id && this.person_id === this.related_person_id) {
            errors.push('Person tidak bisa berelasi dengan dirinya sendiri');
        }

        const tipeRelasiValid = [
            'anak',
            'orang_tua',
            'saudara',
            'paman_bibi',
            'keponakan',
            'lainnya'
        ];
        if (!tipeRelasiValid.includes(this.tipe_relasi)) {
            errors.push(`Tipe relasi "${this.tipe_relasi}" tidak valid. Pilih: ${tipeRelasiValid.join(', ')}`);
        }

        return errors;
    }

    /**
     * Konversi dari format Firestore ke Model instance
     * @param {Object} docSnap - Firestore document snapshot
     * @returns {PersonRelationModel}
     */
    static fromFirestore(docSnap) {
        const data = docSnap.data();
        return new PersonRelationModel({
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
            person_id: this.person_id,
            related_person_id: this.related_person_id,
            tipe_relasi: this.tipe_relasi
        };
    }
}