/**
 * UserModel - Representasi data 4 anggota tim inti.
 * 
 * Skema (dari Rancangan bagian 3.8):
 * {
 *   email: string,
 *   nama: string,           // "Ketua", "Sekretaris", "Bendahara", "Pelaksana Harian"
 *   is_active: boolean
 * }
 * Catatan: Document ID di Firestore biasanya adalah UID dari Firebase Auth.
 */
export class UserModel {
    constructor(data = {}) {
        this.id = data.id || null; // Biasanya sama dengan Firebase Auth UID
        this.email = data.email || '';
        this.nama = data.nama || '';

        // PERBAIKAN: Jika undefined, default true. Jika ada nilainya (meski salah tipe), biarkan saja agar validator bisa menolaknya.
        this.is_active = data.is_active !== undefined ? data.is_active : true;

        this.created_at = data.created_at || null;
    }

    validate() {
        const errors = [];
        if (!this.email || !this.email.includes('@')) {
            errors.push('Email wajib diisi dan harus format email yang valid');
        }
        if (!this.nama || this.nama.trim() === '') {
            errors.push('Nama/Jabatan wajib diisi');
        }
        if (typeof this.is_active !== 'boolean') {
            errors.push('is_active harus bernilai boolean (true/false)');
        }

        return errors;
    }

    static fromFirestore(docSnap) {
        const data = docSnap.data();
        return new UserModel({
            id: docSnap.id,
            ...data
        });
    }

    toFirestore() {
        return {
            email: this.email,
            nama: this.nama,
            is_active: this.is_active
        };
    }
}