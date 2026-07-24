# Changelog

## [0.16.0-alpha] - 2026-07-14
### Added
- **Arsip unit (soft-delete)** untuk unit salah input/duplikat — aman & bisa dipulihkan:
  - Drawer detail unit (admin) → tombol **Arsipkan unit** (+ alasan opsional). Unit hilang dari daftar Asset, Opname, dan picker Peminjaman.
  - Tombol **Arsip** di header Asset (admin) → panel daftar arsip dengan **Pulihkan**.
  - Unit yang sedang dipinjam tidak bisa diarsipkan; riwayat tetap utuh.
### Backend (Setup + redeploy New version)
- New sheet **ArchivedUnits**; `listUnits_` menyaring unit terarsip; actions `archiveUnit`, `unarchiveUnit` (guard admin), `archivedUnits`.
### Design note
- Dipilih soft-delete (bukan hard-delete) karena Units diturunkan dari MASTER dan "Build/Refresh Units" bersifat additive — hard-delete akan muncul lagi saat refresh, dan bisa merusak referensi riwayat.

## [0.15.0-alpha] - 2026-07-14
### Added
- **Cetak Label QR massal** (menu "Label QR"): pilih unit (cari/filter/pilih-semua) → cetak grid label, tiap label berisi QR (isi Unit ID) + Unit ID + nama + grup. Siap tempel untuk scan opname/pengembalian.
- **Detail transaksi** di History: klik baris → drawer read-only berisi info peminjam + daftar barang beserta status kembali, **kondisi (rusak/hilang ditandai merah)**, dan tanggal kembali. Ada tombol Edit (bila belum selesai) + cetak surat jalan.
- **QR di Surat Jalan**: setiap surat jalan kini punya QR berisi kode transaksi. Saat pengembalian, tombol **Scan** di halaman Pengembalian bisa membaca QR itu untuk langsung memuat transaksinya.
- **Komponen QrScanner bersama** dengan deteksi secure-context (HTTPS) dan **fallback input manual** — dipakai di Opname & Pengembalian.
### Fixed / Changed
- Pesan error kamera lebih spesifik: membedakan "butuh HTTPS", "izin ditolak", dan "kamera tidak ada", plus selalu menyediakan input manual sebagai cadangan.
### Notes
- Frontend menambah dependency `qrcode.react` → `npm install` setelah unzip. Backend tidak berubah dari 0.14.0.
- Kamera hanya aktif di HTTPS atau localhost (syarat browser). Untuk uji di HP via LAN, jalankan `next dev --experimental-https`, atau deploy ke HTTPS.

## [0.14.0-alpha] - 2026-07-14
### Added
- **Stock Opname** (menu baru, role user & admin) — pendekatan hybrid:
  - Checklist unit dikelompokkan per **lokasi**, tandai **Ada / Hilang**, dengan progress + ringkasan.
  - **Scan QR** (kamera + jsQR): scan Unit ID → otomatis tandai Ada; bisa scan beruntun.
  - Koreksi **lokasi/kondisi** inline saat unit ditandai Ada.
  - **Selesaikan & Simpan**: menerapkan perubahan (hilang → lost; lost yang ketemu → available; update lokasi/kondisi) dan menyimpan **log opname**.
  - Tab **Riwayat**: daftar opname lampau (tanggal, operator, jumlah ada/hilang/selisih) + detail selisih.
### Backend (Setup + redeploy New version)
- New sheets **Opname** + **OpnameItems**; actions `saveOpname` (POST, guard user, LockService), `opnameList`, `opname&id=`.
### Notes
- Frontend menambah dependency `jsqr` → `npm install` setelah unzip.
- Kamera QR butuh HTTPS (atau localhost) — syarat browser.

## [0.13.1-alpha] - 2026-07-14
### Added
- Blok "Terakhir dipinjam" di drawer Asset kini **bisa diklik** → membuka History dengan filter ke transaksi tsb (`/history?q=<txId>`). History membaca parameter `?q=` untuk mengisi pencarian otomatis.
### Note
- Backend tidak berubah dari 0.13.0 (endpoint `unitLast` sudah ada). Kalau belum sempat redeploy Code.gs 0.13.0, lakukan sekarang agar blok "Terakhir dipinjam" terisi.
## [0.13.0-alpha] - 2026-07-14
### Added
- Drawer detail Asset kini menampilkan **"Terakhir dipinjam"**: tanggal + nama peminjam (dan kegiatan bila ada), diturunkan dari transaksi terakhir yang memuat unit tsb. Tampil untuk admin maupun non-admin.
### Backend (redeploy New version; no schema change)
- New GET action `unitLast&unitId=` → transaksi terbaru untuk sebuah unit (peminjam, tanggal, kegiatan). New route `/api/unit-last`.
## [0.12.4-alpha] - 2026-07-14
### Changed
- Pengembalian: teks lokasi pada tiap item kini berwarna hijau (text-ok) agar lebih ter-highlight; nomor aset tetap abu-abu untuk kontras.

## [0.12.3-alpha] - 2026-07-14
### Changed
- Pengembalian: item checklist kini **default tidak tercentang** — user memilih sendiri unit mana yang dikembalikan (tombol "Kembalikan N unit" aktif setelah minimal 1 dicentang).
- Baris item menampilkan lokasi: **Nama Asset** di atas, lalu **Nomor asset - lokasi** di bawahnya.

## [0.12.2-alpha] - 2026-07-14
### Added
- **Favicon / app icon** matching the in-app logo (white package glyph on the brand blue #2563EB rounded square). Uses Next.js App Router file conventions: `src/app/icon.svg` (scalable), `src/app/favicon.ico` (16/32/48), and `src/app/apple-icon.png` (180×180, full-bleed for iOS).

## [0.12.1-alpha] - 2026-07-14
### Changed (backend — fixes recurring token lockout)
- API token is now read from **Script Properties** (`API_TOKEN`), falling back to `CONFIG.TOKEN`. Pasting a fresh Code.gs no longer clobbers the token. The same value is used for API auth and as the password-hash salt (via new `getToken_()`).
- New menu **MAC → Set API Token…** to store the token in Script Properties.
- **MAC → Buat Admin…** renamed to **Buat / Reset Admin…** and now upserts (creates, or resets password + role=admin + reactivates an existing email) — used to recover from a lockout after the token migration.
- **Health check** now reports whether the token comes from Script Properties (safe) or the code literal.
### Migration (once)
- Paste Code.gs → Set API Token… → set `.env.local MAC_API_TOKEN` to the same value → Buat / Reset Admin… → redeploy New version → restart. After this, future pastes never touch the token again.

## [0.12.0-alpha] - 2026-07-13
### Performance
- **Client caching with SWR (stale-while-revalidate).** All read-heavy pages (Dashboard, Asset, History, Tracking, Ready Dijual, Rekap Jual, Report) now read via shared SWR hooks (`src/lib/hooks.ts`). Revisiting a page shows cached data instantly and refreshes in the background instead of blocking on a full reload each time. Config: dedupe 5s, revalidate on focus, keepPreviousData.
- Writes (borrow, return, edit/delete transaksi, jual, update aset) invalidate the relevant caches (`/api/units`, `/api/history`, `/api/sales`) so other pages stay correct.
- **Backend caching (Apps Script CacheService).** The MASTER join map (`master_info_v1`, TTL 120s) and config (`config_v1`, TTL 60s) are cached to cut repeated Sheet reads on `units`/`config` calls. Invalidated automatically on Settings/Divisi save and on Tambah Asset.
### Notes
- Redeploy Code.gs (New version) to get backend caching; no schema change, no Setup needed. Frontend adds the `swr` dependency, so run `npm install` after unzip.
- For the snappiest feel, run production (`npm run build && npm start`), not `npm run dev`.

## [0.11.0-alpha] - 2026-07-13
### Added
- **Edit & hapus peminjaman dari History** (hanya untuk transaksi yang belum selesai):
  - **Edit** (role user & admin): ubah nama peminjam, divisi, kegiatan, tanggal kembali rencana, catatan; keluarkan unit yang masih dipinjam (unit kembali ke stok) dan tambah unit available baru. Status transaksi dihitung ulang otomatis. Tidak boleh mengosongkan seluruh transaksi lewat edit.
  - **Hapus** (role admin saja): menghapus transaksi aktif permanen dan mengembalikan semua unit yang masih dipinjam ke available. Transaksi yang sudah selesai tidak bisa dihapus (arsip riwayat).
### Backend (redeploy New version; no schema change)
- New actions: `updateTransaction` (edit header + add/remove units, validasi sebelum menulis, LockService) and `deleteTransaction` (bebaskan unit + hapus baris tx & item, LockService).
- API route `/api/transaction/[id]` now also handles `PATCH` (guard user) and `DELETE` (guard admin).

## [0.10.1-alpha] - 2026-07-13
### Changed
- Notification bell now **auto-refreshes every 60 seconds**, plus an immediate refresh when the browser tab regains focus.
- The bell dropdown now **closes when clicking anywhere outside it** (and on Escape). Replaced the nested fixed backdrop — which was trapped inside the header's blur stacking context — with a document-level click-away listener.

## [0.10.0-alpha] - 2026-07-13
### Added
- **Deteksi keterlambatan (hybrid)**: peminjaman terbuka dianggap terlambat bila melewati tanggal kembali rencana; bila rencana kosong, memakai ambang aging (tanggal pinjam + N hari). Ambang N diatur di Settings -> Umum ("Ambang terlambat (hari)", default 7). Logika ada di `src/lib/overdue.ts`.
- **Lonceng notifikasi di header** (untuk role user & admin): badge merah = jumlah transaksi terlambat; dropdown mendaftar transaksi belum kembali (terlambat/segera jatuh tempo) dengan kode, peminjam, dan info "Terlambat N hari". Klik item -> membuka Pengembalian dengan transaksi itu ter-load otomatis (`/transaction/return?id=`).
### Backend (redeploy + run Setup once)
- Settings gains key `overdue_days` (default 7). `config` action returns `overdueDays`; `setSettings` accepts it. Setup kini idempoten menambahkan key yang belum ada tanpa menimpa nilai lama.
### Note
- Tanpa redeploy pun app tetap jalan dengan default 7 (fallback di server). Menyimpan Settings -> Umum akan membuat baris `overdue_days` otomatis.

## [0.9.3-alpha] - 2026-07-13
### Changed
- Surat Jalan (borrow) is more paper-efficient: Lokasi moved to its own column so each item is a single tight row (~25 items/page instead of ~15), with rows kept from splitting across pages.
### Added
- Pengembalian: the "Cari Transaksi" card now lists the **Top 5 open transactions** (kode - peminjam - tanggal). Click one to load its return checklist without typing an ID. The list refreshes after each return.

## [0.9.2-alpha] - 2026-07-13
### Changed
- Asset detail drawer is now **read-only for user/viewer** (shows lokasi, kondisi, and photo only) — no status/sale/edit/photo-upload/mark-sold controls that would just 403.
- Settings page now shows an "admin only" notice for non-admins reaching it via direct URL (nav already hid it).
- `GET /api/users` (the user roster) is now admin-only.

## [0.9.1-alpha] - 2026-07-13
### Changed
- Login switched from Google OAuth to **email + password** (NextAuth v5 Credentials), verifying against the Users tab via the Apps Script `login` action. No Google Cloud project needed. All role enforcement, route protection, API guards, and "Dibuat oleh" footers are unchanged.
- Login page is now an email/password form; env only needs `AUTH_SECRET` (Google vars removed).
### Added
- Apps Script menu **MAC -> 3) Buat Admin...** to bootstrap the first admin with a hashed password (since passwords aren't hand-computable).

## [0.9.0-alpha] - 2026-07-13
### Added
- **Google Login (NextAuth v5)** restricted to the @cpssoft.com domain, with a /login page and logout in the header.
- **Three roles**: admin (everything), user (borrow/return + view), viewer (read-only). Unlisted @cpssoft.com accounts default to viewer. Roles resolved from the Users tab by email.
- **Access enforcement**: middleware protects all pages (redirect to /login) and returns 401 for unauthenticated API calls; mutating API routes additionally check role server-side (borrow/return require user; add-asset, sell, unit-edit, photo, settings, divisions, users require admin). Nav items, "Tambah Asset", and the sell drawer are hidden/blocked for insufficient roles.
- **"Dibuat oleh: <email>"** footer on both delivery notes; the creator's email is stamped on the record at creation (Transactions "Created By", Sales "Recorded By").
### Backend (Apps Script — redeploy + run Setup once)
- Transactions gains "Created By"; Sales gains "Recorded By". New `role` GET action resolves a user's role by email.
### Setup
- Requires a Google OAuth client + env vars (AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, ALLOWED_EMAIL_DOMAIN). Run `npm install` after unzip (adds next-auth). Bootstrap: add your email to the Users tab with role=admin before first login.

## [0.8.0-alpha] - 2026-07-13
### Added
- **Settings** page with three sections: Divisi (add/remove the dropdown used in Peminjaman), Pengguna (add users, set role admin/user, activate/deactivate, reset password, delete), and Umum (company name for the surat-jalan header, auto-sale age in months).
- Peminjaman form now loads its division list live from Settings (falls back to defaults offline).
### Backend (Apps Script — redeploy + run Setup once)
- New tabs: Divisions (seeded with defaults), Users (Name/Email/Password Hash/Role/Active/Created At), Settings (key-value).
- Actions: `config` + `users` (GET); `setDivisions`, `setSettings`, `addUser`, `updateUser`, `deleteUser`, and `login` (POST). Passwords hashed with SHA-256 + the install token as salt.
### Notes
- Role differences are defined but not yet ENFORCED — enforcement arrives with the login page (next step). The `login` action is already in place server-side.

## [0.7.0-alpha] - 2026-07-13
### Added
- **Sell flow**: clicking a Ready-Dijual card opens a drawer with item detail + a form (nama pembeli, harga jual pre-filled from Rekom, tanggal jual, foto bukti transaksi) and a "Jual Asset Ini" button. On success it produces a printable **sale delivery note** at /surat-jual/[id].
- **Rekap Jual** page (/sales): all sold units with sale-period filter (3 bln / 1 thn / semua), total revenue, unit count, average, search, proof thumbnails, and per-row Surat Jalan reprint. New sidebar item "Rekap Jual".
### Backend (Apps Script — redeploy + run Setup once)
- New **Sales** tab (Sale ID, Unit ID, Item, Group, Buyer, Sale Price, Sale Date, Proof Photo, Recorded At).
- `sellAsset` action: LockService-guarded; generates SALE-YYYYMMDD-###, optionally uploads the proof photo to the Drive folder, records the sale, and locks the unit as "sold" (rejects if borrowed/already sold). `sales` + `sale` GET actions for the recap and delivery note.

## [0.6.0-alpha] - 2026-07-13
### Fixed
- Sidebar "Ready Dijual" pointed at /report; it now has its own route /ready-dijual.
### Added
- **Ready Dijual** marketplace page: card grid with photo, name, umur (from purchase date), pemakaian (times borrowed), harga beli, and rekom harga jual; search + sale-type filter + sort + estimated total value.
- **Tracking period filter** (3 bulan / 1 tahun / sepanjang waktu), driven by a new date-based usage source instead of the cumulative counter.
- **Report** page: summary (transaksi/dipinjam/belum kembali/terlambat), Top Barang + Peminjam + Divisi bars, a "Barang Belum Kembali" table with overdue flags and Surat Jalan reprint, plus CSV export — all with the same period filter.
### Backend (Apps Script — redeploy needed)
- `units` response enriched with Purchase Date + Harga Beli + Rekom Hrg Jual (joined from MASTER, fuzzy header match for the sale-price column).
- New `usage` GET action: per-item borrow counts joined from TransactionItems + Transactions dates, with optional from/to range.

## [0.5.0-alpha] - 2026-07-13
### Changed
- **Dashboard** is now live: 5 stat cards (Total/Dipinjam/Available/Maintenance/Terjual), a 7-month borrow-activity chart, a "Hari Ini" panel (dipinjam/dikembalikan/terlambat), recent transactions, and top borrowed items — all computed from live units + history.
- **History** is now live: searchable, status-filtered transaction table with per-row Surat Jalan reprint.
- **Tracking** is now live: per-item usage aggregated across units (total borrows, unit count, last borrowed), top-10 bars, and a searchable table.
- BorrowActivityChart refactored to accept data via props.
- Added reusable date helpers (`ymd`, `fmtDate`, `todayYMD`) in lib/utils.

## [0.4.1-alpha] - 2026-07-13
### Fixed
- Photo upload error "Tidak dapat memecahkan kode string": client now sends raw base64 (data-URL prefix stripped); Apps Script `uploadPhoto` also strips defensively.
### Added
- Photo upload field in the Tambah Asset form (attached to the first created unit).

## [0.4.0-alpha] - 2026-07-13
### Added
- **Photo upload** on the Asset detail drawer: pick an image, it is compressed in-browser, stored in a Google Drive folder via Apps Script (`uploadPhoto`), and displayed through the private `/api/photo/[id]` proxy. Units gains a `Photo` column.
- **Nama Kegiatan** captured on the borrow form and stored on the transaction (`Kegiatan` column); shown on the Surat Jalan.
### Changed
- Surat Jalan: storage **Lokasi** shown in small text under each unit's Asset No (join is live from Units), plus dates now render as readable `13 Jul 2026` (Asia/Jakarta) instead of raw ISO.
- TransactionItems are enriched on read with each unit's current Lokasi + Photo.

## [0.3.2-alpha] - 2026-07-13
### Added
- **Tambah Asset** on the Asset page: modal to add a brand-new item. Adds a real MASTER row (formulas copied from the last row) and builds its unit(s).
- Auto "No" per group following the existing prefix + padding (e.g. Audio -> A0040), editable/overridable by admin. New groups require a manual No.
- Apps Script `addAsset` action; `/api/asset` route; client + server wrappers. "Harga Beli" added to master header map.

## [0.3.1-alpha] - 2026-07-13
### Added
- Unit detail drawer on Asset page (click a row): view full info; edit lokasi & kondisi; change status; toggle Dijual — all live via `updateUnit`.
- Terminal **sold** status: admin marks a unit "Terjual" (with confirm). Once sold it is locked (all edits rejected), removed from MASTER Available, and unborrowable. "Terjual" status filter added.
### Changed
- Auto sale-by-age rule is now **>= 4 years (48 months)** per accounting (`CONFIG.SALE_AGE_MONTHS`), replacing the LifeSpan-based rule. Below 4 years, sale is admin-manual only.
- `updateUnit` accepts `lokasi`; MASTER Available now also subtracts sold units.

## [0.3.0-alpha] - 2026-07-13
### Added
- MAC-010 Asset page is now LIVE (reads all units from Sheet): search + status/group/sale filters, status & "Dijual" badges.
- MAC-011 Admin actions on Asset page: change unit status (Available / Maintenance / Lost) and toggle the "Dijual" flag — via new `updateUnit` API.
- Apps Script `updateUnit` action; `/api/unit` route; client + server wrappers.
### Changed
- **Sale is now a separate flag** ("" | manual | auto), independent of Status. A unit that is `available` AND for-sale is still borrowable. Status values are now available | borrowed | maintenance | lost.
- Auto sale-by-age: on Build/Refresh Units, units past their LifeSpan get `Sale = auto` (never overwriting `manual`). Toggle with `CONFIG.AUTO_SALE_BY_AGE`.
- Peminjaman picker shows a "Dijual" chip; for-sale available units are selectable.
- Units tab gains a `Sale` column (auto-migrated in place on Setup/Build).

## [0.2.0-alpha] - 2026-07-13
### Added
- MAC-006 Server API layer: server-only Apps Script client that holds the token.
- MAC-006 Route handlers under `/api` (ping, units, history, transaction/[id], borrow, return).
- MAC-007 Peminjaman page: live unit picker, form + checklist, real borrow submit, success screen.
- MAC-008 Surat Jalan: A4 print-ready delivery note at `/surat-jalan/[id]`.
- MAC-009 Pengembalian page: look up by BOR id, verify each unit, submit return.
### Changed
- App restructured into route groups: `(app)` (sidebar/header) and `(print)` (clean, for documents).
- Peminjaman picker lists all units with a status chip; only available units selectable.

## [0.1.0-alpha] - 2026-07-10
### Added
- MAC-001..005 Foundation: Next.js 15 + TS + Tailwind, UI primitives, app shell, dashboard, asset table (dummy).
