/**
 * FamilyFormEconomic - Menangani kalkulasi ekonomi real-time dan pengumpulan data ekonomi.
 * 
 * TANGGUNG JAWAB:
 * - Setup event listener untuk kalkulasi real-time
 * - Update ringkasan total pengeluaran & selisih (surplus/defisit)
 * - Kumpulkan data ekonomi dari form (untuk submit)
 * 
 * REUSE:
 * - EconomicAssessmentModel untuk kalkulasi (calculateTotalPengeluaran, calculateSelisih)
 */
import { EconomicAssessmentModel } from '../../models/EconomicAssessmentModel.js';
import { Logger } from '../../core/Logger.js';
import { FamilyFormFormatter } from './FamilyFormFormatter.js';

const MODULE_NAME = 'FamilyFormEconomic';

export class FamilyFormEconomic {
    constructor(controller) {
        this.controller = controller;
    }

    /**
     * Setup event listener untuk kalkulasi real-time.
     */
    setupRealtimeCalculation() {
        const ecoInputs = document.querySelectorAll('.format-rupiah, #eco_total_pendapatan');
        ecoInputs.forEach(input => {
            input.addEventListener('input', () => this.updateEconomicSummary());
        });
    }

    /**
     * Update ringkasan pengeluaran & selisih secara real-time.
     */
    updateEconomicSummary() {
        try {
            const parseRupiah = (id) => FamilyFormFormatter.parseRupiah(this.controller.getFieldValue(id));

            const pengeluaran = {
                makan: parseRupiah('eco_pengeluaran_makan'),
                listrik_air: parseRupiah('eco_pengeluaran_listrik_air'),
                pendidikan: parseRupiah('eco_pengeluaran_pendidikan'),
                kesehatan: parseRupiah('eco_pengeluaran_kesehatan'),
                lainnya: parseRupiah('eco_pengeluaran_lainnya')
            };

            const totalPendapatan = parseRupiah('eco_total_pendapatan');

            // Reuse logic dari Model
            const tempModel = new EconomicAssessmentModel({
                total_pendapatan: totalPendapatan,
                pengeluaran: pengeluaran
            });

            const totalPengeluaran = tempModel.calculateTotalPengeluaran();
            const selisih = tempModel.calculateSelisih();

            // Update UI
            const formatCurrency = (num) => new Intl.NumberFormat('id-ID', {
                style: 'currency', currency: 'IDR', minimumFractionDigits: 0
            }).format(num);

            document.getElementById('summary_total_pengeluaran').textContent = formatCurrency(totalPengeluaran);

            const selisihEl = document.getElementById('summary_selisih');
            selisihEl.textContent = formatCurrency(selisih);

            // Ubah warna berdasarkan surplus/defisit
            if (selisih >= 0) {
                selisihEl.className = 'fs-5 fw-bold text-success';
                selisihEl.textContent += ' (Surplus)';
            } else {
                selisihEl.className = 'fs-5 fw-bold text-danger';
                selisihEl.textContent += ' (Defisit)';
            }

        } catch (error) {
            Logger.warn(MODULE_NAME, 'Gagal kalkulasi real-time', error);
        }
    }

    /**
     * Kumpulkan data ekonomi dari form.
     * @returns {Object} Data ekonomi siap simpan
     */
    collectEconomicData() {
        const parseRupiah = (id) => FamilyFormFormatter.parseRupiah(this.controller.getFieldValue(id));

        const pengeluaran = {
            makan: parseRupiah('eco_pengeluaran_makan'),
            listrik_air: parseRupiah('eco_pengeluaran_listrik_air'),
            pendidikan: parseRupiah('eco_pengeluaran_pendidikan'),
            kesehatan: parseRupiah('eco_pengeluaran_kesehatan'),
            lainnya: parseRupiah('eco_pengeluaran_lainnya')
        };

        const aset = {
            motor: document.getElementById('aset_motor').checked,
            mobil: document.getElementById('aset_mobil').checked,
            kulkas: document.getElementById('aset_kulkas').checked,
            tv: document.getElementById('aset_tv').checked,
            tanah: document.getElementById('aset_tanah').checked
        };

        const penerimaBantuan = [];
        ['bantuan_pkh', 'bantuan_bpnt', 'bantuan_pbi', 'bantuan_kip', 'bantuan_lainnya'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el.checked) {
                penerimaBantuan.push(el.value);
            }
        });

        return {
            periode: this.controller.getFieldValue('eco_periode'),
            total_pendapatan: parseRupiah('eco_total_pendapatan'),
            sumber_pendapatan_utama: this.controller.getFieldValue('eco_sumber_pendapatan'),
            pengeluaran: pengeluaran,
            aset: aset,
            penerima_bantuan_pemerintah: penerimaBantuan
        };
    }
}