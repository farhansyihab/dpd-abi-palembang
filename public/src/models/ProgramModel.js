/**
 * ProgramModel - Representasi program bantuan (misal: "Tebus Sembako Murah").
 * 
 * Skema (dari Rancangan bagian 3.5):
 * {
 *   nama: string,
 *   periode: string,               // "Batch Juli 2026"
 *   deskripsi: string,
 *   harga_normal: number,
 *   harga_mustahiq: number,
 *   kuota: number,
 *   status: "draft" | "berjalan" | "selesai"
 * }
 */
export class ProgramModel {
    constructor(data = {}) {
        this.id = data.id || null;
        this.nama = data.nama || '';
        this.periode = data.periode || '';
        this.deskripsi = data.deskripsi || '';
        this.harga_normal = data.harga_normal || 0;
        this.harga_mustahiq = data.harga_mustahiq || 0;
        this.kuota = data.kuota || 0;
        this.status = data.status || 'draft';
        this.created_at = data.created_at || null;
        this.created_by = data.created_by || null;
    }

    validate() {
        const errors = [];
        if (!this.nama || this.nama.trim() === '') errors.push('Nama program wajib diisi');
        if (!this.periode || this.periode.trim() === '') errors.push('Periode program wajib diisi');
        if (typeof this.harga_normal !== 'number' || this.harga_normal < 0) errors.push('Harga normal harus angka tidak negatif');
        if (typeof this.harga_mustahiq !== 'number' || this.harga_mustahiq < 0) errors.push('Harga mustahiq harus angka tidak negatif');
        if (typeof this.kuota !== 'number' || this.kuota <= 0) errors.push('Kuota harus angka lebih dari 0');

        const statusValid = ['draft', 'berjalan', 'selesai'];
        if (!statusValid.includes(this.status)) {
            errors.push(`Status "${this.status}" tidak valid. Pilih: ${statusValid.join(', ')}`);
        }
        return errors;
    }

    static fromFirestore(docSnap) {
        const data = docSnap.data();
        return new ProgramModel({ id: docSnap.id, ...data });
    }

    toFirestore() {
        return {
            nama: this.nama,
            periode: this.periode,
            deskripsi: this.deskripsi,
            harga_normal: this.harga_normal,
            harga_mustahiq: this.harga_mustahiq,
            kuota: this.kuota,
            status: this.status
        };
    }
}