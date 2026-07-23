/**
 * StatusHistoryModel - Log ringan tiap kali status_bantuan sebuah keluarga berubah.
 * 
 * Skema (dari Rancangan bagian 3.7):
 * {
 *   family_id: string,
 *   status_lama: "mustahiq" | "donatur" | "belum_ditentukan",
 *   status_baru: "mustahiq" | "donatur",
 *   tanggal: timestamp,
 *   dicatat_oleh_uid: string,
 *   catatan: string | null
 * }
 */
export class StatusHistoryModel {
    constructor(data = {}) {
        this.id = data.id || null;
        this.family_id = data.family_id || null;
        this.status_lama = data.status_lama || 'belum_ditentukan';
        this.status_baru = data.status_baru || 'mustahiq';
        this.tanggal = data.tanggal || null;
        this.dicatat_oleh_uid = data.dicatat_oleh_uid || null;
        this.catatan = data.catatan || null;
    }

    validate() {
        const errors = [];
        if (!this.family_id) errors.push('Family ID wajib diisi');

        // PERBAIKAN: status_lama boleh 3 opsi (termasuk belum_ditentukan)
        const statusLamaValid = ['mustahiq', 'donatur', 'belum_ditentukan'];
        if (!statusLamaValid.includes(this.status_lama)) {
            errors.push(`Status lama "${this.status_lama}" tidak valid. Pilih: ${statusLamaValid.join(', ')}`);
        }

        // PERBAIKAN: status_baru HANYA 2 opsi (sesuai Rancangan 3.7)
        const statusBaruValid = ['mustahiq', 'donatur'];
        if (!statusBaruValid.includes(this.status_baru)) {
            errors.push(`Status baru "${this.status_baru}" tidak valid. Pilih: ${statusBaruValid.join(', ')}`);
        }

        if (!this.dicatat_oleh_uid) {
            errors.push('UID pencatat (dicatat_oleh_uid) wajib diisi');
        }

        return errors;
    }

    static fromFirestore(docSnap) {
        const data = docSnap.data();
        return new StatusHistoryModel({
            id: docSnap.id,
            ...data
        });
    }

    toFirestore() {
        return {
            family_id: this.family_id,
            status_lama: this.status_lama,
            status_baru: this.status_baru,
            tanggal: this.tanggal || new Date(),
            dicatat_oleh_uid: this.dicatat_oleh_uid,
            catatan: this.catatan
        };
    }
}