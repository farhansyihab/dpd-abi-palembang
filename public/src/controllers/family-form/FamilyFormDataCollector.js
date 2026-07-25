/**
 * FamilyFormDataCollector - Mengumpulkan semua data dari DOM form.
 * 
 * TANGGUNG JAWAB:
 * - Kumpulkan data Kepala Keluarga (NIK, nama, TTL, dll)
 * - Kumpulkan data Keluarga (No. KK, alamat, kondisi rumah)
 * - Delegasi pengumpulan data ekonomi ke FamilyFormEconomic
 * - Return object terstruktur siap submit
 */
import { FamilyFormFormatter } from './FamilyFormFormatter.js';

export class FamilyFormDataCollector {
    constructor(controller) {
        this.controller = controller;
    }

    /**
     * Kumpulkan semua data form.
     * @returns {Object} { namaKepalaKeluarga, kepalaKeluargaData, familyData, economicData }
     */
    collectFormData() {
        const namaKepalaKeluarga = this.controller.getFieldValue('nama_kepala_keluarga');
        const penghasilan = FamilyFormFormatter.parseRupiah(this.controller.getFieldValue('penghasilan_kk'));

        const kepalaKeluargaData = {
            nik: this.controller.getFieldValue('nik_kepala_keluarga'),
            tempat_lahir: this.controller.getFieldValue('tempat_lahir_kk'),
            tanggal_lahir: this.controller.getFieldValue('tanggal_lahir_kk') || null,
            jenis_kelamin: this.controller.getFieldValue('jenis_kelamin_kk'),
            pendidikan: this.controller.getFieldValue('pendidikan_kk'),
            pekerjaan: this.controller.getFieldValue('pekerjaan_kk'),
            penghasilan: penghasilan,
            status_abi: this.controller.getFieldValue('status_abi_kk')
        };

        const familyData = {
            no_kk: this.controller.getFieldValue('no_kk'),
            alamat: {
                jalan: this.controller.getFieldValue('alamat_jalan'),
                rt: this.controller.getFieldValue('alamat_rt'),
                rw: this.controller.getFieldValue('alamat_rw'),
                kelurahan: this.controller.getFieldValue('alamat_kelurahan'),
                kecamatan: this.controller.getFieldValue('alamat_kecamatan'),
                kota: this.controller.getFieldValue('alamat_kota')
            },
            status_kepemilikan_rumah: this.controller.getFieldValue('status_kepemilikan_rumah'),
            kondisi_rumah: this.controller.getFieldValue('kondisi_rumah'),
            akses_air_bersih: this.controller.getFieldValue('akses_air_bersih'),
            status_bantuan: 'belum_ditentukan'
        };

        // Delegasi ke FamilyFormEconomic
        const economicData = this.controller.economic.collectEconomicData();

        return {
            namaKepalaKeluarga,
            kepalaKeluargaData,
            familyData,
            economicData
        };
    }
}