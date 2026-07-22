/**
 * Logger - Pencatat aktivitas yang konsisten.
 * Analogi PHP: Seperti error_log() tapi dengan prefix [Module] di setiap baris.
 * 
 * Kenapa static method? Karena Logger tidak butuh "instance" (new Logger()).
 * Cukup panggil Logger.info(), Logger.error(), dst. langsung.
 * Mirip seperti Math.PI di VB - langsung pakai tanpa new Math().
 */
export class Logger {
  /**
   * Log informasi normal (warna default)
   * @param {string} module - Nama modul (misal: 'AuthService')
   * @param {string} message - Pesan
   * @param {any} data - Data tambahan (opsional)
   */
  static info(module, message, data = null) {
    if (data !== null) {
      console.log(`[INFO] [${module}] ${message}`, data);
    } else {
      console.log(`[INFO] [${module}] ${message}`);
    }
  }

  /**
   * Log peringatan (warna kuning di console)
   */
  static warn(module, message, data = null) {
    if (data !== null) {
      console.warn(`[WARN] [${module}] ${message}`, data);
    } else {
      console.warn(`[WARN] [${module}] ${message}`);
    }
  }

  /**
   * Log error (warna merah di console)
   */
  static error(module, message, error = null) {
    if (error !== null) {
      console.error(`[ERROR] [${module}] ${message}`, error);
    } else {
      console.error(`[ERROR] [${module}] ${message}`);
    }
  }
}