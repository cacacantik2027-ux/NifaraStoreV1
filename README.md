# Atelier Nara — Web Storefront (deploy ke Railway)

Folder ini berisi halaman web etalase toko (`public/index.html`),
dibungkus server statis ringan (`serve`) supaya bisa dijalankan di Railway.

## Struktur

```
web-deploy/
├── public/
│   └── index.html     ← halaman web-nya
├── package.json
├── nixpacks.toml
└── README.md
```

## Cara deploy ke Railway

### Opsi A — lewat GitHub (disarankan, auto-update tiap push)

1. Buat repo baru di GitHub, upload semua isi folder ini
2. Di Railway dashboard → **New Project** → **Deploy from GitHub repo** → pilih repo tadi
3. Railway otomatis mendeteksi `package.json` & `nixpacks.toml`, install, lalu jalankan
4. Setelah build selesai, buka tab **Settings** → **Networking** → **Generate Domain**
   untuk dapat URL publik (`https://xxxx.up.railway.app`)

### Opsi B — lewat Railway CLI (tanpa GitHub)

```bash
npm install -g @railway/cli
railway login
cd web-deploy
railway init
railway up
```

Setelah selesai, buka Railway dashboard → project ini → **Settings** →
**Networking** → **Generate Domain** untuk dapat URL publik.

## Setelah dapat URL

Salin URL publiknya (harus diawali `https://`), lalu:

1. Buka bot Telegram Anda
2. Kirim `/settings` → **🌐 Link Web App**
3. Tempel URL tadi

Tombol **🌐 Buka Katalog Web** akan otomatis muncul di menu utama bot.
