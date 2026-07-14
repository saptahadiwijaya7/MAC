# Deploy — Apps Script backend (MAC)

Backend hidup **di dalam** Google Sheet-mu. Alur akhirnya:

```
Next.js (server route)  ->  Apps Script Web App (/exec)  ->  Sheet (MASTER + Units + Transactions + TransactionItems)
```

## 1. Pasang script

1. Buka Google Sheet-mu → menu **Extensions → Apps Script**.
2. Hapus isi `Code.gs` bawaan, tempel seluruh isi `apps-script/Code.gs`.
3. Di bagian `CONFIG`, ganti `TOKEN` jadi string acak yang panjang (mis. hasil password generator). Simpan token ini — nanti dipakai Next.js. **Selama TOKEN masih `CHANGE_ME_...`, API terbuka tanpa auth** (berguna untuk tes cepat, tapi ganti sebelum dipakai beneran).
4. Simpan (ikon disk).

## 2. Bangun struktur data

1. Reload tab Sheet-mu. Akan muncul menu baru: **MAC**.
2. **MAC → 1) Setup tabs** — membuat tab Units, Transactions, TransactionItems (MASTER tidak disentuh).
3. **MAC → 2) Build / Refresh Units** — membaca MASTER dan membuat satu baris per unit fisik.
   - Barang qty 1 → Unit ID = No (mis. `A0025`).
   - Barang qty > 1 → `No-1 … No-N` (mis. `A0027-1 … A0027-4`).
   - Baris yang sudah kamu split (`CA0001-1`, `CP0001-2`) tetap dipakai apa adanya, satu unit.
   - Baris dengan Qty kosong diasumsikan 1 dan dicatat di notifikasi.
   - **Idempotent**: aman dijalankan ulang setelah menambah barang di MASTER — hanya unit baru yang ditambahkan.

> Saat pertama menjalankan menu, Google minta izin (authorize). Wajar — scriptnya milikmu sendiri.

## 3. Deploy sebagai Web App

1. Di editor Apps Script: **Deploy → New deployment**.
2. Type: **Web app**.
3. Execute as: **Me**. Who has access: **Anyone** (aman karena dilindungi TOKEN + dipanggil dari server, bukan dipublikasikan).
4. **Deploy**, salin **Web app URL** (berakhiran `/exec`).

Setiap kali kamu ubah `Code.gs`, buat **Manage deployments → Edit → New version** agar URL yang sama memakai kode terbaru.

## 4. Tes cepat

Buka di browser (ganti URL & token):

```
https://script.google.com/.../exec?action=ping&token=TOKENMU
```
Harusnya balas `{"ok":true,"service":"MAC",...}`.

Daftar unit:
```
...exec?action=units&token=TOKENMU
```

## 5. Sambungan ke Next.js (batch berikutnya)

Di project Next.js nanti aku pakai dua environment variable (file `.env.local`):

```
MAC_APPS_SCRIPT_URL=https://script.google.com/.../exec
MAC_API_TOKEN=TOKENMU
```

Browser tidak pernah memanggil Apps Script langsung — selalu lewat route server Next.js. Ini menghindari masalah CORS dan menyembunyikan token.

## API ringkas

**GET**
- `?action=ping` — health check
- `?action=units` — daftar unit. Filter opsional: `&q=`, `&status=available`, `&group=Audio Equipment`
- `?action=history` — daftar transaksi (terbaru dulu)
- `?action=transaction&id=BOR-20260710-001` — 1 transaksi + itemnya

**POST** (JSON body, sertakan `token`)
- Pinjam:
  ```json
  { "action":"borrow", "token":"…", "peminjam":"Ahmad", "divisi":"Video",
    "kembaliRencana":"2026-07-15", "catatan":"", "unitIds":["A0025","A0027-1"] }
  ```
  → `{ "ok":true, "id":"BOR-20260710-001", "count":2 }`
- Kembali:
  ```json
  { "action":"return", "token":"…", "transactionId":"BOR-20260710-001",
    "returns":[ {"unitId":"A0025","kondisi":"Baik"}, {"unitId":"A0027-1","kondisi":"Rusak"} ] }
  ```
  → `{ "ok":true, "returned":2, "remaining":0 }`
- Ubah unit (admin):
  ```json
  { "action":"updateUnit", "token":"…", "unitId":"A0013", "sale":"manual" }
  ```
  Bisa set `status` (available | maintenance | lost), `sale` ("" | manual), dan/atau `kondisi`.
  → `{ "ok":true, "unitId":"A0013", "changed":{ "sale":"manual" } }`

Peminjaman bersifat **all-or-nothing** dan dikunci `LockService`, jadi ID `BOR-…` tidak pernah dobel dan unit tidak bisa dipinjam dua kali.

## Catatan penting

- **Update ke v2 (kolom `Sale`)**: kalau kamu sudah pakai versi sebelumnya, cukup timpa `Code.gs` dengan yang baru, lalu jalankan **MAC → 1) Setup tabs** dan **2) Build / Refresh Units** sekali lagi. Tab Units akan otomatis dapat kolom **Sale** tanpa kehilangan data — tidak perlu buat ulang, dan **wajib New version** saat re-deploy (Manage deployments → Edit → New version).
- **"Dijual" ≠ tidak bisa dipinjam.** `Sale` adalah penanda terpisah dari Status. Unit yang `available` **dan** ditandai dijual tetap bisa dipinjam. Nilai `Sale`: kosong, `manual` (di-set admin, atau kolom Remarks MASTER berisi "For sale"), atau `auto` (umur ≥ 4 tahun / `CONFIG.SALE_AGE_MONTHS`). Saat *Refresh Units*, flag `auto` dihitung ulang dari umur; flag `manual` selalu dipertahankan. Ubah ambang di `CONFIG.SALE_AGE_MONTHS` (default 48) atau matikan dengan `AUTO_SALE_BY_AGE = false`.
- **Status `sold` (Terjual) bersifat terminal.** Admin menandai unit terjual lewat halaman Asset. Setelah `sold`: status terkunci (semua `updateUnit` ditolak), unit keluar dari perhitungan Available di MASTER, dan tidak bisa dipinjam. Unit yang sedang `borrowed` harus dikembalikan dulu sebelum bisa ditandai terjual.
- `updateUnit` sekarang juga menerima `lokasi` (dipakai halaman detail Asset untuk mengubah lokasi/kondisi).
- **Tambah Asset** (`action:"addAsset"`): menambah baris baru ke MASTER lalu membuat unit-nya. "No" otomatis melanjutkan pola per grup (mis. Audio → A0040) dan bisa ditimpa manual. Kolom formula (Today, LifeSpan, Depresiasi, dst) disalin dari baris terakhir agar tetap terhitung. Butuh header **"Harga Beli"** di MASTER (sudah ada di sheet-mu).
- **Kolom Picked/Available di MASTER ditulis sebagai angka** setiap pinjam/kembali. Untuk mempertahankan formula, set `CONFIG.UPDATE_MASTER_COUNTS = false`.
- **Foto aset**: sudah aktif. Foto diunggah dari halaman detail Asset → dikompres di browser → disimpan ke folder Google Drive (`CONFIG.PHOTO_FOLDER_ID`) oleh Apps Script, dan file ID-nya dicatat di kolom `Photo` tab Units. Tampil di app lewat proxy `/api/photo/[id]` (file tetap privat, tidak perlu dipublikasikan). **Saat pertama mengunggah, Google akan meminta izin Drive** — ini wajar karena scriptnya milikmu. Pastikan folder Drive yang dipakai memang milik/dapat diakses akun yang men-deploy script.

- **Report & Ready Dijual data**: the `units` response now also carries each item's Purchase Date, Harga Beli, and recommended sale price (the MASTER column whose header contains "jual", e.g. "Rekom Hrg Jual"). The new `usage` action powers period filters on Tracking/Report by counting borrows from TransactionItems + Transactions dates. No new columns are required, but re-deploy a **New version** after pasting Code.gs so these endpoints go live.

- **Penjualan aset (Sell)**: menambah tab **Sales** dan aksi `sellAsset` (+ `sales`/`sale` untuk baca). Setelah paste Code.gs, jalankan **MAC → 1) Setup tabs** sekali untuk membuat tab Sales, lalu re-deploy **New version**. Foto bukti transaksi (opsional) ikut disimpan ke folder Drive yang sama seperti foto aset; menjual unit mengunci statusnya jadi "sold" dan mengeluarkannya dari stok.

- **Settings, Divisi & User**: menambah tab **Divisions**, **Users**, dan **Settings**. Setelah paste Code.gs, jalankan **MAC → 1) Setup tabs** sekali (membuat + men-seed tab-tab ini), lalu re-deploy **New version**. Password user di-hash (SHA-256 + token instalasi sebagai salt) sebelum disimpan — jangan pernah menaruh password polos di sheet. Aksi `login` sudah tersedia untuk halaman login (langkah berikutnya).

## Login Email + Password + Hak Akses (v0.9.1)

Aplikasi memakai login **email + password** (NextAuth v5, sesi cookie ber-tanda-tangan). Password di-hash SHA-256 + token instalasi sebagai garam. Layak untuk tool internal tim; bukan untuk data publik super-sensitif.

### 1) Backend
Paste Code.gs terbaru -> **MAC -> 1) Setup tabs** sekali (membuat tab Users/Divisions/Settings bila belum ada; menambah kolom "Created By" & "Recorded By") -> re-deploy **New version**.

### 2) .env.local
```
AUTH_SECRET=<hasil: openssl rand -base64 32>
# production:
# AUTH_URL=https://DOMAIN-ANDA
```
Lalu `npm install` (menambah next-auth) dan jalankan.

### 3) Buat admin pertama (bootstrap)
Karena password di-hash, admin pertama dibuat dari Sheet: **MAC -> 3) Buat Admin...** lalu isi email, nama, dan password. Ini membuat 1 user role=admin. Setelah itu login di aplikasi dengan email+password tersebut, dan kelola user lain dari **Settings -> Pengguna** (tambah user, atur role, reset password, aktif/nonaktif).

### Peran
- **admin**: semua (kelola asset, jual, settings, user, divisi, pinjam/kembali).
- **user**: pinjam & kembalikan + lihat semua data.
- **viewer**: hanya lihat.

Catatan: enforcement dilakukan di server (middleware memaksa login; route API pengubah data cek peran), bukan sekadar menyembunyikan tombol.

## API Token via Script Properties (v0.12.1) — anti-ketimpa

Mulai versi ini, token API dibaca dari **Script Properties** (`API_TOKEN`), dengan fallback ke `CONFIG.TOKEN`. Artinya token **tidak lagi ketimpa** saat kamu paste Code.gs baru. Token ini dipakai untuk dua hal: (1) autentikasi API, dan (2) garam hashing password. Karena garamnya ikut berubah, saat migrasi kamu perlu membuat ulang admin sekali.

### Setup sekali (memperbaiki lockout sekaligus)
1. Paste Code.gs terbaru ke Apps Script.
2. Menu **MAC → Set API Token…** → masukkan token (string acak panjang; boleh pakai nilai yang sekarang ada di `.env.local`).
3. Set `MAC_API_TOKEN` di `.env.local` = **persis** token yang sama.
4. Menu **MAC → Buat / Reset Admin…** → isi email + nama + password baru. (Ini membuat/mereset admin dengan garam token yang baru, jadi password pasti cocok.)
5. **Deploy → Manage deployments → Edit → New version.**
6. Restart server Next.
7. Cek `/api/ping` → `{ ok: true }`, lalu login dengan admin yang barusan dibuat.

### Sesudah itu
- Paste Code.gs berikutnya **tidak akan** mengganggu token maupun password — `CONFIG.TOKEN` boleh tetap placeholder.
- **MAC → Health check** menampilkan status token: apakah sumbernya Script Properties (aman) atau masih CONFIG.TOKEN.
- Rotasi token: cukup ulangi Set API Token… + samakan `.env.local` + Buat/Reset Admin (karena garam berubah) + New version + restart.

Catatan: user lain (selain admin) yang dibuat sebelum migrasi passwordnya ikut tidak valid setelah token berganti — reset lewat Settings → Pengguna, atau minta mereka di-reset oleh admin.
