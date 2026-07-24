/**
 * AuthService - Menangani semua logika autentikasi & otorisasi.
 * Hanya class ini yang boleh bicara ke Firebase Auth.
 *
 * UPDATE MINGGU 4: Ditambahkan getUserProfile() yang memanfaatkan UserRepository
 * untuk mengambil metadata user (nama/jabatan) dari collection 'users'.
 * Ini membuat checkAuthorization lebih robust: cek whitelist + cek is_active.
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
import { UserRepository } from '../repositories/UserRepository.js';

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
      const result = await signInWithPopup(auth, provider);
      Logger.info(MODULE_NAME, 'Login berhasil', {
        email: result.user.email,
        uid: result.user.uid
      });
      return result.user;
    } catch (error) {
      const appError = new AppError(
        'Gagal login dengan Google',
        MODULE_NAME,
        'LOGIN_FAILED',
        error
      );
      Logger.error(MODULE_NAME, appError.toString(), error);
      throw appError;
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
   * Dengarkan perubahan status login
   */
  static onAuthStateChanged(callback) {
    return firebaseOnAuthStateChanged(auth, callback);
  }

  /**
   * Cek apakah email ada di whitelist authorized_emails.
   * Ini pelengkap UX — Security Rules tetap penegak utama.
   *
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
   * Ambil profil user dari collection 'users' berdasarkan UID.
   * Digunakan untuk menampilkan nama/jabatan di UI, dan cek is_active.
   *
   * PENTING: Method ini tidak mengecek whitelist (itu tugas checkAuthorization).
   * Method ini hanya mengambil metadata user yang sudah pasti ter-whitelist.
   *
   * @param {string} uid - Firebase Auth UID
   * @returns {Promise<UserModel|null>} Profil user atau null jika belum ada di collection 'users'
   */
  static async getUserProfile(uid) {
    try {
      Logger.info(MODULE_NAME, `Mengambil profil user untuk UID: ${uid}`);
      const userRepo = new UserRepository();
      const userProfile = await userRepo.getById(uid);

      if (!userProfile) {
        Logger.warn(MODULE_NAME, `Profil user belum ada di collection 'users' untuk UID: ${uid}`);
        return null;
      }

      // Cek apakah user masih aktif
      if (!userProfile.is_active) {
        Logger.warn(MODULE_NAME, `User ${userProfile.email} ditandai tidak aktif (is_active=false)`);
        // Tidak throw error — biarkan UI yang memutuskan tindakan
        // (misal: tampilkan warning tapi tetap izinkan akses, atau paksa logout)
      }

      Logger.info(MODULE_NAME, 'Profil user berhasil diambil', {
        email: userProfile.email,
        nama: userProfile.nama,
        is_active: userProfile.is_active
      });
      return userProfile;
    } catch (error) {
      const appError = new AppError(
        'Gagal mengambil profil user',
        MODULE_NAME,
        'GET_USER_PROFILE_FAILED',
        error
      );
      Logger.error(MODULE_NAME, appError.toString(), error);
      throw appError;
    }
  }

  /**
   * Cek otorisasi lengkap: whitelist + profil user aktif.
   * Dipanggil setelah login berhasil untuk validasi ganda.
   *
   * @param {string} email - Email user
   * @param {string} uid - Firebase Auth UID
   * @returns {Promise<{isAuthorized: boolean, userProfile: UserModel|null}>}
   */
  static async checkAuthorizationFull(email, uid) {
    try {
      Logger.info(MODULE_NAME, `Cek otorisasi lengkap untuk: ${email}`);

      // Step 1: Cek whitelist
      const isInWhitelist = await this.checkAuthorization(email);
      if (!isInWhitelist) {
        Logger.warn(MODULE_NAME, `Email ${email} tidak ada di whitelist`);
        return { isAuthorized: false, userProfile: null };
      }

      // Step 2: Cek profil user (opsional — kalau belum ada di collection 'users', tetap authorized)
      const userProfile = await this.getUserProfile(uid);
      const isUserActive = userProfile ? userProfile.is_active : true;

      if (!isUserActive) {
        Logger.warn(MODULE_NAME, `User ${email} tidak aktif (is_active=false)`);
        return { isAuthorized: false, userProfile };
      }

      Logger.info(MODULE_NAME, `Otorisasi lengkap berhasil untuk: ${email}`);
      return { isAuthorized: true, userProfile };
    } catch (error) {
      const appError = new AppError(
        'Gagal cek otorisasi lengkap',
        MODULE_NAME,
        'AUTH_CHECK_FULL_FAILED',
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