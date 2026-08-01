/**
 * FamilyFormLoader - Menangani load data keluarga untuk mode edit.
 * 
 * TANGGUNG JAWAB:
 * - Load data Family + Kepala Keluarga + Economic Assessment dari database
 * - Populate semua field form dengan data yang dimuat
 * - Trigger kalkulasi awal setelah data dimuat
 */
import { Logger } from '../../core/Logger.js';
import { FamilyFormFormatter } from './FamilyFormFormatter.js';

const MODULE_NAME = 'FamilyFormLoader';

export class FamilyFormLoader {
    constructor(controller) {
        this.controller = controller;
    }

    /**
     * Load data keluarga dari database dan populate ke form.
     * @param {string} familyId - ID keluarga yang akan dimuat
     */
    async loadFamilyData(familyId) {
        Logger.info(MODULE_NAME, `Load data keluarga ${familyId} untuk mode edit`);
        this.controller.showLoading(true);

        try {
            const { family, latestAssessment } = await this.controller.familyService.getFamilyDetail(familyId);

            // Populate Bagian A: Data Keluarga
            this.controller.setFieldValue('no_kk', family.no_kk);
            this.controller.setFieldValue('alamat_jalan', family.alamat.jalan);
            this.controller.setFieldValue('alamat_rt', family.alamat.rt);
            this.controller.setFieldValue('alamat_rw', family.alamat.rw);
            this.controller.setFieldValue('alamat_kelurahan', family.alamat.kelurahan);
            this.controller.setFieldValue('alamat_kecamatan', family.alamat.kecamatan);
            this.controller.setFieldValue('alamat_kota', family.alamat.kota);
            this.controller.setFieldValue('status_kepemilikan_rumah', family.status_kepemilikan_rumah);
            this.controller.setFieldValue('kondisi_rumah', family.kondisi_rumah);
            this.controller.setFieldValue('akses_air_bersih', family.akses_air_bersih);

            // Populate Kepala Keluarga
            if (family.kepala_keluarga_person_id) {
                const persons = await this.controller.personService.getPersonsByFamily(familyId);
                const kepalaKeluarga = persons.find(p => p.hubungan_dlm_keluarga === 'kepala_keluarga');
                if (kepalaKeluarga) {
                    this.controller.kepalaKeluargaPersonId = kepalaKeluarga.id; // 🆕
                    this.controller.setFieldValue('nama_kepala_keluarga', kepalaKeluarga.nama);
                    this.controller.setFieldValue('nik_kepala_keluarga', kepalaKeluarga.nik);
                    this.controller.setFieldValue('tempat_lahir_kk', kepalaKeluarga.tempat_lahir);
                    this.controller.setFieldValue('tanggal_lahir_kk', kepalaKeluarga.tanggal_lahir);
                    this.controller.setFieldValue('jenis_kelamin_kk', kepalaKeluarga.jenis_kelamin);
                    this.controller.setFieldValue('pendidikan_kk', kepalaKeluarga.pendidikan_terakhir);
                    this.controller.setFieldValue('pekerjaan_kk', kepalaKeluarga.pekerjaan);
                    this.controller.setFieldValue('penghasilan_kk', FamilyFormFormatter.formatRupiah(kepalaKeluarga.penghasilan_bulan));
                    this.controller.setFieldValue('status_abi_kk', kepalaKeluarga.status_abi);
                }
            }

            // Populate Bagian C: Data Ekonomi
            if (latestAssessment) {
                this.controller.currentAssessmentId = latestAssessment.id;           // 🆕
                this.controller.currentAssessmentPeriode = latestAssessment.periode; // 🆕                
                this.controller.setFieldValue('eco_periode', latestAssessment.periode);
                this.controller.setFieldValue('eco_sumber_pendapatan', latestAssessment.sumber_pendapatan_utama);
                this.controller.setFieldValue('eco_total_pendapatan', FamilyFormFormatter.formatRupiah(latestAssessment.total_pendapatan));

                this.controller.setFieldValue('eco_pengeluaran_makan', FamilyFormFormatter.formatRupiah(latestAssessment.pengeluaran.makan));
                this.controller.setFieldValue('eco_pengeluaran_listrik_air', FamilyFormFormatter.formatRupiah(latestAssessment.pengeluaran.listrik_air));
                this.controller.setFieldValue('eco_pengeluaran_pendidikan', FamilyFormFormatter.formatRupiah(latestAssessment.pengeluaran.pendidikan));
                this.controller.setFieldValue('eco_pengeluaran_kesehatan', FamilyFormFormatter.formatRupiah(latestAssessment.pengeluaran.kesehatan));
                this.controller.setFieldValue('eco_pengeluaran_lainnya', FamilyFormFormatter.formatRupiah(latestAssessment.pengeluaran.lainnya));

                if (latestAssessment.aset) {
                    document.getElementById('aset_motor').checked = latestAssessment.aset.motor;
                    document.getElementById('aset_mobil').checked = latestAssessment.aset.mobil;
                    document.getElementById('aset_kulkas').checked = latestAssessment.aset.kulkas;
                    document.getElementById('aset_tv').checked = latestAssessment.aset.tv;
                    document.getElementById('aset_tanah').checked = latestAssessment.aset.tanah;
                }

                if (latestAssessment.penerima_bantuan_pemerintah) {
                    latestAssessment.penerima_bantuan_pemerintah.forEach(bantuan => {
                        const el = document.querySelector(`input[name^="bantuan_"][value="${bantuan}"]`);
                        if (el) el.checked = true;
                    });
                }

                // Trigger kalkulasi awal
                this.controller.economic.updateEconomicSummary();
            }

            Logger.info(MODULE_NAME, 'Data keluarga berhasil dimuat untuk edit');
        } catch (error) {
            this.controller.showError(error, 'Gagal memuat data keluarga');
            Logger.error(MODULE_NAME, 'Load data keluarga gagal', error);
        } finally {
            this.controller.showLoading(false);
        }
    }
}