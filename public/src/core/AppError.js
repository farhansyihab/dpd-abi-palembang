/**
 * AppError - Custom error class yang membawa konteks lengkap.
 * Analogi VB: Seperti object Err, tapi dengan info module & code.
 * 
 * Kenapa ini penting? Karena saat error muncul di console, kita langsung tahu:
 * - Modul mana yang error (nama class)
 * - Kode error apa (untuk debugging cepat)
 * - Error asli dari mana (untuk trace back)
 */
export class AppError extends Error {
  /**
   * @param {string} message - Pesan error yang manusiawi
   * @param {string} module - Nama class/modul sumber error
   * @param {string} code - Kode error (misal: 'LOGIN_FAILED', 'INVALID_NIK')
   * @param {Error|null} originalError - Error asli yang ditangkap (opsional)
   */
  constructor(message, module, code = 'UNKNOWN_ERROR', originalError = null) {
    super(message);
    this.name = 'AppError';
    this.module = module;
    this.code = code;
    this.originalError = originalError;
    
    // Simpan stack trace asli untuk debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Format error jadi string yang informatif untuk console
   */
  toString() {
    let msg = `[${this.module}] ${this.code}: ${this.message}`;
    if (this.originalError && this.originalError.message) {
      msg += `\n  └─ Penyebab: ${this.originalError.message}`;
    }
    return msg;
  }
}