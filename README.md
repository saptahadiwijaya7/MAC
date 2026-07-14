# Marketing Asset Center (MAC)

Aplikasi internal untuk **peminjaman, pengembalian, dan tracking asset** tim marketing
(kamera, audio, lighting, dsb). Setiap peminjaman punya ID sendiri, bisa dicetak
sebagai surat jalan, dan pemakaian tiap barang dilacak.

> Status: **v0.2.0-alpha** — frontend + live transaction flow (Peminjaman, Surat Jalan, Pengembalian)
> wired to Google Sheets via Apps Script. Dashboard/Asset pages still show sample data (wired next).

## Tech stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript** (strict mode)
- **Tailwind CSS 3** dengan design token kustom
- **lucide-react** untuk ikon
- Chart dashboard dibuat tanpa dependency tambahan (SVG/CSS ringan)

## Menjalankan

```bash
npm install
npm run dev
```

Buka http://localhost:3000

## Menghubungkan ke data (Google Sheets + Apps Script)

1. Deploy backend Apps Script lebih dulu — ikuti `apps-script/DEPLOY.md`.
2. Salin `.env.local.example` menjadi `.env.local`, lalu isi:
   ```
   MAC_APPS_SCRIPT_URL=https://script.google.com/macros/s/…/exec
   MAC_API_TOKEN=token-rahasiamu
   ```
3. Restart `npm run dev`. Buka **Peminjaman** — daftar unit available akan termuat dari Sheet.

Cek koneksi cepat: buka `http://localhost:3000/api/ping` — harus balas `{"ok":true,...}`.

Browser tidak pernah memanggil Apps Script langsung; semua lewat route `/api/*` di server Next.js,
jadi token tetap rahasia dan tidak ada masalah CORS.

```bash
npm run build      # build produksi
npm run start      # jalankan hasil build
npm run typecheck  # cek TypeScript
npm run lint       # cek ESLint
```

## Struktur folder

```
src/
├── app/                 # halaman (App Router)
│   ├── page.tsx         # Dashboard
│   ├── assets/          # daftar asset (tabel)
│   ├── transaction/     # peminjaman & pengembalian
│   ├── history/  tracking/  report/  settings/
│   ├── layout.tsx       # root layout + font + AppShell
│   └── globals.css
├── components/
│   ├── layout/          # Sidebar, Header, AppShell
│   ├── ui/              # Card, Button, StatusBadge, PageHeader, EmptyState
│   └── dashboard/       # StatCard, chart, RecentActivity, TopAssets
├── constants/nav.ts     # menu sidebar
├── data/dummy.ts        # data contoh (akan diganti data asli)
├── lib/utils.ts
└── types/index.ts
```

## Yang sudah ada di v0.1.0-alpha

- Layout aplikasi: sidebar (grouped nav, responsive drawer di mobile), header dengan search.
- Dashboard: 5 kartu statistik, chart Borrow Activity, aktivitas hari ini, riwayat terbaru, top barang.
- Halaman **Asset**: tabel dengan status badge (Available / Borrowed / Maintenance / Ready Sale / Overdue).
- Routing semua halaman utama (halaman lain berupa placeholder rapi).

## Roadmap singkat

Lihat `docs/ROADMAP.md`. Berikutnya: form peminjaman + surat jalan (print A4),
form pengembalian, lalu koneksi ke database asli.
