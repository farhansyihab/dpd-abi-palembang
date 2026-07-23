# Sistem Pendataan DPD ABI Palembang

Sistem pendataan digital untuk mendata komunitas Syiah Imamiyah di wilayah DPD ABI Palembang. Sistem ini dirancang untuk menggantikan pendataan manual berbasis kertas dengan solusi digital yang aman, terstruktur, dan mudah diakses oleh tim inti organisasi.

## 📋 Tentang Proyek

Proyek ini adalah sistem pendataan komunitas yang fokus pada:
- **Pendataan keluarga (KK)** dan **anggota keluarga (individu)** secara terpisah namun terelasi
- **Penilaian ekonomi keluarga** sebagai data referensi (bukan penentu status)
- **Status bantuan (Mustahiq/Donatur)** yang ditentukan lewat rapat tim inti di luar sistem
- **Modul program "Tebus Sembako Murah"** dengan voucher PDF untuk Mustahiq/Donatur
- **Pencarian & filter** data keluarga berdasarkan nama, alamat, pekerjaan, penghasilan, status ABI, dll.

### Prinsip Utama
- **Kertas dulu, digital kemudian** — formulir kertas tetap jadi sumber data utama dan bukti fisik
- **Akses terbatas** — hanya 4 akun Google tim inti yang bisa akses (Ketua, Sekretaris, Bendahara, Pelaksana Harian)
- **Keamanan data sensitif** — data agama, NIK, No. KK, alamat, kondisi ekonomi dilindungi ketat
- **Proses penentuan status di luar sistem** — aplikasi hanya mencatat hasil akhir rapat, bukan proses rapat itu sendiri

## 🎯 Fitur Utama

### Fase 1 — MVP (Sedang Dikembangkan)
- ✅ Autentikasi Google Sign-In + whitelist 4 email
- ✅ CRUD Family (Keluarga) & Person (Anggota Keluarga)
- ✅ Pencarian nama/alamat + filter dasar
- ✅ Field status bantuan (Mustahiq/Donatur) + riwayat perubahan
- ✅ Modul Program "Tebus Sembako Murah" (assign peserta, generate PDF voucher)

### Fase 2 (Rencana)
- Dashboard statistik (jumlah Mustahiq/Donatur, distribusi pekerjaan, tren perubahan status)
- Filter lanjutan (kombinasi banyak kriteria, ekspor Excel)
- Sistem role (jika tim bertambah dan butuh pembatasan akses)

### Fase 3 (Rencana Jangka Panjang)
- Modul pencarian bakat/kemampuan untuk penyaluran kerja
- Modul rekomendasi beasiswa

## 🛠️ Teknologi yang Digunakan

| Komponen | Teknologi | Alasan |
|----------|-----------|--------|
| **Frontend** | Vanilla JavaScript (ES6 Modules) + Bootstrap 5 | Skala aplikasi tidak butuh framework kompleks, lebih ringan dan mudah di-maintain |
| **Database** | Cloud Firestore (Firebase) | Butuh query terstruktur (filter, composite index) yang lebih natural di Firestore |
| **Autentikasi** | Firebase Authentication (Google Sign-In) | Login mudah (1 klik), tanpa perlu bikin username/password baru |
| **Hosting** | Firebase Hosting | Gratis, cepat, terintegrasi dengan Firebase ecosystem |
| **PDF Generation** | jsPDF (client-side) | Ringan, tanpa server, langsung diunduh/dibagikan |
| **Version Control** | Git + GitHub | Standar industri, kolaborasi mudah |

### Kenapa Bukan Vue/React?
Sebagian besar layar adalah form input dan tabel dengan filter — pola "ambil data → render → event listener" di vanilla JS sudah cukup rapi kalau dipecah per modul. Vue/React baru benar-benar bernilai kalau UI-nya punya banyak state saling terhubung secara real-time (misalnya dashboard dengan banyak widget saling filter).

### Kenapa TypeScript Tidak Dipakai?
Skala aplikasi ini tidak butuh type-safety kompleks. JSDoc (komentar khusus di JavaScript) memberi sebagian manfaat TypeScript (autocomplete di editor) tanpa build step yang menambah kerumitan.

## 📁 Struktur Proyek

```
DPD_Palembang/
├── public/                    # Folder yang di-serve ke browser
│   ├── index.html            # Halaman utama (login)
│   ├── css/                  # Styling custom
│   ├── js/                   # Script tambahan
│   └── src/                  # Kode sumber aplikasi (ES6 modules)
│       ├── config/           # Konfigurasi Firebase
│       │   └── FirebaseConfig.js
│       ├── core/             # Fondasi: error handling & logging
│       │   ├── AppError.js
│       │   └── Logger.js
│       ├── models/           # Representasi data (1 file = 1 collection)
│       ├── repositories/     # CRUD ke Firestore (1 file = 1 collection)
│       ├── services/         # Logika bisnis (tidak boleh impor Firestore langsung)
│       ├── controllers/      # UI logic (1 file = 1 halaman/komponen)
│       └── utils/            # Fungsi pembantu (DateUtils, Debounce, dll)
├── firestore.rules           # Security rules untuk Firestore
├── firestore.indexes.json    # Composite indexes untuk query kompleks
├── firebase.json             # Konfigurasi Firebase project
├── .firebaserc               # Alias project Firebase
├── .gitignore                # File/folder yang diabaikan Git
└── README.md                 # Dokumentasi ini
```

### Arsitektur Kode: Class-Based & Modular

**Prinsip utama:** Satu class = satu file = satu tanggung jawab. Nama class yang muncul di error selalu sama dengan nama file-nya, jadi kalau ada bug, nama modul di pesan error langsung menunjuk file mana yang harus dibuka.

**Aturan arah ketergantungan (satu arah, tidak boleh dibalik):**
```
Controller → Service → Repository → FirebaseConfig
```

- **Controller** tidak boleh memanggil Repository langsung
- **Service** tidak boleh menyentuh DOM
- **Repository** adalah satu-satunya lapisan yang boleh bicara ke Firestore

**Kenapa error jadi mudah dilacak:**
- `AppError` — setiap kali Repository/Service menangkap error, dibungkus ulang jadi `AppError` yang membawa `module` (nama class sumber) dan `code`. Pesan error di console selalu berbunyi seperti `[FamilyRepository] gagal updateStatus: ...` — langsung tahu buka file mana.
- `Logger` — semua log selalu diberi tag nama module di parameter pertama, konsisten di seluruh project.

## 🚀 Cara Menjalankan Proyek

### Prasyarat
- **Node.js** (versi 18 atau lebih baru) — [Download](https://nodejs.org/)
- **Git** — [Download](https://git-scm.com/)
- **Java JDK 21** (untuk Firebase Emulator) — [Download](https://adoptium.net/)
- **Firebase CLI** — install via: `npm install -g firebase-tools`

### 1. Clone Repository
```bash
git clone https://github.com/farhansyihab/dpd-abi-palembang.git
cd dpd-abi-palembang
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Firebase Project
1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Buat project baru atau gunakan project yang sudah ada
3. Aktifkan **Authentication** → **Google Sign-In**
4. Aktifkan **Firestore Database** (pilih region `asia-southeast2` Jakarta)
5. Aktifkan **Hosting**
6. Salin konfigurasi Firebase dari **Project Settings** → **Your apps** → **Web app**
7. Tempel konfigurasi ke `public/src/config/FirebaseConfig.js`

### 4. Login ke Firebase CLI
```bash
firebase login
```
Browser akan terbuka untuk otorisasi. Klik "Allow".

### 5. Jalankan Firebase Emulator (REKOMENDASI UNTUK DEVELOPMENT)

**⚠️ PENTING: Selalu gunakan emulator saat development untuk menghindari mengubah data production!**

```bash
firebase emulators:start
```

atau lebih baik lagi

```bash
firebase emulators:start --only firestore,hosting
```

Emulator akan menjalankan:
- **Firestore Emulator** di `http://127.0.0.1:8080`
- **Hosting Emulator** di `http://127.0.0.1:5000`
- **Emulator UI** di `http://127.0.0.1:4000`

Buka `http://127.0.0.1:5000` di browser untuk melihat aplikasi berjalan secara lokal.

**Tips:**
- Data di emulator **terpisah** dari data production — aman untuk uji coba
- Untuk reset data emulator, hentikan emulator (`Ctrl+C`), lalu jalankan lagi
- Emulator UI (`http://127.0.0.1:4000`) memungkinkan Anda melihat/mengedit data secara visual

### 6. Deploy ke Production (Hanya Jika Yakin)

**⚠️ PERINGATAN: Deploy akan mengubah data production!**

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Deploy ke Hosting (website live)
firebase deploy --only hosting

# Deploy semua sekaligus
firebase deploy
```

### 7. Setup Whitelist Email
1. Buka Firebase Console → Firestore Database
2. Buat collection `authorized_emails`
3. Tambahkan document dengan **Document ID** = email Google yang diizinkan (misal: `ketua@gmail.com`)
4. Tambahkan field `nama` (string) = "Ketua" (atau label lain)
5. Ulangi untuk 4 email tim inti

### 8. Tambahkan Domain ke Authorized Domains
1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Klik **Add domain**
3. Tambahkan:
   - `127.0.0.1` (untuk development lokal)
   - `localhost` (untuk development lokal)
   - `dpd-abi-palembang.web.app` (domain default Firebase Hosting)
   - Domain custom (jika ada)

## 🔒 Keamanan & Akses

### Model Akses
- **Hanya 4 akun Google** yang bisa akses (whitelist di collection `authorized_emails`)
- **Tidak ada sistem role** di fase 1 — semua 4 akun punya akses penuh yang identik
- **Security Rules** adalah penegak utama akses (bukan Cloud Function)

### Pencabutan Akses (SOP Kehilangan Perangkat)
Jika HP/laptop anggota tim inti hilang:
1. **Segera** buka Firebase Console → Authentication → cari akun → klik **Disable**
2. Hapus email tersebut dari collection `authorized_emails` di Firestore
3. Data lain tidak disentuh — sistem tetap berjalan normal untuk 3 anggota lainnya
4. Setelah situasi jelas, aktifkan kembali atau tambahkan email baru ke whitelist

### Perlindungan Data Sensitif
Data yang didata (afiliasi keagamaan, NIK, No. KK, alamat, kondisi ekonomi) masuk kategori data pribadi spesifik menurut UU PDP. Sistem ini menerapkan:
- Akses terbatas ke 4 akun whitelist
- Enkripsi standar Google (encryption at rest)
- Tidak ada foto/gambar yang disimpan (KTP/KK/foto tetap hardcopy fisik)
- Formulir kertas tetap jadi sumber data utama dan bukti fisik

## 📊 Model Data

Sistem menggunakan model **Hybrid: Family + Person** (bukan hanya KK atau hanya Person).

### Collection Utama
1. **`families`** — Data rumah tangga (No. KK, alamat, status kepemilikan rumah, kondisi rumah, akses air bersih, status bantuan)
2. **`persons`** — Data individu (NIK, nama, tanggal lahir, pendidikan, pekerjaan, penghasilan, status ABI, kaderisasi)
3. **`person_relations`** — Relasi antar-person (paman-keponakan beda KK, dll)
4. **`economic_assessments`** — Snapshot kondisi ekonomi keluarga per periode (histori, bukan overwrite)
5. **`programs`** — Program bantuan (misal: "Tebus Sembako Murah")
6. **`program_participants`** — Peserta program (Mustahiq/Donatur)
7. **`status_history`** — Riwayat perubahan status bantuan per keluarga
8. **`users`** — Data 4 anggota tim inti (bukan Mustahiq/Donatur)
9. **`authorized_emails`** — Whitelist email untuk akses sistem

Lihat detail skema lengkap di [Rancangan_Sistem_Pendataan_DPD_ABI_Palembang.md](./Rancangan_Sistem_Pendataan_DPD_ABI_Palembang.md) bagian 3.

## 🗺️ Roadmap Pengembangan

Proyek ini dikembangkan secara bertahap dengan "Definisi Selesai" yang jelas di setiap fase.

| Minggu | Fokus | Keluaran |
|--------|-------|----------|
| 1 | Setup project & login | ✅ Firebase project jadi, login Google + whitelist jalan |
| 2 | Fondasi kode: Core & Data Layer (bagian 1) | AppError, Logger, BaseRepository, Family & Person selesai |
| 3 | Data Layer (bagian 2) | Semua Model & Repository selesai (9 collection) |
| 4 | Service Layer | Semua Service selesai (Auth, Family, Person, Search, Program, Pdf) |
| 5–6 | UI: Form Keluarga & Anggota | Form Lembar 1 & 2 bisa dipakai input data sungguhan |
| 7 | Pencarian & Filter | Semua fitur cari/filter jalan |
| 8 | Modul Program Tebus Sembako | Assign Mustahiq/Donatur + generate PDF voucher jalan |
| 9 | Keamanan & Kebijakan | Security Rules final, teks persetujuan & kebijakan data aktif |
| 10 | Backup & Observability | Backup terjadwal jalan, budget alert aktif |
| 11 | Testing Menyeluruh | Semua skenario diuji, bug ditemukan sebelum data asli masuk |
| 12+ | Migrasi Data & Go-Live | Data asli mulai diinput, sistem dipakai rutin |

Lihat detail lengkap di [Roadmap_Proyek_Sistem_Pendataan_DPD_ABI_Palembang.md](./Roadmap_Proyek_Sistem_Pendataan_DPD_ABI_Palembang.md).

## 📝 Kontribusi

Proyek ini saat ini dikembangkan oleh satu orang (Farhan) dengan ritme kerja sampingan. Jika Anda tertarik berkontribusi:

1. Fork repository ini
2. Buat branch fitur baru: `git checkout -b fitur-nama-fitur`
3. Commit perubahan: `git commit -m 'Tambah fitur X'`
4. Push ke branch: `git push origin fitur-nama-fitur`
5. Buat Pull Request

**Catatan:** Karena ini adalah sistem yang menangani data sensitif komunitas, semua kontribusi akan direview dengan ketat untuk memastikan keamanan dan privasi data.

## 📄 Lisensi

Proyek ini dikembangkan untuk keperluan internal DPD ABI Palembang. Distribusi dan penggunaan di luar organisasi memerlukan izin tertulis.

## 📞 Kontak

Untuk pertanyaan terkait proyek ini, silakan hubungi:
- **Developer:** Farhan
- **GitHub:** [@farhansyihab](https://github.com/farhansyihab)
- **Email:** agiptek@gmail.com


---

**Versi Dokumen:** 1.0  
**Terakhir Diperbarui:** 22 Juli 2026  
**Status:** Dalam Pengembangan (Minggu 1 Selesai)

