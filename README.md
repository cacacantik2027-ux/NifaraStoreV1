# 🛍️ Telegram Online Store Bot

Bot Telegram toko online lengkap dengan fitur live chat admin, daftar produk, dan cara order.

---

## ✨ Fitur

| Fitur | Keterangan |
|---|---|
| 🎉 Halaman sambutan `/start` | Foto toko + deskripsi + 3 tombol menu |
| 🛍️ Daftar produk | List produk dengan tombol per produk |
| 📦 Detail produk | Foto + deskripsi + harga + tombol pesan |
| 💬 Live chat admin | Alur seperti @livegrambot — user & admin saling balas |
| 📋 Cara order | Panduan langkah-langkah order |
| 📢 Broadcast | Admin kirim pesan ke semua user |
| 📊 Status sesi | Admin cek sesi live chat aktif |

---

## 🚀 Deploy ke Railway (Gratis)

### Langkah 1 — Buat akun Railway
Daftar di [railway.app](https://railway.app) (gratis, login dengan GitHub).

### Langkah 2 — Upload kode ke GitHub
1. Buat repo baru di GitHub (boleh private).
2. Upload semua file dari folder ini ke repo tersebut.
3. Pastikan file `.env` **TIDAK** ikut di-upload (sudah ada di `.gitignore`).

### Langkah 3 — Buat project di Railway
1. Klik **New Project → Deploy from GitHub repo**.
2. Pilih repo yang sudah Anda buat.
3. Railway akan otomatis mendeteksi Node.js dan menjalankan `npm install && node bot.js`.

### Langkah 4 — Set Environment Variables
Di Railway, buka project → tab **Variables**, lalu tambahkan:

| Variable | Nilai | Wajib? |
|---|---|---|
| `BOT_TOKEN` | Token dari @BotFather | ✅ |
| `ADMIN_ID` | Numeric ID Telegram Anda | ✅ |
| `ADMIN_USERNAME` | Username Anda (tanpa @) | ✅ |
| `STORE_NAME` | Nama toko | ⬜ |
| `STORE_DESC` | Deskripsi toko | ⬜ |
| `STORE_PHOTO` | URL foto toko | ⬜ |

> **Cara dapat Numeric ID:** Chat @userinfobot di Telegram, kirim `/start`, bot akan balas dengan ID Anda.

### Langkah 5 — Deploy!
Railway otomatis deploy setelah variable disimpan. Bot langsung aktif! 🎉

---

## ✏️ Cara Menambah/Edit Produk

Buka file `bot.js`, cari bagian `PRODUCTS`:

```js
const PRODUCTS = [
  {
    id: 'p1',               // ID unik (jangan sama)
    name: '🧴 Nama Produk', // Nama yang tampil di tombol & detail
    price: 'Rp 50.000',     // Harga
    desc: 'Deskripsi produk...', // Deskripsi lengkap
    photo: '',              // URL foto (boleh kosong)
  },
  // Tambahkan produk baru di sini ↓
  {
    id: 'p4',
    name: '🎁 Produk Baru',
    price: 'Rp 75.000',
    desc: 'Deskripsi produk baru.\n\n✅ Stok tersedia',
    photo: 'https://example.com/foto.jpg',
  },
];
```

Setelah edit, push ke GitHub → Railway otomatis re-deploy.

---

## 💬 Cara Kerja Live Chat (Alur @livegrambot)

```
USER                          BOT                          ADMIN
 │                             │                             │
 │── klik "Hubungi Admin" ────>│                             │
 │                             │── notifikasi sesi baru ────>│
 │<── "Live Chat Aktif!" ──────│                             │
 │                             │                             │
 │── ketik pesan ─────────────>│── forward ke admin ────────>│
 │<── "Pesan terkirim..." ─────│                             │
 │                             │          ADMIN reply ──────>│
 │                             │<── bot terima reply ────────│
 │<── balasan admin ───────────│                             │
 │                             │                             │
 │                             │  Admin klik "Tutup Sesi" ──>│
 │<── "Sesi diakhiri" ─────────│                             │
```

**Admin cukup reply pesan notifikasi** yang dikirim bot — bot otomatis meneruskan ke user yang tepat.

---

## 📟 Perintah Admin

| Perintah | Fungsi |
|---|---|
| `/settings` | Buka menu pengaturan toko (tombol inline): nama toko, deskripsi, foto, info cara order, kelola metode pembayaran, kelola produk — semua tersimpan permanen di `data/settings.json` |
| `/batal` | Batalkan alur edit `/settings` yang sedang berjalan |
| `/payment` | (reply ke pesan user) Kirim pilihan metode pembayaran ke user |
| `/form` | (reply ke pesan user) Kirim form pengiriman ke user |
| `/status` | Lihat semua sesi live chat aktif |
| `/broadcast <pesan>` | Kirim pesan ke semua user yang pernah chat |

### ⚙️ Menu `/settings`

Ketik `/settings` di chat pribadi dengan bot (sebagai admin) untuk membuka menu tombol:

- **✏️ Nama Toko**, **📝 Deskripsi Toko**, **🖼️ Foto Toko**, **📋 Info Cara Order** — kirim nilai baru sebagai balasan, langsung tersimpan.
- **💳 Metode Pembayaran** — tambah metode baru, atau pilih metode yang ada untuk edit nama/ikon/detail rekening, atau hapus.
- **🛍️ Produk** — tambah produk baru (nama, harga, deskripsi, stok, berat — dipandu langkah demi langkah), atau pilih produk yang ada untuk edit tiap field / foto, atau hapus.

Semua perubahan disimpan ke `data/settings.json` sehingga tidak hilang saat bot restart/redeploy. Kalau memasang **Railway Volume**, arahkan `RAILWAY_VOLUME_MOUNT_PATH` ke volume tersebut supaya file ini ikut tersimpan permanen (sama seperti pola di `nixpacks.toml`/Railway pada umumnya).

---

## 🔧 Jalankan Lokal (untuk testing)

```bash
# 1. Install dependensi
npm install

# 2. Salin file env
cp .env.example .env

# 3. Edit .env dengan nilai asli Anda
nano .env

# 4. Jalankan bot
npm start
```

---

## 📁 Struktur File

```
telegram-store-bot/
├── bot.js           ← Kode utama bot
├── package.json     ← Dependensi Node.js
├── nixpacks.toml    ← Konfigurasi Railway
├── .env.example     ← Template environment variables
├── .gitignore       ← Mengecualikan .env & node_modules
└── README.md        ← Panduan ini
```
