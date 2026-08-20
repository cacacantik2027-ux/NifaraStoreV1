# 🛍️ Atelier Nara — Bot Telegram + Web Storefront (1 Project, 1 Deploy)

Bot toko Telegram dan halaman web etalase sekarang jalan dalam **satu proses
Node.js yang sama**, jadi cukup **1 Railway project** untuk keduanya.

```
atelier-nara-store/
├── bot.js           ← Kode bot (v5) + web server statis, jadi satu file proses
├── public/
│   └── index.html   ← Halaman web etalase (dibuka lewat tombol "🌐 Buka Web Store")
├── package.json
├── nixpacks.toml
├── .env.example
├── .gitignore
└── README.md
```

## Cara kerja

Saat `node bot.js` dijalankan, di dalamnya sekarang ada **dua bagian yang
jalan bersamaan**:

1. **Bot Telegram** (polling) — sama seperti sebelumnya.
2. **Web server statis** (pakai modul bawaan Node `http`, tanpa dependency
   tambahan) — menyajikan `public/index.html` di port `process.env.PORT`
   (Railway isi otomatis).

Jadi 1 deploy Railway = 1 URL publik = bot **dan** halaman web jalan bareng.

## Deploy ke Railway (1x saja)

1. Push semua isi folder ini ke satu repo GitHub.
2. Railway → **New Project → Deploy from GitHub repo** → pilih repo ini.
3. Railway otomatis pakai `nixpacks.toml` → `npm install` → `node bot.js`.
4. Isi **Environment Variables** (tab **Variables**):

   | Variable | Wajib? | Keterangan |
   |---|---|---|
   | `BOT_TOKEN` | ✅ | Token dari @BotFather |
   | `ADMIN_ID` | ✅ | Numeric ID Telegram Anda (atau ID grup) |
   | `ADMIN_USERNAME` | ✅ | Username Anda (tanpa @) |
   | `ADMIN_USER_IDS` | ⬜ | Kalau `ADMIN_ID` diisi ID grup — daftar ID admin yang diizinkan |
   | `STORE_NAME`, `STORE_DESC`, `STORE_PHOTO` | ⬜ | Info toko untuk `/start` |
   | `WEBAPP_URL` | ⬜* | *Isi setelah langkah 5 di bawah |

5. Setelah build sukses → tab **Settings → Networking → Generate Domain** →
   salin URL publiknya (`https://xxxx.up.railway.app`).
6. Tempel URL itu ke variable `WEBAPP_URL` (atau lewat `/settings` → **🌐 Link
   Web App** di bot) → simpan/redeploy.
7. Selesai — buka bot, tombol **"🌐 Buka Web Store"** akan muncul dan
   mengarah ke halaman web yang sama-sama jalan di deploy ini.

## Jalankan lokal

```bash
npm install
cp .env.example .env
nano .env          # isi BOT_TOKEN, ADMIN_ID, ADMIN_USERNAME
npm start
# bot aktif + web di http://localhost:3000
```

## Struktur & fitur bot

Sama seperti v5 (live chat admin, `/settings`, kelola produk & metode
pembayaran, broadcast, dll) — lihat komentar di dalam `bot.js` untuk detail
tiap fitur. Semua perubahan lewat `/settings` tetap tersimpan permanen di
`data/settings.json`.
