/**
 * ProgramParticipantModel - Representasi peserta dalam satu program.
 * 
 * Skema (dari Rancangan bagian 3.6):
 * {
 *   program_id: string,
 *   family_id: string | null,
 *   person_id: string | null,     // salah satu wajib diisi
 *   peran: "mustahiq" | "donatur",
 *   status_pembayaran: "belum" | "lunas" | "batal",
 *   jumlah_sembako: number,
 *   kode_voucher: string,
 *   dibagikan_via_wa: boolean
 * }
 */
export class ProgramParticipantModel {
    constructor(data = {}) {
        this.id = data.id || null;
        this.program_id = data.program_id || null;
        this.family_id = data.family_id || null;
        this.person_id = data.person_id || null;
        this.peran = data.peran || 'mustahiq';
        this.status_pembayaran = data.status_pembayaran || 'belum';

        // PERBAIKAN: Gunakan typeof agar nilai 0 tidak tertimpa oleh default 1
        this.jumlah_sembako = typeof data.jumlah_sembako === 'number' ? data.jumlah_sembako : 1;

        this.kode_voucher = data.kode_voucher || '';
        this.dibagikan_via_wa = typeof data.dibagikan_via_wa === 'boolean' ? data.dibagikan_via_wa : false;
        this.created_at = data.created_at || null;
        this.created_by = data.created_by || null;
    }

    validate() {
        const errors = [];
        if (!this.program_id) errors.push('Program ID wajib diisi');

        // Validasi: minimal salah satu family_id atau person_id harus ada
        if (!this.family_id && !this.person_id) {
            errors.push('Minimal family_id atau person_id harus diisi');
        }

        const peranValid = ['mustahiq', 'donatur'];
        if (!peranValid.includes(this.peran)) errors.push(`Peran "${this.peran}" tidak valid`);

        const statusValid = ['belum', 'lunas', 'batal'];
        if (!statusValid.includes(this.status_pembayaran)) errors.push(`Status pembayaran "${this.status_pembayaran}" tidak valid`);

        if (typeof this.jumlah_sembako !== 'number' || this.jumlah_sembako <= 0) {
            errors.push('Jumlah sembako harus angka lebih dari 0');
        }

        return errors;
    }

    static fromFirestore(docSnap) {
        const data = docSnap.data();
        return new ProgramParticipantModel({ id: docSnap.id, ...data });
    }

    toFirestore() {
        return {
            program_id: this.program_id,
            family_id: this.family_id,
            person_id: this.person_id,
            peran: this.peran,
            status_pembayaran: this.status_pembayaran,
            jumlah_sembako: this.jumlah_sembako,
            kode_voucher: this.kode_voucher,
            dibagikan_via_wa: this.dibagikan_via_wa
        };
    }
}