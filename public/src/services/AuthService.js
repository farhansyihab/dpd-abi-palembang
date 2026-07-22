/**
 * AuthService - Menangani semua logika autentikasi.
 * Hanya class ini yang boleh bicara ke Firebase Auth.
 */
import { auth, db } from '../config/FirebaseConfig.js';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged as firebaseOnAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { AppError } from '../core/AppError.js';
import { Logger } from '../core/Logger.js';

const MODULE_NAME = 'AuthService';

export class AuthService {
  /**
   * Login dengan Google via popup
   * @returns {Promise<FirebaseUser>} User yang berhasil login
   */
  static async signInWithGoogle() {
    try {
      Logger.info(MODULE_NAME, 'Memulai proses login Google...');
      const provider = new GoogleAuthProvider();
      
      // signInWithPopup = buka popup Google untuk pilih akun
      const result = await signInWithPopup(auth, provider);
      
      Logger.info(MODULE_NAME, 'Login berhasil', { 
        email: result.user.email,
        uid: result.user.uid 
      });
      
      return result.user;
    } catch (error) {
      // Bungkus error asli jadi AppError yang informatif
      const appError = new AppError(
        'Gagal login dengan Google',
        MODULE_NAME,
        'LOGIN_FAILED',
        error
      );
      Logger.error(MODULE_NAME, appError.toString(), error);
      throw appError; // Lempar ke pemanggil (UI) untuk ditangani
    }
  }

  /**
   * Logout user
   */
  static async signOutUser() {
    try {
      await signOut(auth);
      Logger.info(MODULE_NAME, 'Logout berhasil');
    } catch (error) {
      const appError = new AppError(
        'Gagal logout',
        MODULE_NAME,
        'LOGOUT_FAILED',
        error
      );
      Logger.error(MODULE_NAME, appError.toString(), error);
      throw appError;
    }
  }

  /**
   * Dengarkan perubahan status login (dipanggil sekali di awal aplikasi)
   * Callback akan dipanggil setiap kali user login/logout
   * 
   * Analogi VB: Seperti event handler untuk "UserChanged"
   */
  static onAuthStateChanged(callback) {
    return firebaseOnAuthStateChanged(auth, callback);
  }

  /**
   * Cek apakah email ada di whitelist authorized_emails
   * Ini pelengkap UX — Security Rules tetap penegak utama
   * @param {string} email - Email yang dicek
   * @returns {Promise<boolean>} true jika authorized
   */
  static async checkAuthorization(email) {
    try {
      Logger.info(MODULE_NAME, `Cek otorisasi untuk: ${email}`);
      const docRef = doc(db, 'authorized_emails', email);
      const docSnap = await getDoc(docRef);
      const isAuthorized = docSnap.exists();
      
      Logger.info(MODULE_NAME, `Hasil otorisasi: ${isAuthorized ? 'AUTHORIZED' : 'DENIED'}`);
      return isAuthorized;
    } catch (error) {
      const appError = new AppError(
        'Gagal cek otorisasi',
        MODULE_NAME,
        'AUTH_CHECK_FAILED',
        error
      );
      Logger.error(MODULE_NAME, appError.toString(), error);
      throw appError;
    }
  }

  /**
   * Ambil user yang sedang login saat ini (null jika belum login)
   */
  static getCurrentUser() {
    return auth.currentUser;
  }
}