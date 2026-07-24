/**
 * Debounce - Utility untuk menunda eksekusi fungsi sampai user berhenti mengetik.
 *
 * Analogi VB: Seperti Timer yang di-reset tiap kali user mengetik.
 *
 * @param {Function} func - Fungsi yang akan dipanggil
 * @param {number} wait - Waktu tunggu dalam ms (default: 300ms)
 * @returns {Function} Fungsi yang sudah di-debounce
 */
export function debounce(func, wait = 300) {
    let timeoutId;

    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), wait);
    };
}