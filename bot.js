require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs   = require('fs');
const path = require('path');
const http = require('http');

// ══════════════════════════════════════════════════════════════════════
//  KONFIGURASI — nilai default awal (dari Environment Variables di Railway)
//  Setelah bot pernah dijalankan, nilai yang diedit lewat /settings akan
//  disimpan permanen di settings.json dan menggantikan nilai default ini.
// ══════════════════════════════════════════════════════════════════════
const TOKEN       = process.env.BOT_TOKEN;
const ADMIN_ID    = process.env.ADMIN_ID;
// ADMIN_USER_IDS: daftar ID Telegram (angka, dipisah koma) yang boleh
// bertindak sebagai admin (reply, approve bukti TF, /settings, dll).
// Dipakai terutama kalau ADMIN_ID diisi ID GRUP, supaya anggota grup lain
// yang bukan admin tidak bisa ikut membalas/mengubah pengaturan.
// Kalau dikosongkan, default-nya hanya ADMIN_ID sendiri yang diizinkan.
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || String(ADMIN_ID))
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const DEFAULT_STORE_NAME  = process.env.STORE_NAME  || 'Toko Online Kami';
const DEFAULT_STORE_DESC  = process.env.STORE_DESC  || 'Kami menyediakan produk berkualitas terbaik dengan harga terjangkau. Kepuasan Anda adalah prioritas kami. 🛍️';
const DEFAULT_STORE_PHOTO = process.env.STORE_PHOTO || '';
// URL Mini App (Telegram Web App) — WAJIB https:// yang sudah online.
// Kosongkan kalau belum punya, tombol "🌐 Buka Web Store" otomatis
// tidak akan muncul sampai URL ini diisi (lewat .env atau /settings).
const DEFAULT_WEBAPP_URL  = process.env.WEBAPP_URL  || '';
const DEFAULT_ORDER_INFO  = process.env.ORDER_INFO  ||
  `📋 *CARA ORDER*\n\n` +
  `1️⃣ Pilih produk dari menu *Daftar Produk*\n` +
  `2️⃣ Klik tombol *🛒 Pesan Sekarang* pada produk pilihan\n` +
  `3️⃣ Anda akan terhubung ke live chat dengan admin\n` +
  `4️⃣ Informasikan nama produk & jumlah yang diinginkan\n` +
  `5️⃣ Admin akan kirim metode pembayaran via perintah /payment\n` +
  `6️⃣ Pilih metode bayar & transfer sesuai nominal\n` +
  `7️⃣ Kirim foto bukti transfer di chat bot\n` +
  `8️⃣ Admin verifikasi & kirim form pengiriman\n` +
  `9️⃣ Isi form, pesanan diproses & dikirim 🚀\n\n` +
  `_⏰ Jam operasional: Senin–Sabtu, 08.00–21.00 WIB_\n` +
  `_📦 Pengiriman via JNE / J&T / SiCepat / GoSend_`;

// ══════════════════════════════════════════════════════════════════════
//  METODE PEMBAYARAN (nilai default — bisa ditambah/edit/hapus via /settings)
// ══════════════════════════════════════════════════════════════════════
const DEFAULT_PAYMENT_METHODS = [
  {
    id  : 'bca',
    icon: '🏦',
    name: 'BCA',
    detail: '🏦 *Bank BCA*\nNo. Rekening: `1234567890`\nA/N: Nama Pemilik Toko',
    photo: '',
  },
  {
    id  : 'bri',
    icon: '🏦',
    name: 'BRI',
    detail: '🏦 *Bank BRI*\nNo. Rekening: `0987654321`\nA/N: Nama Pemilik Toko',
    photo: '',
  },
  {
    id  : 'mandiri',
    icon: '🏦',
    name: 'Mandiri',
    detail: '🏦 *Bank Mandiri*\nNo. Rekening: `1122334455`\nA/N: Nama Pemilik Toko',
    photo: '',
  },
  {
    id  : 'dana',
    icon: '💙',
    name: 'DANA',
    detail: '💙 *DANA*\nNo. HP: `08123456789`\nA/N: Nama Pemilik Toko',
    photo: '',
  },
  {
    id  : 'gopay',
    icon: '💚',
    name: 'GoPay',
    detail: '💚 *GoPay*\nNo. HP: `08123456789`\nA/N: Nama Pemilik Toko',
    photo: '',
  },
  {
    id  : 'ovo',
    icon: '💜',
    name: 'OVO',
    detail: '💜 *OVO*\nNo. HP: `08123456789`\nA/N: Nama Pemilik Toko',
    photo: '',
  },
  {
    id  : 'qris1',
    icon: '📲',
    name: 'QRIS 1',
    detail: '📲 *QRIS 1*\nScan QR Code di bawah ini:\n_(Admin akan mengirim gambar QR lewat /settings)_',
    photo: '',
  },
  {
    id  : 'qris2',
    icon: '📲',
    name: 'QRIS 2',
    detail: '📲 *QRIS 2*\nScan QR Code di bawah ini:\n_(Admin akan mengirim gambar QR lewat /settings)_',
    photo: '',
  },
];

// ══════════════════════════════════════════════════════════════════════
//  TEKS WEBSITE (nilai default — SEMUA bisa diedit dari /settings →
//  📝 Edit Teks Website, tanpa terkecuali). Halaman web mengambil data
//  ini secara otomatis lewat endpoint GET /api/site.
// ══════════════════════════════════════════════════════════════════════
const DEFAULT_SITE_TEXTS = {
  botUsername      : 'nifarastorebot',
  brandMain        : 'NIFARA',
  brandAccent      : 'STORE',

  welcomeText      : 'Selamat datang di Nifara Store',
  welcomeSkip      : 'Lewati',

  navProduk        : 'Produk',
  navAlur          : 'Cara Order',
  navBayar         : 'Pembayaran',
  navCta           : 'Buka di Telegram',

  heroEyebrow      : 'Toko resmi · layanan lewat Telegram',
  heroTitleLine1   : 'Belanja jadi',
  heroTitleAccent  : 'percakapan',
  heroTitleLine2   : ', bukan formulir.',
  heroLede         : 'Pilih produk, chat langsung dengan admin, kirim bukti transfer, isi alamat — semua dalam satu ruang obrolan yang sama. Tidak ada akun, tidak ada keranjang yang hilang.',
  heroCta1         : '💬 Mulai Chat Bot',
  heroCta2         : 'Lihat Produk',
  heroMeta1Value   : '3',
  heroMeta1Label   : 'kategori produk',
  heroMeta2Value   : '8',
  heroMeta2Label   : 'metode bayar',
  heroMeta3Value   : '9',
  heroMeta3Label   : 'langkah, tuntas',

  phoneName        : 'Nifara Store',
  phoneStatus      : 'online · admin membalas cepat',
  phoneBubble1     : 'Selamat datang! Pilih menu Daftar Produk untuk mulai ya 🛍️',
  phoneBubble2     : 'Glow Ritual Serum, ada stok?',
  phoneBubble3     : '✅ Stok tersedia. Klik 🛒 Pesan Sekarang untuk terhubung ke admin.',
  phoneBubble4     : 'Oke, saya pesan 1 ya',
  phoneBubble5     : 'Siap! Silakan pilih metode pembayaran, lalu kirim bukti fotonya di sini 📸',

  videoEmpty         : 'Video belum tersedia — taruh file di /public/media/hero-video.mp4',
  videoCaptionTitle  : 'Nifara Store — cara order',
  videoCaptionMeta   : 'Horizontal · 16:9',

  produkTitle      : 'Produk pilihan',
  produkDesc       : 'Contoh tiga kategori dari katalog bot — perawatan kulit, pakaian, dan aksesoris gadget.',
  produkOrderLabel : 'Pesan sekarang',

  alurTitle        : 'Cara order',
  alurDesc         : 'Ditulis langsung dari alur di bot — bisa dibaca sekali habis, seperti nota belanja.',
  alurNotaLabel    : 'NOTA ALUR PEMESANAN',
  alurNotaTitle    : 'Nifara Store',
  alurStep1Title   : 'Pilih produk',
  alurStep1Desc    : 'Buka menu Daftar Produk dan lihat detailnya.',
  alurStep2Title   : 'Pesan sekarang',
  alurStep2Desc    : 'Tekan tombol 🛒 pada produk yang dipilih.',
  alurStep3Title   : 'Terhubung ke admin',
  alurStep3Desc    : 'Live chat aktif, sebutkan produk & jumlah.',
  alurStep4Title   : 'Pilih metode bayar',
  alurStep4Desc    : 'Admin mengirim daftar rekening & e-wallet.',
  alurStep5Title   : 'Transfer & kirim bukti',
  alurStep5Desc    : 'Foto bukti transfer dikirim langsung di chat.',
  alurStep6Title   : 'Verifikasi admin',
  alurStep6Desc    : 'Bukti diperiksa, biasanya cepat pada jam kerja.',
  alurStep7Title   : 'Isi form pesanan',
  alurStep7Desc    : 'Nama, No. HP, produk, email, hingga catatan tambahan.',
  alurStep8Title   : 'Pesanan diproses',
  alurStep8Desc    : 'Admin memproses & mengirim pesanan Anda.',
  alurFootLeft     : 'Sen–Sab, 08.00–21.00 WIB',
  alurFootRight    : '*** terima kasih ***',

  bayarTitle       : 'Metode pembayaran',
  bayarDesc        : 'Pilihan yang sudah disiapkan di bot — bank, e-wallet, dan QRIS.',
  bayarExtraLabel  : '+ Lainnya',
  bayarExtraDesc   : 'Bisa ditambah admin',

  ctaEyebrow       : 'Siap coba?',
  ctaTitle         : 'Semua transaksi tetap berjalan di ruang obrolan yang sudah Anda kenal.',
  ctaDesc          : 'Halaman ini hanya etalase — pemesanan sesungguhnya tetap terjadi di dalam Telegram, persis seperti yang sudah diatur di bot Anda.',
  ctaButton        : '💬 Buka Bot di Telegram',

  footerText       : '© Nifara Store 2026',
};

// Daftar field teks website + kategori + label — dipakai untuk membangun
// panel "📝 Edit Teks Website" di /settings secara otomatis (generik),
// supaya SEMUA teks di web bisa diedit tanpa perlu tombol manual satu-satu.
const SITE_TEXT_CATEGORIES = [
  { id: 'welcome', label: '👋  Halaman Pembuka' },
  { id: 'nav',   label: '🧭  Navigasi & Link Bot' },
  { id: 'hero',  label: '🎬  Beranda (Hero)'       },
  { id: 'video', label: '📹  Beranda (Video di Hero)'  },
  { id: 'phone', label: '📱  Mockup Chat'           },
  { id: 'produk',label: '🛍️  Bagian Produk'        },
  { id: 'alur',  label: '📋  Bagian Cara Order'     },
  { id: 'bayar', label: '💳  Bagian Pembayaran'     },
  { id: 'cta',   label: '📣  CTA Penutup'           },
  { id: 'footer',label: '🔻  Footer'                },
];

const SITE_TEXT_FIELDS = [
  { key: 'welcomeText',      cat: 'welcome', label: 'Teks animasi halaman pembuka' },
  { key: 'welcomeSkip',      cat: 'welcome', label: 'Label tombol "Lewati"' },

  { key: 'botUsername',      cat: 'nav',   label: 'Username Bot Telegram (tanpa @)' },
  { key: 'brandMain',        cat: 'nav',   label: 'Nama Brand (bagian utama)' },
  { key: 'brandAccent',      cat: 'nav',   label: 'Nama Brand (bagian aksen)' },
  { key: 'navProduk',        cat: 'nav',   label: 'Label menu "Produk"' },
  { key: 'navAlur',          cat: 'nav',   label: 'Label menu "Cara Order"' },
  { key: 'navBayar',         cat: 'nav',   label: 'Label menu "Pembayaran"' },
  { key: 'navCta',           cat: 'nav',   label: 'Label tombol "Buka di Telegram"' },

  { key: 'heroEyebrow',      cat: 'hero',  label: 'Label kecil di atas judul' },
  { key: 'heroTitleLine1',   cat: 'hero',  label: 'Judul baris 1' },
  { key: 'heroTitleAccent',  cat: 'hero',  label: 'Judul kata aksen (miring)' },
  { key: 'heroTitleLine2',   cat: 'hero',  label: 'Judul baris 2 (penutup)' },
  { key: 'heroLede',         cat: 'hero',  label: 'Paragraf pembuka', multiline: true },
  { key: 'heroCta1',         cat: 'hero',  label: 'Tombol utama' },
  { key: 'heroCta2',         cat: 'hero',  label: 'Tombol kedua' },
  { key: 'heroMeta1Value',   cat: 'hero',  label: 'Angka statistik 1' },
  { key: 'heroMeta1Label',   cat: 'hero',  label: 'Keterangan statistik 1' },
  { key: 'heroMeta2Value',   cat: 'hero',  label: 'Angka statistik 2' },
  { key: 'heroMeta2Label',   cat: 'hero',  label: 'Keterangan statistik 2' },
  { key: 'heroMeta3Value',   cat: 'hero',  label: 'Angka statistik 3' },
  { key: 'heroMeta3Label',   cat: 'hero',  label: 'Keterangan statistik 3' },

  { key: 'videoEmpty',        cat: 'video', label: 'Teks saat video belum diunggah' },
  { key: 'videoCaptionTitle', cat: 'video', label: 'Judul kecil di bawah video' },
  { key: 'videoCaptionMeta',  cat: 'video', label: 'Keterangan kecil di bawah video (kanan)' },

  { key: 'phoneName',        cat: 'phone', label: 'Nama toko di mockup chat' },
  { key: 'phoneStatus',      cat: 'phone', label: 'Status online di mockup chat' },
  { key: 'phoneBubble1',     cat: 'phone', label: 'Chat bubble 1 (bot)' },
  { key: 'phoneBubble2',     cat: 'phone', label: 'Chat bubble 2 (user)' },
  { key: 'phoneBubble3',     cat: 'phone', label: 'Chat bubble 3 (bot)' },
  { key: 'phoneBubble4',     cat: 'phone', label: 'Chat bubble 4 (user)' },
  { key: 'phoneBubble5',     cat: 'phone', label: 'Chat bubble 5 (admin)' },

  { key: 'produkTitle',      cat: 'produk',label: 'Judul bagian produk' },
  { key: 'produkDesc',       cat: 'produk',label: 'Deskripsi bagian produk', multiline: true },
  { key: 'produkOrderLabel', cat: 'produk',label: 'Label tombol pesan pada kartu produk' },

  { key: 'alurTitle',        cat: 'alur',  label: 'Judul bagian cara order' },
  { key: 'alurDesc',         cat: 'alur',  label: 'Deskripsi bagian cara order', multiline: true },
  { key: 'alurNotaLabel',    cat: 'alur',  label: 'Label kecil di kepala nota' },
  { key: 'alurNotaTitle',    cat: 'alur',  label: 'Judul nota' },
  { key: 'alurStep1Title',   cat: 'alur',  label: 'Langkah 1 — judul' },
  { key: 'alurStep1Desc',    cat: 'alur',  label: 'Langkah 1 — deskripsi' },
  { key: 'alurStep2Title',   cat: 'alur',  label: 'Langkah 2 — judul' },
  { key: 'alurStep2Desc',    cat: 'alur',  label: 'Langkah 2 — deskripsi' },
  { key: 'alurStep3Title',   cat: 'alur',  label: 'Langkah 3 — judul' },
  { key: 'alurStep3Desc',    cat: 'alur',  label: 'Langkah 3 — deskripsi' },
  { key: 'alurStep4Title',   cat: 'alur',  label: 'Langkah 4 — judul' },
  { key: 'alurStep4Desc',    cat: 'alur',  label: 'Langkah 4 — deskripsi' },
  { key: 'alurStep5Title',   cat: 'alur',  label: 'Langkah 5 — judul' },
  { key: 'alurStep5Desc',    cat: 'alur',  label: 'Langkah 5 — deskripsi' },
  { key: 'alurStep6Title',   cat: 'alur',  label: 'Langkah 6 — judul' },
  { key: 'alurStep6Desc',    cat: 'alur',  label: 'Langkah 6 — deskripsi' },
  { key: 'alurStep7Title',   cat: 'alur',  label: 'Langkah 7 — judul' },
  { key: 'alurStep7Desc',    cat: 'alur',  label: 'Langkah 7 — deskripsi' },
  { key: 'alurStep8Title',   cat: 'alur',  label: 'Langkah 8 — judul' },
  { key: 'alurStep8Desc',    cat: 'alur',  label: 'Langkah 8 — deskripsi' },
  { key: 'alurFootLeft',     cat: 'alur',  label: 'Footer nota (kiri, mis. jam operasional)' },
  { key: 'alurFootRight',    cat: 'alur',  label: 'Footer nota (kanan)' },

  { key: 'bayarTitle',       cat: 'bayar', label: 'Judul bagian pembayaran' },
  { key: 'bayarDesc',        cat: 'bayar', label: 'Deskripsi bagian pembayaran', multiline: true },
  { key: 'bayarExtraLabel',  cat: 'bayar', label: 'Label chip "Lainnya"' },
  { key: 'bayarExtraDesc',   cat: 'bayar', label: 'Keterangan chip "Lainnya"' },

  { key: 'ctaEyebrow',       cat: 'cta',   label: 'Label kecil CTA penutup' },
  { key: 'ctaTitle',         cat: 'cta',   label: 'Judul CTA penutup', multiline: true },
  { key: 'ctaDesc',          cat: 'cta',   label: 'Deskripsi CTA penutup', multiline: true },
  { key: 'ctaButton',        cat: 'cta',   label: 'Tombol CTA penutup' },

  { key: 'footerText',       cat: 'footer',label: 'Teks footer' },
];

// ══════════════════════════════════════════════════════════════════════
//  FORM PENGIRIMAN
//  Daftar field yang harus diisi pengguna secara berurutan
// ══════════════════════════════════════════════════════════════════════
const FORM_FIELDS = [
  { key: 'nama',     label: 'Nama Lengkap',            hint: 'Contoh: Budi Santoso'                         },
  { key: 'hp',       label: 'No. HP / WhatsApp',       hint: 'Contoh: 08123456789'                          },
  { key: 'produk',   label: 'Produk & Jumlah',         hint: 'Contoh: Produk A x2, Produk B (Size L) x1'   },
  { key: 'email',    label: 'Email',                   hint: 'Contoh: nama@email.com'                       },
  { key: 'catatan',  label: 'Catatan Tambahan',        hint: 'Kosongkan jika tidak ada (ketik: -)'          },
];

// ══════════════════════════════════════════════════════════════════════
//  PRODUK (nilai default — bisa ditambah/edit/hapus via /settings)
// ══════════════════════════════════════════════════════════════════════
const DEFAULT_PRODUCTS = [
  {
    id: 'p1',
    name: '🧴 Produk A',
    desc:
      'Produk perawatan kulit premium dari bahan alami pilihan.\n' +
      'Cocok untuk semua jenis kulit, aman untuk ibu hamil.\n\n' +
      '📌 *Manfaat:*\n' +
      '• Melembapkan kulit seharian\n' +
      '• Mencerahkan warna kulit secara alami\n' +
      '• Bebas paraben & alkohol',
    stock: '✅ Stok Tersedia',
    photo: '',
    variants: [],
  },
  {
    id: 'p2',
    name: '👗 Produk B',
    desc:
      'Pakaian kasual modern dengan bahan katun combed 30s.\n' +
      'Ringan, adem, dan nyaman dipakai seharian penuh.\n\n' +
      '📌 *Spesifikasi:*\n' +
      '• Bahan: Katun Combed 30s\n' +
      '• Tersedia ukuran S – XXL\n' +
      '• Banyak pilihan warna',
    stock: '✅ Stok Tersedia',
    photo: '',
    variants: [
      { name: 'Size S / M' },
      { name: 'Size L / XL' },
      { name: 'Size XXL' },
    ],
  },
  {
    id: 'p3',
    name: '📱 Produk C',
    desc:
      'Aksesoris gadget premium dengan teknologi terkini.\n' +
      'Kompatibel dengan semua smartphone tipe terbaru.\n\n' +
      '📌 *Keunggulan:*\n' +
      '• Fast charging 65W\n' +
      '• Garansi resmi 1 tahun\n' +
      '• Gratis ongkir ke seluruh Indonesia',
    stock: '⚠️ Stok Terbatas',
    photo: '',
    variants: [],
  },
  // ─── Tambah produk baru di sini ───────────────────────────────────
];

// ══════════════════════════════════════════════════════════════════════
//  PENYIMPANAN PENGATURAN (persisten) — dipakai oleh /settings
//  Semua yang diedit admin lewat /settings disimpan di settings.json
//  supaya tidak hilang saat bot restart/redeploy.
//  Kalau di Railway sudah pasang Volume, set RAILWAY_VOLUME_MOUNT_PATH
//  agar file ini ikut tersimpan permanen di volume tsb.
// ══════════════════════════════════════════════════════════════════════
const DATA_DIR      = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}

function loadSettings() {
  const defaults = {
    storeName      : DEFAULT_STORE_NAME,
    storeDesc      : DEFAULT_STORE_DESC,
    storePhoto     : DEFAULT_STORE_PHOTO,
    orderInfo      : DEFAULT_ORDER_INFO,
    webappUrl      : DEFAULT_WEBAPP_URL,
    paymentMethods : DEFAULT_PAYMENT_METHODS,
    products       : DEFAULT_PRODUCTS,
    siteTexts      : DEFAULT_SITE_TEXTS,
  };
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const saved = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      const savedPayments = Array.isArray(saved.paymentMethods)
        ? saved.paymentMethods.map((m) => ({ photo: '', ...m }))
        : defaults.paymentMethods;
      return {
        storeName      : saved.storeName      ?? defaults.storeName,
        storeDesc      : saved.storeDesc      ?? defaults.storeDesc,
        storePhoto     : saved.storePhoto     ?? defaults.storePhoto,
        orderInfo      : saved.orderInfo      ?? defaults.orderInfo,
        webappUrl      : saved.webappUrl      ?? defaults.webappUrl,
        paymentMethods : savedPayments,
        products       : Array.isArray(saved.products)       ? saved.products       : defaults.products,
        // Gabungkan default + tersimpan supaya field teks baru otomatis ada
        // walau settings.json lama belum punya key tersebut.
        siteTexts      : { ...defaults.siteTexts, ...(saved.siteTexts || {}) },
      };
    }
  } catch (err) {
    console.error('⚠️ Gagal membaca settings.json, memakai nilai default:', err.message);
  }
  return defaults;
}

let SETTINGS = loadSettings();

function saveSettings() {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(SETTINGS, null, 2));
  } catch (err) {
    console.error('⚠️ Gagal menyimpan settings.json:', err.message);
  }
}

/** Buat id unik sederhana, mis. untuk metode bayar / produk baru */
function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}

// ══════════════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════════════
if (!TOKEN)    throw new Error('❌ BOT_TOKEN belum di-set!');
if (!ADMIN_ID) throw new Error('❌ ADMIN_ID belum di-set!');

const bot = new TelegramBot(TOKEN, { polling: true });
console.log(`✅ Bot "${SETTINGS.storeName}" berjalan...`);

// ID akun bot sendiri — dipakai untuk memastikan pesan yang di-reply admin
// memang notifikasi dari bot, bukan chat antar-admin di grup live chat.
let botId = null;
bot.getMe()
  .then((me) => { botId = me.id; })
  .catch((err) => console.error('⚠️ Gagal mengambil info bot (getMe):', err.message));

// ══════════════════════════════════════════════════════════════════════
//  STATE (in-memory, cukup untuk production Railway)
//
//  sessions[userId]  = true | false          → apakah live chat aktif
//  pendingMsg[adminMsgId] = userId           → routing reply admin→user
//  userNav[userId]   = string                → navigasi terakhir user
//  userRegistry      = Set<userId>           → semua user yang pernah chat
//
//  userState[userId] = {
//    phase : 'chat' | 'awaiting_payment_choice' | 'awaiting_transfer'
//          | 'awaiting_form' | 'form_done'
//    paymentMsgId : msgId (pesan pilihan metode di sisi user, untuk diedit)
//    selectedPayment : id metode bayar
//    form : { fieldIdx: number, data: {} }   → progress pengisian form
//    proofMsgIds : [adminMsgId]              → pesan bukti tf di admin
//  }
// ══════════════════════════════════════════════════════════════════════
const sessions     = {};
const pendingMsg   = {};
const userNav      = {};
const userRegistry = new Set();
const userState    = {};   // state lengkap per user

// ══════════════════════════════════════════════════════════════════════
//  STATE UNTUK /settings (khusus admin)
//
//  adminEdit = null | {
//    field : string   → apa yang sedang diedit, mis. 'storeName',
//                        'storeDesc', 'storePhoto', 'orderInfo',
//                        'pay_detail', 'pay_name', 'prod_name', dst.
//    id    : string    → id metode bayar / produk terkait (kalau ada)
//    step  : string    → sub-langkah untuk alur multi-input (tambah baru)
//    draft : object     → data sementara saat menambah item baru
//  }
// ══════════════════════════════════════════════════════════════════════
let adminEdit = null;

function isAdmin(chatId) {
  return String(chatId) === String(ADMIN_ID);
}

/** True kalau userId (pengirim pesan) ada di daftar admin yang diizinkan */
function isAllowedAdmin(userId) {
  return ADMIN_USER_IDS.includes(String(userId));
}

/**
 * True kalau kombinasi chat + pengirim ini sah dipakai untuk perintah admin
 * seperti /settings — bisa dari GRUP admin (ADMIN_ID) ATAU dari chat
 * PRIBADI seorang admin yang ada di ADMIN_USER_IDS (chat pribadi dengan
 * bot punya chat.id yang sama dengan user.id pengirimnya).
 */
function isAdminContext(chatId, fromId) {
  if (!isAllowedAdmin(fromId)) return false;
  if (String(chatId) === String(ADMIN_ID)) return true;      // grup admin
  if (String(chatId) === String(fromId))   return true;      // chat pribadi admin ybs
  return false;
}

function clearAdminEdit() {
  adminEdit = null;
}

/**
 * True kalau pesan ini datang dari GRUP live chat (ADMIN_ID berupa grup/
 * supergroup Telegram). Dipakai untuk membatasi respons bot di grup ini
 * hanya untuk: reply ke live chat pengguna, /form, dan /payment — selain
 * itu (termasuk /settings, /batal, /status, /broadcast) sengaja TIDAK
 * direspons di grup, supaya obrolan grup tidak "berisik" oleh bot.
 * Perintah-perintah tsb tetap bisa dipakai dari chat PRIBADI admin.
 */
function isLiveChatGroup(chat) {
  return !!chat && (chat.type === 'group' || chat.type === 'supergroup') && String(chat.id) === String(ADMIN_ID);
}

function getState(userId) {
  if (!userState[userId]) {
    userState[userId] = {
      phase           : 'chat',
      paymentMsgId    : null,
      selectedPayment : null,
      form            : { fieldIdx: 0, data: {} },
      proofMsgIds     : [],
    };
  }
  return userState[userId];
}

function resetState(userId) {
  userState[userId] = {
    phase           : 'chat',
    paymentMsgId    : null,
    selectedPayment : null,
    form            : { fieldIdx: 0, data: {} },
    proofMsgIds     : [],
  };
}

// ══════════════════════════════════════════════════════════════════════
//  HELPERS UI
// ══════════════════════════════════════════════════════════════════════

/** Telegram Web App button hanya boleh mengarah ke URL https:// yang valid */
function isValidWebAppUrl(url) {
  return typeof url === 'string' && /^https:\/\//i.test(url.trim());
}

function mainMenuKeyboard() {
  const rows = [
    [{ text: '🛍️  Daftar Produk',  callback_data: 'menu_products' }],
    [
      { text: '💬  Hubungi Admin', callback_data: 'menu_contact' },
      { text: '📋  Cara Order',    callback_data: 'menu_howto'   },
    ],
  ];
  // Tombol Mini App hanya muncul kalau URL web sudah diisi & valid (https://)
  if (isValidWebAppUrl(SETTINGS.webappUrl)) {
    rows.unshift([{ text: '🌐  Buka Web Store', web_app: { url: SETTINGS.webappUrl.trim() } }]);
  }
  return { inline_keyboard: rows };
}

function productsKeyboard() {
  const rows = SETTINGS.products.map((p) => [{ text: p.name, callback_data: `product_${p.id}` }]);
  rows.push([{ text: '🏠  Menu Utama', callback_data: 'menu_main' }]);
  return { inline_keyboard: rows };
}

function productDetailKeyboard(pid, fromCtx = 'products') {
  const backLabel = fromCtx === 'start' ? '🏠  Menu Utama' : '⬅️  Daftar Produk';
  const backData  = fromCtx === 'start' ? 'menu_main'     : 'menu_products';
  return {
    inline_keyboard: [
      [{ text: '🛒  Pesan Sekarang', callback_data: `order_${pid}` }],
      [
        { text: backLabel,         callback_data: backData      },
        { text: '🏠  Menu Utama',  callback_data: 'menu_main'  },
      ],
    ],
  };
}

function buildProductText(p) {
  return (
    `━━━━━━━━━━━━━━━━━━━━━━\n${p.name}\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `${p.desc}\n\n${p.stock}\n\n` +
    `_Klik 🛒 Pesan Sekarang untuk order via live chat_`
  );
}

/** Keyboard pilihan metode pembayaran untuk user */
function paymentKeyboard() {
  const rows = SETTINGS.paymentMethods.map((m) => [
    { text: `${m.icon}  ${m.name}`, callback_data: `pay_choose_${m.id}` },
  ]);
  return { inline_keyboard: rows };
}

/** Teks progress form */
function formProgressText(state) {
  const { fieldIdx, data } = state.form;
  const field = FORM_FIELDS[fieldIdx];
  const total = FORM_FIELDS.length;
  const done  = Object.keys(data).length;

  let progress = FORM_FIELDS.map((f, i) => {
    if (data[f.key]) return `✅ ${f.label}: ${data[f.key]}`;
    if (i === fieldIdx) return `📝 *${f.label}* ← _isi sekarang_`;
    return `⬜ ${f.label}`;
  }).join('\n');

  return (
    `📋 *FORM PENGIRIMAN*  (${done}/${total})\n` +
    `─────────────────────\n` +
    `${progress}\n` +
    `─────────────────────\n\n` +
    `*${field.label}*\n` +
    `_${field.hint}_\n\n` +
    `Ketik jawaban satu persatu lalu kirim:`
  );
}

/** Teks ringkasan form lengkap */
function formSummaryText(data) {
  const lines = FORM_FIELDS.map((f) => `*${f.label}:* ${data[f.key] || '-'}`).join('\n');
  return `📋 *RINGKASAN FORM PENGIRIMAN*\n─────────────────────\n${lines}\n─────────────────────`;
}

// ══════════════════════════════════════════════════════════════════════
//  /settings — PENGATURAN TOKO (khusus admin)
//  Semua alur (identitas toko, cara order, metode bayar, produk) bisa
//  diatur lewat tombol inline di sini, tanpa perlu edit kode / redeploy.
// ══════════════════════════════════════════════════════════════════════

function settingsMainText() {
  return (
    `⚙️ *PENGATURAN TOKO*\n` +
    `─────────────────────\n` +
    `🏪 Nama: *${SETTINGS.storeName}*\n` +
    `🖼️ Foto Toko: ${SETTINGS.storePhoto ? 'terpasang ✅' : '(belum ada)'}\n` +
    `🌐 Web App: ${isValidWebAppUrl(SETTINGS.webappUrl) ? 'terpasang ✅' : '(belum ada)'}\n` +
    `💳 Metode Bayar: ${SETTINGS.paymentMethods.length}\n` +
    `🛍️ Produk: ${SETTINGS.products.length}\n` +
    `─────────────────────\n` +
    `Pilih yang ingin diatur:`
  );
}

function settingsMainKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '✏️  Nama Toko',        callback_data: 'settings_edit_storeName' }],
      [{ text: '📝  Deskripsi Toko',    callback_data: 'settings_edit_storeDesc' }],
      [{ text: '🖼️  Foto Toko',         callback_data: 'settings_edit_storePhoto' }],
      [{ text: '📋  Info Cara Order',   callback_data: 'settings_edit_orderInfo' }],
      [{ text: '🌐  Link Web App',      callback_data: 'settings_edit_webappUrl' }],
      [{ text: '💳  Metode Pembayaran', callback_data: 'settings_pay' }],
      [{ text: '🛍️  Produk',            callback_data: 'settings_prod' }],
      [{ text: '📝  Edit Teks Website', callback_data: 'settings_site' }],
      [{ text: '❌  Tutup',             callback_data: 'settings_close' }],
    ],
  };
}

function paySettingsKeyboard() {
  const rows = SETTINGS.paymentMethods.map((m) => [
    { text: `${m.icon}  ${m.name}`, callback_data: `settings_pay_view_${m.id}` },
  ]);
  rows.push([{ text: '➕  Tambah Metode Bayar', callback_data: 'settings_pay_add' }]);
  rows.push([{ text: '⬅️  Kembali',             callback_data: 'settings_main'  }]);
  return { inline_keyboard: rows };
}

function payDetailText(m) {
  return (
    `💳 *${m.icon} ${m.name}*\n` +
    `─────────────────────\n` +
    `${m.detail}\n` +
    `─────────────────────\n` +
    `🖼️ Foto/QR: ${m.photo ? 'terpasang ✅' : '(belum ada)'}\n` +
    `Ini teks yang akan dilihat user saat memilih metode ini.`
  );
}

function payDetailKeyboard(id) {
  return {
    inline_keyboard: [
      [{ text: '✏️  Edit Nama',              callback_data: `settings_pay_editname_${id}`   }],
      [{ text: '😀  Edit Ikon (emoji)',      callback_data: `settings_pay_editicon_${id}`   }],
      [{ text: '🖊️  Edit Detail/Rekening',   callback_data: `settings_pay_editdetail_${id}` }],
      [{ text: '🖼️  Edit Foto/QR',           callback_data: `settings_pay_editphoto_${id}`  }],
      [{ text: '🗑️  Hapus Metode Ini',       callback_data: `settings_pay_delete_${id}`     }],
      [{ text: '⬅️  Kembali',                callback_data: 'settings_pay'                  }],
    ],
  };
}

// ── Panel generik "📝 Edit Teks Website" (SITE_TEXT_FIELDS/CATEGORIES) ──
function siteCategoriesKeyboard() {
  const rows = SITE_TEXT_CATEGORIES.map((c) => [{ text: c.label, callback_data: `settings_site_cat_${c.id}` }]);
  rows.push([{ text: '⬅️  Kembali', callback_data: 'settings_main' }]);
  return { inline_keyboard: rows };
}

function siteCategoryText(catId) {
  const cat = SITE_TEXT_CATEGORIES.find((c) => c.id === catId);
  return `📝 *${cat ? cat.label : 'Teks Website'}*\n\nPilih teks yang ingin diedit:`;
}

function siteFieldsKeyboard(catId) {
  const fields = SITE_TEXT_FIELDS.filter((f) => f.cat === catId);
  const rows   = fields.map((f) => [{ text: f.label, callback_data: `settings_site_edit_${f.key}` }]);
  rows.push([{ text: '⬅️  Kembali', callback_data: 'settings_site' }]);
  return { inline_keyboard: rows };
}

function prodSettingsKeyboard() {
  const rows = SETTINGS.products.map((p) => [
    { text: p.name, callback_data: `settings_prod_view_${p.id}` },
  ]);
  rows.push([{ text: '➕  Tambah Produk', callback_data: 'settings_prod_add' }]);
  rows.push([{ text: '⬅️  Kembali',       callback_data: 'settings_main'     }]);
  return { inline_keyboard: rows };
}

function prodDetailKeyboard(id) {
  return {
    inline_keyboard: [
      [{ text: '✏️  Edit Nama',       callback_data: `settings_prod_edit_name_${id}`   }],
      [{ text: '📝  Edit Deskripsi',  callback_data: `settings_prod_edit_desc_${id}`   }],
      [{ text: '📦  Edit Info Stok',  callback_data: `settings_prod_edit_stock_${id}`  }],
      [{ text: '🖼️  Edit Foto',       callback_data: `settings_prod_edit_photo_${id}`  }],
      [{ text: '🗑️  Hapus Produk Ini',callback_data: `settings_prod_delete_${id}`      }],
      [{ text: '⬅️  Kembali',         callback_data: 'settings_prod'                   }],
    ],
  };
}

// ── Descriptor tampilan panel /settings — dipakai supaya tombol ❌ Batal
//    dan alur "selesai" bisa kembali persis ke panel sebelumnya ─────────
function settingsViewFor(view) {
  const v = view || { type: 'main' };
  if (v.type === 'pay_list') {
    return { text: `💳 *METODE PEMBAYARAN*  (${SETTINGS.paymentMethods.length})\n\nPilih untuk edit, atau tambah metode baru:`, keyboard: paySettingsKeyboard() };
  }
  if (v.type === 'pay_detail') {
    const m = SETTINGS.paymentMethods.find((x) => x.id === v.id);
    if (!m) return settingsViewFor({ type: 'pay_list' });
    return { text: payDetailText(m), keyboard: payDetailKeyboard(m.id) };
  }
  if (v.type === 'prod_list') {
    return { text: `🛍️ *PRODUK*  (${SETTINGS.products.length})\n\nPilih untuk edit, atau tambah produk baru:`, keyboard: prodSettingsKeyboard() };
  }
  if (v.type === 'prod_detail') {
    const p = SETTINGS.products.find((x) => x.id === v.id);
    if (!p) return settingsViewFor({ type: 'prod_list' });
    return { text: buildProductText(p), keyboard: prodDetailKeyboard(p.id) };
  }
  if (v.type === 'site_cats') {
    return { text: `📝 *EDIT TEKS WEBSITE*\n\nSemua teks yang tampil di halaman web bisa diedit dari sini, dikelompokkan per bagian:`, keyboard: siteCategoriesKeyboard() };
  }
  if (v.type === 'site_fields') {
    return { text: siteCategoryText(v.catId), keyboard: siteFieldsKeyboard(v.catId) };
  }
  return { text: settingsMainText(), keyboard: settingsMainKeyboard() };
}

/**
 * Kirim/edit panel /settings dengan aman. Kalau teks mengandung karakter
 * yang membuat parse Markdown gagal (mis. tanda * atau _ yang tidak
 * berpasangan pada nama/deskripsi produk) — inilah penyebab paling umum
 * panel "macet"/tidak merespons — otomatis dicoba ulang tanpa parse_mode
 * supaya admin tetap bisa melihat & menekan tombolnya.
 */
async function sendPanel(chatId, msgId, text, keyboard) {
  if (msgId) {
    try {
      await bot.editMessageText(text, { chat_id: chatId, message_id: msgId, parse_mode: 'Markdown', reply_markup: keyboard });
      return msgId;
    } catch (_) {
      try {
        await bot.editMessageText(text, { chat_id: chatId, message_id: msgId, reply_markup: keyboard });
        return msgId;
      } catch (_) { /* lanjut ke fallback kirim pesan baru di bawah */ }
    }
  }
  try {
    const sent = await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: keyboard });
    return sent.message_id;
  } catch (_) {
    const sent2 = await bot.sendMessage(chatId, text, { reply_markup: keyboard });
    return sent2.message_id;
  }
}

/** Render (edit-in-place) sebuah panel /settings di pesan yang sudah ada. */
async function renderSettingsView(chatId, msgId, view, prefixText) {
  const { text, keyboard } = settingsViewFor(view);
  const finalText = prefixText ? `${prefixText}\n\n${text}` : text;
  await sendPanel(chatId, msgId, finalText, keyboard);
}

/**
 * Mulai alur input admin (mengetik nilai baru) dengan MENGEDIT panel yang
 * sedang tampil menjadi pertanyaan + tombol ❌ Batal — supaya tidak
 * menumpuk pesan baru, dan menekan Batal bisa kembali ke panel semula.
 */
async function promptAdminInput(chatId, msgId, field, promptText, backView, extra = {}) {
  adminEdit = { field, draft: {}, chatId: String(chatId), backMsgId: msgId, backView, ...extra };
  await updateAdminPrompt(promptText);
}

/** Update teks pertanyaan pada prompt yang sedang aktif (dipakai juga untuk alur multi-langkah). */
async function updateAdminPrompt(promptText) {
  if (!adminEdit) return;
  const text = `${promptText}\n\n_Atau ketik /batal untuk membatalkan._`;
  const kb   = { inline_keyboard: [[{ text: '❌  Batal', callback_data: 'settings_cancel_edit' }]] };
  adminEdit.backMsgId = await sendPanel(adminEdit.chatId, adminEdit.backMsgId, text, kb);
}

bot.onText(/^\/settings(@\S+)?$/, async (msg) => {
  if (isLiveChatGroup(msg.chat)) return;
  if (!isAdminContext(msg.chat.id, msg.from.id)) return;
  clearAdminEdit();
  await bot.sendMessage(msg.chat.id, settingsMainText(), { parse_mode: 'Markdown', reply_markup: settingsMainKeyboard() });
});

bot.onText(/^\/batal(@\S+)?$/, async (msg) => {
  if (isLiveChatGroup(msg.chat)) return;
  if (!isAdminContext(msg.chat.id, msg.from.id)) return;
  if (adminEdit) {
    const { chatId, backMsgId, backView } = adminEdit;
    clearAdminEdit();
    await renderSettingsView(chatId, backMsgId, backView, '✅ Dibatalkan.');
  }
});

/** Menangani semua callback_query berawalan "settings_" */
async function handleSettingsCallback(data, chatId, msgId) {
  const editView = (view, prefixText) => renderSettingsView(chatId, msgId, view, prefixText);

  if (data === 'settings_cancel_edit') {
    const backView = adminEdit ? adminEdit.backView : null;
    clearAdminEdit();
    await editView(backView, '✅ Dibatalkan.');
    return;
  }

  if (data === 'settings_main') {
    clearAdminEdit();
    await editView({ type: 'main' });
    return;
  }

  if (data === 'settings_close') {
    clearAdminEdit();
    try { await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: msgId }); } catch (_) {}
    await bot.sendMessage(chatId, '✅ Pengaturan ditutup. Ketik /settings kapan saja untuk membuka lagi.');
    return;
  }

  // ── Field toko sederhana ─────────────────────────────────────────
  if (data === 'settings_edit_storeName') {
    await promptAdminInput(chatId, msgId, 'storeName', `✏️ Kirim *nama toko* baru.\n\nSaat ini: *${SETTINGS.storeName}*`, { type: 'main' });
    return;
  }
  if (data === 'settings_edit_storeDesc') {
    await promptAdminInput(chatId, msgId, 'storeDesc', `📝 Kirim *deskripsi toko* baru (ditampilkan di pesan /start).\n\nSaat ini:\n${SETTINGS.storeDesc}`, { type: 'main' });
    return;
  }
  if (data === 'settings_edit_storePhoto') {
    await promptAdminInput(chatId, msgId, 'storePhoto', `🖼️ Kirim *foto* baru untuk toko (upload langsung), atau ketik "-" untuk menghapus foto saat ini.`, { type: 'main' });
    return;
  }
  if (data === 'settings_edit_orderInfo') {
    await promptAdminInput(chatId, msgId, 'orderInfo', `📋 Kirim teks *"Cara Order"* baru (boleh pakai format Markdown Telegram: *bold*, _italic_, dll).`, { type: 'main' });
    return;
  }
  if (data === 'settings_edit_webappUrl') {
    await promptAdminInput(chatId, msgId, 'webappUrl',
      `🌐 Kirim *URL Web App* toko Anda (wajib diawali \`https://\`), atau ketik "-" untuk menghapus/menonaktifkan tombolnya.\n\n` +
      `Saat ini: ${SETTINGS.webappUrl ? SETTINGS.webappUrl : '(belum ada)'}\n\n` +
      `_Catatan: URL ini harus sudah online (hasil hosting Netlify/Vercel/GitHub Pages, dll) — bukan file lokal di komputer Anda._`,
      { type: 'main' }
    );
    return;
  }

  // ── Metode pembayaran ────────────────────────────────────────────
  if (data === 'settings_pay') {
    clearAdminEdit();
    await editView({ type: 'pay_list' });
    return;
  }
  if (data === 'settings_pay_add') {
    adminEdit = { field: 'pay_add', step: 'icon', draft: {}, chatId: String(chatId), backMsgId: msgId, backView: { type: 'pay_list' } };
    await updateAdminPrompt('1/3 — Kirim *ikon/emoji* untuk metode ini (mis. 🏦 / 💙 / 📲):');
    return;
  }
  if (data.startsWith('settings_pay_view_')) {
    const id     = data.replace('settings_pay_view_', '');
    const method = SETTINGS.paymentMethods.find((m) => m.id === id);
    if (!method) { await editView({ type: 'pay_list' }, '⚠️ Metode tidak ditemukan (mungkin sudah dihapus).'); return; }
    clearAdminEdit();
    await editView({ type: 'pay_detail', id });
    return;
  }
  if (data.startsWith('settings_pay_editname_')) {
    const id = data.replace('settings_pay_editname_', '');
    await promptAdminInput(chatId, msgId, 'pay_editname', '✏️ Kirim *nama* baru untuk metode ini:', { type: 'pay_detail', id }, { id });
    return;
  }
  if (data.startsWith('settings_pay_editicon_')) {
    const id = data.replace('settings_pay_editicon_', '');
    await promptAdminInput(chatId, msgId, 'pay_editicon', '😀 Kirim *ikon/emoji* baru untuk metode ini:', { type: 'pay_detail', id }, { id });
    return;
  }
  if (data.startsWith('settings_pay_editdetail_')) {
    const id = data.replace('settings_pay_editdetail_', '');
    await promptAdminInput(chatId, msgId, 'pay_editdetail', '🖊️ Kirim *detail pembayaran* baru (no. rekening/HP, atas nama, dll — boleh Markdown):', { type: 'pay_detail', id }, { id });
    return;
  }
  if (data.startsWith('settings_pay_editphoto_')) {
    const id     = data.replace('settings_pay_editphoto_', '');
    const method = SETTINGS.paymentMethods.find((m) => m.id === id);
    if (!method) { await editView({ type: 'pay_list' }, '⚠️ Metode tidak ditemukan.'); return; }
    await promptAdminInput(chatId, msgId, 'pay_editphoto', `🖼️ Kirim *foto QR/pembayaran* baru untuk *${method.name}* (upload langsung), atau ketik "-" untuk menghapus foto.`, { type: 'pay_detail', id }, { id });
    return;
  }
  if (data.startsWith('settings_pay_delete_')) {
    const id  = data.replace('settings_pay_delete_', '');
    const idx = SETTINGS.paymentMethods.findIndex((m) => m.id === id);
    if (idx === -1) { await editView({ type: 'pay_list' }, '⚠️ Metode tidak ditemukan.'); return; }
    const [removed] = SETTINGS.paymentMethods.splice(idx, 1);
    saveSettings();
    await editView({ type: 'pay_list' }, `🗑️ Metode *${removed.name}* dihapus.`);
    return;
  }

  // ── Produk ────────────────────────────────────────────────────────
  if (data === 'settings_prod') {
    clearAdminEdit();
    await editView({ type: 'prod_list' });
    return;
  }
  if (data === 'settings_prod_add') {
    adminEdit = { field: 'prod_add', step: 'name', draft: {}, chatId: String(chatId), backMsgId: msgId, backView: { type: 'prod_list' } };
    await updateAdminPrompt('1/4 — Kirim *nama produk* baru:');
    return;
  }
  if (data.startsWith('settings_prod_view_')) {
    const id      = data.replace('settings_prod_view_', '');
    const product = SETTINGS.products.find((p) => p.id === id);
    if (!product) { await editView({ type: 'prod_list' }, '⚠️ Produk tidak ditemukan (mungkin sudah dihapus).'); return; }
    clearAdminEdit();
    await editView({ type: 'prod_detail', id });
    return;
  }
  if (data.startsWith('settings_prod_edit_')) {
    const rest   = data.replace('settings_prod_edit_', '');
    const fields = ['name', 'desc', 'stock', 'photo'];
    const field  = fields.find((f) => rest.startsWith(f + '_'));
    if (!field) return;
    const id      = rest.slice(field.length + 1);
    const product = SETTINGS.products.find((p) => p.id === id);
    if (!product) { await editView({ type: 'prod_list' }, '⚠️ Produk tidak ditemukan.'); return; }

    const labelMap = { name: 'nama', desc: 'deskripsi', stock: 'info stok' };
    if (field === 'photo') {
      await promptAdminInput(chatId, msgId, 'prod_photo', `🖼️ Kirim *foto* baru untuk produk *${product.name}*, atau ketik "-" untuk menghapus foto.`, { type: 'prod_detail', id }, { id });
    } else {
      await promptAdminInput(chatId, msgId, `prod_${field}`, `✏️ Kirim *${labelMap[field]}* baru untuk produk *${product.name}*:`, { type: 'prod_detail', id }, { id });
    }
    return;
  }
  if (data.startsWith('settings_prod_delete_')) {
    const id  = data.replace('settings_prod_delete_', '');
    const idx = SETTINGS.products.findIndex((p) => p.id === id);
    if (idx === -1) { await editView({ type: 'prod_list' }, '⚠️ Produk tidak ditemukan.'); return; }
    const [removed] = SETTINGS.products.splice(idx, 1);
    saveSettings();
    await editView({ type: 'prod_list' }, `🗑️ Produk *${removed.name}* dihapus.`);
    return;
  }

  // ── Teks Website (generik, semua field dari SITE_TEXT_FIELDS) ───────
  if (data === 'settings_site') {
    clearAdminEdit();
    await editView({ type: 'site_cats' });
    return;
  }
  if (data.startsWith('settings_site_cat_')) {
    const catId = data.replace('settings_site_cat_', '');
    clearAdminEdit();
    await editView({ type: 'site_fields', catId });
    return;
  }
  if (data.startsWith('settings_site_edit_')) {
    const key   = data.replace('settings_site_edit_', '');
    const field = SITE_TEXT_FIELDS.find((f) => f.key === key);
    if (!field) return;
    const current = SETTINGS.siteTexts[key] ?? '';
    await promptAdminInput(
      chatId, msgId, `site_${key}`,
      `✏️ Kirim teks baru untuk *${field.label}*.\n\nSaat ini:\n${current || '_(kosong)_'}`,
      { type: 'site_fields', catId: field.cat }
    );
    return;
  }
}

/**
 * Menangani pesan teks/foto dari admin ketika sedang dalam alur /settings
 * (adminEdit aktif). Mengembalikan true kalau pesan sudah "dikonsumsi" di
 * sini (supaya handler pesan admin biasa tidak ikut memproses).
 */
async function handleAdminEditInput(msg) {
  if (!adminEdit) return false;

  const field   = adminEdit.field;
  const text    = msg.text ? msg.text.trim() : null;
  const photo   = (msg.photo && msg.photo.length) ? msg.photo[msg.photo.length - 1].file_id : null;
  const chatId  = adminEdit.chatId;
  const msgId   = adminEdit.backMsgId;

  // Kirim peringatan validasi TANPA membatalkan alur — cukup balas di
  // chat yang sama, panel prompt (dengan tombol ❌ Batal) tetap tampil.
  const warn = async (text) => { await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' }); };

  // Tutup alur & tampilkan kembali panel tujuan (backView), dengan pesan
  // hasil sebagai prefix — panel lama otomatis "berubah" jadi panel baru.
  const finish = async (view, resultText) => {
    clearAdminEdit();
    await renderSettingsView(chatId, msgId, view, resultText);
  };

  // Lanjut ke langkah berikutnya pada alur multi-input (edit prompt yang sama).
  const nextStep = async (promptText) => { await updateAdminPrompt(promptText); };

  // ── Field toko sederhana (teks) ──────────────────────────────────
  if (field === 'storeName') {
    if (!text) { await warn('⚠️ Kirim teks nama toko baru (atau /batal).'); return true; }
    SETTINGS.storeName = text;
    saveSettings();
    await finish({ type: 'main' }, `✅ Nama toko diubah menjadi *${text}*.`);
    return true;
  }
  if (field === 'storeDesc') {
    if (!text) { await warn('⚠️ Kirim teks deskripsi toko baru (atau /batal).'); return true; }
    SETTINGS.storeDesc = text;
    saveSettings();
    await finish({ type: 'main' }, `✅ Deskripsi toko diperbarui.`);
    return true;
  }
  if (field === 'storePhoto') {
    if (!photo && text !== '-') { await warn('⚠️ Kirim *foto*, atau ketik "-" untuk menghapus foto (atau /batal).'); return true; }
    SETTINGS.storePhoto = photo || '';
    saveSettings();
    await finish({ type: 'main' }, photo ? `✅ Foto toko diperbarui.` : `✅ Foto toko dihapus.`);
    return true;
  }
  if (field === 'orderInfo') {
    if (!text) { await warn('⚠️ Kirim teks info cara order baru (atau /batal).'); return true; }
    SETTINGS.orderInfo = text;
    saveSettings();
    await finish({ type: 'main' }, `✅ Info cara order diperbarui.`);
    return true;
  }
  if (field === 'webappUrl') {
    if (!text) { await warn('⚠️ Kirim teks URL, atau ketik "-" untuk menghapus (atau /batal).'); return true; }
    if (text === '-') {
      SETTINGS.webappUrl = '';
      saveSettings();
      await finish({ type: 'main' }, `✅ Link Web App dihapus. Tombol "🌐 Buka Web Store" tidak akan muncul lagi di menu.`);
      return true;
    }
    if (!isValidWebAppUrl(text)) {
      await warn('⚠️ URL harus diawali `https://` (Telegram menolak URL http:// biasa untuk Web App). Kirim ulang atau /batal.');
      return true;
    }
    SETTINGS.webappUrl = text;
    saveSettings();
    await finish({ type: 'main' }, `✅ Link Web App disimpan. Tombol "🌐 Buka Web Store" sekarang muncul di menu utama.`);
    return true;
  }

  // ── Metode pembayaran: edit field tunggal ────────────────────────
  if (field === 'pay_editname' || field === 'pay_editicon' || field === 'pay_editdetail') {
    const method = SETTINGS.paymentMethods.find((m) => m.id === adminEdit.id);
    if (!method) { await finish({ type: 'pay_list' }, '⚠️ Metode tidak ditemukan (mungkin sudah dihapus).'); return true; }
    if (!text) { await warn('⚠️ Kirim teks (atau /batal).'); return true; }
    if (field === 'pay_editname')   method.name   = text;
    if (field === 'pay_editicon')   method.icon   = text;
    if (field === 'pay_editdetail') method.detail = text;
    saveSettings();
    await finish({ type: 'pay_detail', id: method.id }, `✅ Metode *${method.name}* diperbarui.`);
    return true;
  }

  // ── Metode pembayaran: edit foto/QR ──────────────────────────────
  if (field === 'pay_editphoto') {
    const method = SETTINGS.paymentMethods.find((m) => m.id === adminEdit.id);
    if (!method) { await finish({ type: 'pay_list' }, '⚠️ Metode tidak ditemukan (mungkin sudah dihapus).'); return true; }
    if (!photo && text !== '-') { await warn('⚠️ Kirim *foto*, atau ketik "-" untuk menghapus foto (atau /batal).'); return true; }
    method.photo = photo || '';
    saveSettings();
    await finish({ type: 'pay_detail', id: method.id }, photo ? `✅ Foto *${method.name}* diperbarui.` : `✅ Foto *${method.name}* dihapus.`);
    return true;
  }

  // ── Metode pembayaran: tambah baru (3 langkah) ───────────────────
  if (field === 'pay_add') {
    if (!text) { await warn('⚠️ Kirim teks (atau /batal).'); return true; }
    if (adminEdit.step === 'icon') {
      adminEdit.draft.icon = text;
      adminEdit.step = 'name';
      await nextStep('2/3 — Kirim *nama* metode pembayaran (mis. "BCA" / "QRIS"):');
      return true;
    }
    if (adminEdit.step === 'name') {
      adminEdit.draft.name = text;
      adminEdit.step = 'detail';
      await nextStep('3/3 — Kirim *detail pembayaran* (no. rekening/HP, atas nama, dll — boleh Markdown):');
      return true;
    }
    if (adminEdit.step === 'detail') {
      const newMethod = { id: makeId('pay'), icon: adminEdit.draft.icon, name: adminEdit.draft.name, detail: text, photo: '' };
      SETTINGS.paymentMethods.push(newMethod);
      saveSettings();
      await finish({ type: 'pay_list' }, `✅ Metode pembayaran *${newMethod.icon} ${newMethod.name}* ditambahkan.`);
      return true;
    }
  }

  // ── Produk: edit field tunggal (teks) ────────────────────────────
  const prodFieldMap = { prod_name: 'name', prod_desc: 'desc', prod_stock: 'stock' };
  if (prodFieldMap[field]) {
    const product = SETTINGS.products.find((p) => p.id === adminEdit.id);
    if (!product) { await finish({ type: 'prod_list' }, '⚠️ Produk tidak ditemukan (mungkin sudah dihapus).'); return true; }
    if (!text) { await warn('⚠️ Kirim teks (atau /batal).'); return true; }
    product[prodFieldMap[field]] = text;
    saveSettings();
    await finish({ type: 'prod_detail', id: product.id }, `✅ Produk *${product.name}* diperbarui.`);
    return true;
  }

  // ── Produk: edit foto ─────────────────────────────────────────────
  if (field === 'prod_photo') {
    const product = SETTINGS.products.find((p) => p.id === adminEdit.id);
    if (!product) { await finish({ type: 'prod_list' }, '⚠️ Produk tidak ditemukan (mungkin sudah dihapus).'); return true; }
    if (!photo && text !== '-') { await warn('⚠️ Kirim *foto* produk baru, atau ketik "-" untuk menghapus foto (atau /batal).'); return true; }
    product.photo = photo || '';
    saveSettings();
    await finish({ type: 'prod_detail', id: product.id }, photo ? `✅ Foto produk *${product.name}* diperbarui.` : `✅ Foto produk *${product.name}* dihapus.`);
    return true;
  }

  // ── Produk: tambah baru (4 langkah) ──────────────────────────────
  if (field === 'prod_add') {
    if (!text) { await warn('⚠️ Kirim teks (atau /batal).'); return true; }
    const steps  = ['name', 'desc', 'stock'];
    const labels = {
      name  : '*nama produk*',
      desc  : '*deskripsi* produk',
      stock : '*info stok* (mis. "✅ Stok Tersedia")',
    };
    adminEdit.draft[adminEdit.step] = text;
    const idx = steps.indexOf(adminEdit.step);
    if (idx < steps.length - 1) {
      adminEdit.step = steps[idx + 1];
      await nextStep(`${idx + 2}/${steps.length} — Kirim ${labels[adminEdit.step]}:`);
      return true;
    }
    const d = adminEdit.draft;
    const newProduct = { id: makeId('p'), name: d.name, desc: d.desc, stock: d.stock, photo: '', variants: [] };
    SETTINGS.products.push(newProduct);
    saveSettings();
    await finish({ type: 'prod_list' }, `✅ Produk *${newProduct.name}* ditambahkan!\n_Tips: tambahkan foto lewat menu 🖼️ Edit Foto di detail produk ini._`);
    return true;
  }

  // ── Teks Website (generik) ────────────────────────────────────────
  if (field.startsWith('site_')) {
    const key       = field.slice('site_'.length);
    const fieldMeta = SITE_TEXT_FIELDS.find((f) => f.key === key);
    if (!fieldMeta) return true;
    if (!text) { await warn('⚠️ Kirim teks (atau /batal).'); return true; }
    SETTINGS.siteTexts[key] = text;
    saveSettings();
    await finish({ type: 'site_fields', catId: fieldMeta.cat }, `✅ *${fieldMeta.label}* diperbarui.`);
    return true;
  }

  return false;
}

// ══════════════════════════════════════════════════════════════════════
//  /start
// ══════════════════════════════════════════════════════════════════════
bot.onText(/\/start/, async (msg) => {
  const chatId    = msg.chat.id;
  const userId    = String(chatId);
  const firstName = msg.from.first_name || 'Kak';

  userRegistry.add(userId);
  userNav[userId] = 'start';

  if (sessions[userId]) {
    sessions[userId] = false;
    resetState(userId);
  }

  const caption =
    `✨ *Selamat datang di ${SETTINGS.storeName}!* ✨\n\n` +
    `Halo, *${firstName}* 👋\n\n` +
    `${SETTINGS.storeDesc}\n\n` +
    `Silakan pilih menu di bawah ini untuk memulai:`;

  try {
    if (SETTINGS.storePhoto) {
      await bot.sendPhoto(chatId, SETTINGS.storePhoto, { caption, parse_mode: 'Markdown', reply_markup: mainMenuKeyboard() });
    } else {
      await bot.sendMessage(chatId, caption, { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard() });
    }
  } catch (err) { console.error('Error /start:', err.message); }
});

// ══════════════════════════════════════════════════════════════════════
//  PERINTAH ADMIN (diketik di chat pribadi admin atau di grup live chat)
//  Perintah dikirim admin dengan reply ke pesan notifikasi user,
//  ATAU cukup reply pesan manapun dari sesi user tersebut.
//
//  /payment  → kirim pilihan metode bayar ke user
//  /form     → kirim form pengiriman ke user
//  /status   → lihat sesi aktif
//  /broadcast <msg>
// ══════════════════════════════════════════════════════════════════════

bot.onText(/^\/payment(@\S+)?$/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_ID) || !isAllowedAdmin(msg.from.id)) return;
  if (!msg.reply_to_message) {
    await bot.sendMessage(ADMIN_ID,
      '⚠️ Gunakan perintah ini dengan *reply* ke pesan notifikasi user.',
      { parse_mode: 'Markdown' });
    return;
  }

  const userId = pendingMsg[msg.reply_to_message.message_id];
  if (!userId) {
    await bot.sendMessage(ADMIN_ID,
      '⚠️ Tidak bisa menentukan user. Reply ke pesan notifikasi dari bot.',
      { parse_mode: 'Markdown' });
    return;
  }
  if (!sessions[userId]) {
    await bot.sendMessage(ADMIN_ID, `⚠️ Sesi user \`${userId}\` sudah tidak aktif.`, { parse_mode: 'Markdown' });
    return;
  }

  const state = getState(userId);
  state.phase = 'awaiting_payment_choice';

  // Kirim ke user
  const sentMsg = await bot.sendMessage(
    userId,
    `💳 *PILIH METODE PEMBAYARAN*\n\n` +
    `Admin meminta Anda memilih metode pembayaran.\n` +
    `Silakan pilih salah satu di bawah ini:`,
    { parse_mode: 'Markdown', reply_markup: paymentKeyboard() }
  );
  state.paymentMsgId = sentMsg.message_id;

  await bot.sendMessage(ADMIN_ID,
    `✅ Pilihan metode pembayaran sudah dikirim ke user \`${userId}\`.`,
    { parse_mode: 'Markdown' });
});

bot.onText(/^\/form(@\S+)?$/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_ID) || !isAllowedAdmin(msg.from.id)) return;
  if (!msg.reply_to_message) {
    await bot.sendMessage(ADMIN_ID,
      '⚠️ Gunakan perintah ini dengan *reply* ke pesan notifikasi user.',
      { parse_mode: 'Markdown' });
    return;
  }

  const userId = pendingMsg[msg.reply_to_message.message_id];
  if (!userId) {
    await bot.sendMessage(ADMIN_ID,
      '⚠️ Tidak bisa menentukan user. Reply ke pesan notifikasi dari bot.',
      { parse_mode: 'Markdown' });
    return;
  }
  if (!sessions[userId]) {
    await bot.sendMessage(ADMIN_ID, `⚠️ Sesi user \`${userId}\` sudah tidak aktif.`, { parse_mode: 'Markdown' });
    return;
  }

  const state = getState(userId);
  state.phase = 'awaiting_form';
  state.form  = { fieldIdx: 0, data: {} };

  await bot.sendMessage(
    userId,
    `📋 *FORM PENGIRIMAN*\n\n` +
    `Admin meminta Anda mengisi data pesanan.\n` +
    `Jawab setiap pertanyaan satu per satu.\n\n` +
    formProgressText(state),
    { parse_mode: 'Markdown' }
  );

  await bot.sendMessage(ADMIN_ID,
    `✅ Form pengiriman sudah dikirim ke user \`${userId}\`.`,
    { parse_mode: 'Markdown' });
});

bot.onText(/\/status/, async (msg) => {
  if (isLiveChatGroup(msg.chat)) return;
  if (String(msg.chat.id) !== String(ADMIN_ID) || !isAllowedAdmin(msg.from.id)) return;
  const active = Object.entries(sessions).filter(([, v]) => v).map(([k]) => {
    const st = getState(k);
    return `• \`${k}\`  [${st.phase}]`;
  });
  await bot.sendMessage(
    ADMIN_ID,
    active.length
      ? `🟢 *Sesi aktif (${active.length}):*\n${active.join('\n')}`
      : `⚪ Tidak ada sesi aktif.`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/broadcast (.+)/, async (msg, match) => {
  if (isLiveChatGroup(msg.chat)) return;
  if (String(msg.chat.id) !== String(ADMIN_ID) || !isAllowedAdmin(msg.from.id)) return;
  const text = match[1];
  let ok = 0, fail = 0;
  for (const uid of userRegistry) {
    if (uid === String(ADMIN_ID)) continue;
    try {
      await bot.sendMessage(uid,
        `📢 *Pesan dari ${SETTINGS.storeName}:*\n\n${text}\n\n_Ketik /start untuk membuka menu._`,
        { parse_mode: 'Markdown' });
      ok++;
    } catch (_) { fail++; }
  }
  await bot.sendMessage(ADMIN_ID,
    `✅ *Broadcast selesai*\n✔️ Berhasil: ${ok}\n❌ Gagal: ${fail}`,
    { parse_mode: 'Markdown' });
});

// ══════════════════════════════════════════════════════════════════════
//  CALLBACK QUERY
// ══════════════════════════════════════════════════════════════════════
bot.on('callback_query', async (query) => {
  const chatId  = query.message.chat.id;
  const msgId   = query.message.message_id;
  const data    = query.data;
  const userId  = String(chatId);

  await bot.answerCallbackQuery(query.id).catch(() => {});

  // ── Pengaturan (/settings) — khusus admin (grup ATAU chat pribadi admin) ─
  if (data.startsWith('settings_')) {
    if (isLiveChatGroup(query.message.chat)) return;
    if (!isAdminContext(chatId, query.from.id)) return;
    try {
      await handleSettingsCallback(data, chatId, msgId);
    } catch (err) {
      console.error('⚠️ Error di panel /settings:', err.message);
      // Jangan biarkan panel "macet" tanpa respons — bersihkan sesi edit yang
      // mungkin nyangkut, lalu kembalikan admin ke menu utama /settings.
      clearAdminEdit();
      try {
        await renderSettingsView(chatId, msgId, { type: 'main' }, '⚠️ Terjadi kesalahan saat memuat panel. Sesi edit direset — silakan coba lagi.');
      } catch (_) {
        await bot.sendMessage(chatId, '⚠️ Terjadi kesalahan. Ketik /settings untuk membuka ulang panel.');
      }
    }
    return;
  }

  // ── Menu navigasi ────────────────────────────────────────────────
  if (data === 'menu_main') {
    userNav[userId] = 'start';
    const text = `🏠 *Menu Utama — ${SETTINGS.storeName}*\n\nHalo *${query.from.first_name || 'Kak'}*, ada yang bisa kami bantu? 😊`;
    try {
      await bot.editMessageText(text, { chat_id: chatId, message_id: msgId, parse_mode: 'Markdown', reply_markup: mainMenuKeyboard() });
    } catch (_) {
      await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard() });
    }
    return;
  }

  if (data === 'menu_products') {
    userNav[userId] = 'products';
    const text = `🛍️ *DAFTAR PRODUK*\n_${SETTINGS.storeName}_\n\nKami memiliki *${SETTINGS.products.length} produk* unggulan.\nPilih produk untuk melihat detail:`;
    try {
      await bot.editMessageText(text, { chat_id: chatId, message_id: msgId, parse_mode: 'Markdown', reply_markup: productsKeyboard() });
    } catch (_) {
      await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: productsKeyboard() });
    }
    return;
  }

  if (data === 'menu_howto') {
    const kb = { inline_keyboard: [
      [{ text: '🛍️  Lihat Produk', callback_data: 'menu_products' }],
      [{ text: '🏠  Menu Utama',   callback_data: 'menu_main'     }],
    ]};
    try {
      await bot.editMessageText(SETTINGS.orderInfo, { chat_id: chatId, message_id: msgId, parse_mode: 'Markdown', reply_markup: kb });
    } catch (_) {
      await bot.sendMessage(chatId, SETTINGS.orderInfo, { parse_mode: 'Markdown', reply_markup: kb });
    }
    return;
  }

  if (data === 'menu_contact') {
    if (sessions[userId]) {
      await bot.sendMessage(chatId, `💬 Sesi live chat Anda sedang aktif! Silakan langsung ketik pesan.`);
      return;
    }
    await startLiveChat(chatId, query.from, null, null);
    return;
  }

  // ── Detail produk ────────────────────────────────────────────────
  if (data.startsWith('product_')) {
    const pid     = data.replace('product_', '');
    const product = SETTINGS.products.find((p) => p.id === pid);
    if (!product) return;

    const fromCtx      = userNav[userId] || 'products';
    userNav[userId]    = `product_${pid}`;
    const text         = buildProductText(product);
    const keyboard     = productDetailKeyboard(pid, fromCtx);

    try {
      if (product.photo) {
        try {
          await bot.sendPhoto(chatId, product.photo, { caption: text, parse_mode: 'Markdown', reply_markup: keyboard });
        } catch (_) {
          await bot.sendPhoto(chatId, product.photo, { caption: text, reply_markup: keyboard });
        }
      } else {
        try {
          await bot.editMessageText(text, { chat_id: chatId, message_id: msgId, parse_mode: 'Markdown', reply_markup: keyboard });
        } catch (_) {
          try {
            await bot.editMessageText(text, { chat_id: chatId, message_id: msgId, reply_markup: keyboard });
          } catch (__) {
            try {
              await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: keyboard });
            } catch (___) {
              await bot.sendMessage(chatId, text, { reply_markup: keyboard });
            }
          }
        }
      }
    } catch (err) { console.error('Error detail produk:', err.message); }
    return;
  }

  // ── Order / Live Chat ────────────────────────────────────────────
  if (data.startsWith('order_')) {
    const pid     = data.replace('order_', '');
    const product = SETTINGS.products.find((p) => p.id === pid);
    if (!product) return;

    if (sessions[userId]) {
      await bot.sendMessage(chatId, `💬 Sesi live chat Anda sedang aktif!\nSilakan ketik pesan untuk admin, atau /start untuk menu.`);
      return;
    }

    await startLiveChat(chatId, query.from,
      `Halo admin, saya tertarik dengan:\n\n🛍️ *${product.name}*\n\nMohon informasi lebih lanjut. 🙏`,
      product
    );
    return;
  }

  // ── User memilih metode pembayaran ───────────────────────────────
  if (data.startsWith('pay_choose_')) {
    const payId   = data.replace('pay_choose_', '');
    const method  = SETTINGS.paymentMethods.find((m) => m.id === payId);
    if (!method) return;

    const state = getState(userId);
    if (state.phase !== 'awaiting_payment_choice') return;

    state.selectedPayment = payId;
    state.phase           = 'awaiting_transfer';

    // Edit pesan pilihan menjadi detail rekening
    try {
      await bot.editMessageText(
        `💳 *METODE PEMBAYARAN DIPILIH*\n\n` +
        `${method.detail}\n\n` +
        `─────────────────────\n` +
        `Silakan transfer sesuai nominal yang diminta admin,\n` +
        `lalu *kirim foto bukti transfer* di sini. 📸`,
        { chat_id: chatId, message_id: state.paymentMsgId || msgId, parse_mode: 'Markdown' }
      );
    } catch (_) {
      await bot.sendMessage(chatId,
        `💳 *METODE PEMBAYARAN DIPILIH*\n\n${method.detail}\n\n` +
        `Silakan transfer & *kirim foto bukti transfer* di sini. 📸`,
        { parse_mode: 'Markdown' });
    }

    // Notifikasi ke admin
    const adminId = String(ADMIN_ID);
    const fwd = await bot.sendMessage(adminId,
      `💳 *User Memilih Metode Pembayaran*\n` +
      `🆔 \`${userId}\`\n` +
      `─────────────────────\n` +
      `Metode: *${method.icon} ${method.name}*\n` +
      `─────────────────────\n` +
      `_User sedang melakukan transfer. Menunggu bukti..._`,
      { parse_mode: 'Markdown' }
    );
    pendingMsg[fwd.message_id] = userId;
    return;
  }

  // ── Admin: Approve bukti transfer ───────────────────────────────
  if (data.startsWith('approve_proof_')) {
    if (!isAdmin(chatId) || !isAllowedAdmin(query.from.id)) return;
    const targetUserId = data.replace('approve_proof_', '');
    const adminId      = String(ADMIN_ID);

    // Update tombol di pesan bukti admin
    try {
      await bot.editMessageReplyMarkup(
        { inline_keyboard: [[{ text: '✅ Pembayaran Disetujui', callback_data: 'noop' }]] },
        { chat_id: chatId, message_id: msgId }
      );
    } catch (_) {}

    // Beritahu user
    await bot.sendMessage(targetUserId,
      `✅ *Pembayaran Anda Telah Diverifikasi!*\n\n` +
      `Terima kasih! Pembayaran Anda sudah dikonfirmasi oleh admin.\n\n` +
      `Selanjutnya admin akan mengirimkan form pengiriman untuk melengkapi data Anda. 📋`,
      { parse_mode: 'Markdown' }
    );

    await bot.sendMessage(adminId,
      `✅ Pembayaran user \`${targetUserId}\` sudah diapprove.\n\n` +
      `Selanjutnya kirim perintah */form* (reply ke pesan user) untuk mengirim form pengiriman.`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // ── Admin: Reject bukti transfer ────────────────────────────────
  if (data.startsWith('reject_proof_')) {
    if (!isAdmin(chatId) || !isAllowedAdmin(query.from.id)) return;
    const targetUserId = data.replace('reject_proof_', '');
    const state        = getState(targetUserId);

    try {
      await bot.editMessageReplyMarkup(
        { inline_keyboard: [[{ text: '❌ Pembayaran Ditolak', callback_data: 'noop' }]] },
        { chat_id: chatId, message_id: msgId }
      );
    } catch (_) {}

    state.phase = 'awaiting_transfer'; // kembali tunggu bukti baru

    await bot.sendMessage(targetUserId,
      `❌ *Bukti Transfer Tidak Valid*\n\n` +
      `Maaf, bukti transfer Anda belum bisa kami verifikasi.\n` +
      `Kemungkinan penyebab:\n` +
      `• Foto tidak jelas / terpotong\n` +
      `• Nominal tidak sesuai\n` +
      `• Rekening tujuan salah\n\n` +
      `Silakan kirim ulang foto bukti transfer yang valid. 📸`,
      { parse_mode: 'Markdown' }
    );

    await bot.sendMessage(String(ADMIN_ID),
      `❌ Bukti transfer user \`${targetUserId}\` ditolak. User diminta kirim ulang.`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // ── Admin: tutup sesi ────────────────────────────────────────────
  if (data.startsWith('close_session_')) {
    if (!isAdmin(chatId) || !isAllowedAdmin(query.from.id)) return;
    const targetUserId = data.replace('close_session_', '');
    sessions[targetUserId] = false;
    resetState(targetUserId);

    try {
      await bot.editMessageReplyMarkup(
        { inline_keyboard: [[{ text: '✅ Sesi Ditutup', callback_data: 'noop' }]] },
        { chat_id: chatId, message_id: msgId }
      );
    } catch (_) {}

    await bot.sendMessage(String(ADMIN_ID),
      `✅ Sesi dengan user \`${targetUserId}\` telah ditutup.`,
      { parse_mode: 'Markdown' }
    );

    try {
      await bot.sendMessage(targetUserId,
        `💬 *Sesi live chat telah diakhiri.*\n\n` +
        `Terima kasih telah berbelanja di *${SETTINGS.storeName}*! 🙏\n\n` +
        `Ketik /start untuk kembali ke menu.`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [
            [{ text: '🏠  Kembali ke Menu',   callback_data: 'menu_main'     }],
            [{ text: '🛍️  Lihat Produk Lain', callback_data: 'menu_products' }],
          ]},
        }
      );
    } catch (_) {}
    return;
  }

  if (data === 'noop') return;
});

// ══════════════════════════════════════════════════════════════════════
//  MESSAGE HANDLER — teks & foto
// ══════════════════════════════════════════════════════════════════════
bot.on('message', async (msg) => {
  // Skip perintah slash — sudah ditangani onText
  if (msg.text && msg.text.startsWith('/')) return;

  const chatId  = String(msg.chat.id);
  const adminId = String(ADMIN_ID);

  userRegistry.add(chatId);

  // ────────────────────────────────────────────────────────────────
  //  INPUT UNTUK /settings — bisa datang dari grup admin (ADMIN_ID)
  //  ATAU dari chat pribadi seorang admin (ADMIN_USER_IDS), tergantung
  //  di mana admin tsb memulai /settings / menekan tombol pengaturan.
  // ────────────────────────────────────────────────────────────────
  if (adminEdit && chatId === adminEdit.chatId && isAllowedAdmin(msg.from.id) && !isLiveChatGroup(msg.chat)) {
    let handled = false;
    try {
      handled = await handleAdminEditInput(msg);
    } catch (err) {
      console.error('⚠️ Error saat memproses input /settings:', err.message);
      const stuckChatId = adminEdit.chatId;
      const stuckMsgId  = adminEdit.backMsgId;
      clearAdminEdit();
      try {
        await renderSettingsView(stuckChatId, stuckMsgId, { type: 'main' }, '⚠️ Terjadi kesalahan saat menyimpan. Sesi edit direset — silakan coba lagi.');
      } catch (_) {}
      handled = true;
    }
    if (handled) return;
  }

  // ────────────────────────────────────────────────────────────────
  //  PESAN DARI ADMIN (teks biasa = reply ke user) — khusus di grup
  //  admin (ADMIN_ID), karena notifikasi live chat selalu dikirim ke
  //  sana (pendingMsg hanya valid untuk pesan-pesan di grup ini).
  // ────────────────────────────────────────────────────────────────
  if (chatId === adminId) {
    // Kalau ADMIN_ID adalah grup: abaikan pesan dari anggota yang bukan
    // admin resmi (tidak ada di ADMIN_USER_IDS), supaya obrolan bebas
    // di grup tidak ikut ter-forward/ dianggap balasan ke pembeli.
    if (!isAllowedAdmin(msg.from.id)) return;

    if (!msg.text) return; // admin kirim foto/file → abaikan di handler ini
    if (!msg.reply_to_message) return;

    // Hanya proses sebagai "balasan live chat" kalau pesan yang di-reply
    // memang berasal dari BOT (notifikasi user). Kalau admin reply ke
    // pesan admin lain (obrolan biasa antar-admin di grup), abaikan total
    // — tanpa peringatan — supaya obrolan internal grup tidak terganggu.
    const repliedFrom = msg.reply_to_message.from;
    const isReplyToBot = repliedFrom && (repliedFrom.is_bot === true) &&
      (botId === null || repliedFrom.id === botId);
    if (!isReplyToBot) return;

    const refMsgId = msg.reply_to_message.message_id;
    const userId   = pendingMsg[refMsgId];

    if (!userId) {
      await bot.sendMessage(adminId,
        '⚠️ Tidak bisa menentukan user. Pastikan reply ke pesan notifikasi dari bot.',
        { parse_mode: 'Markdown' });
      return;
    }
    if (!sessions[userId]) {
      await bot.sendMessage(adminId, `⚠️ Sesi user \`${userId}\` sudah tidak aktif.`, { parse_mode: 'Markdown' });
      return;
    }

    try {
      const sentReply = await bot.sendMessage(userId,
        `💬 *Balasan Admin:*\n\n${msg.text}\n\n_Ketik pesan Anda untuk membalas._`,
        { parse_mode: 'Markdown' }
      );
      // Daftarkan pesan balasan admin agar user bisa terus forward
      pendingMsg[sentReply.message_id] = userId; // tidak dipakai tapi harmless
      await bot.sendMessage(adminId, `✅ Terkirim ke user \`${userId}\`.`, { parse_mode: 'Markdown' });
    } catch (err) {
      await bot.sendMessage(adminId, `❌ Gagal kirim: ${err.message}`, { parse_mode: 'Markdown' });
    }
    return;
  }

  // ────────────────────────────────────────────────────────────────
  //  PESAN DARI USER
  // ────────────────────────────────────────────────────────────────
  if (!sessions[chatId]) {
    // Bukan live chat — arahkan ke menu
    if (msg.text) {
      await bot.sendMessage(chatId,
        `Halo! Ketik /start untuk membuka menu utama.`,
        { reply_markup: mainMenuKeyboard() }
      );
    }
    return;
  }

  const state    = getState(chatId);
  const user     = msg.from;
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
  const userLink = user.username ? `@${user.username}` : `ID: \`${chatId}\``;

  // ── Phase: menunggu pengisian form ──────────────────────────────
  if (state.phase === 'awaiting_form') {
    if (!msg.text) {
      await bot.sendMessage(chatId, `⚠️ Mohon ketik jawaban dalam bentuk teks ya!`);
      return;
    }

    const { fieldIdx, data } = state.form;
    const field = FORM_FIELDS[fieldIdx];

    // Simpan jawaban
    data[field.key] = msg.text.trim();
    state.form.fieldIdx++;

    if (state.form.fieldIdx < FORM_FIELDS.length) {
      // Masih ada field berikutnya
      await bot.sendMessage(chatId,
        `✅ *${field.label}* tercatat!\n\n` + formProgressText(state),
        { parse_mode: 'Markdown' }
      );
    } else {
      // Form selesai
      state.phase = 'form_done';
      const summary = formSummaryText(data);

      await bot.sendMessage(chatId,
        `🎉 *Form Pengiriman Lengkap!*\n\n` +
        `${summary}\n\n` +
        `Pesanan Anda sedang diproses oleh admin.\n` +
        `Admin akan segera menghubungi Anda jika ada konfirmasi lebih lanjut. 🚀`,
        { parse_mode: 'Markdown' }
      );

      // Kirim ringkasan ke admin
      const fwd = await bot.sendMessage(adminId,
        `📋 *FORM PENGIRIMAN MASUK*\n` +
        `👤 ${fullName}  (${userLink})\n` +
        `🆔 \`${chatId}\`\n\n` +
        `${summary}`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[
            { text: '❌  Akhiri Sesi', callback_data: `close_session_${chatId}` },
          ]]},
        }
      );
      pendingMsg[fwd.message_id] = chatId;
    }
    return;
  }

  // ── Phase: menunggu bukti transfer (foto) ───────────────────────
  if (state.phase === 'awaiting_transfer') {
    const hasPhoto = msg.photo && msg.photo.length > 0;

    if (!hasPhoto) {
      // User kirim teks saat menunggu bukti transfer — tetap forward sebagai chat biasa
      const fwd = await bot.sendMessage(adminId,
        `📩 *Pesan dari User* (menunggu bukti TF)\n` +
        `👤 ${fullName}  (${userLink})\n` +
        `🆔 \`${chatId}\`\n` +
        `─────────────────\n` +
        `${msg.text || '[bukan teks]'}\n` +
        `─────────────────\n` +
        `_↩️ Reply untuk membalas_`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[
            { text: '❌  Tutup Sesi', callback_data: `close_session_${chatId}` },
          ]]},
        }
      );
      pendingMsg[fwd.message_id] = chatId;

      await bot.sendMessage(chatId,
        `✅ Pesan terkirim ke admin.\n\n` +
        `📸 Jangan lupa kirim *foto bukti transfer* untuk memproses pesanan Anda ya!`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // User kirim foto — anggap bukti transfer
    await bot.sendMessage(chatId,
      `📸 *Bukti transfer diterima!*\n\n` +
      `Sedang diverifikasi oleh admin. Mohon tunggu sebentar... ⏳`,
      { parse_mode: 'Markdown' }
    );

    // Teruskan foto ke admin dengan tombol Approve / Reject
    const bestPhoto = msg.photo[msg.photo.length - 1]; // resolusi tertinggi
    const caption   =
      `📸 *BUKTI TRANSFER MASUK*\n` +
      `👤 ${fullName}  (${userLink})\n` +
      `🆔 \`${chatId}\`\n` +
      `─────────────────────\n` +
      `Metode: ${state.selectedPayment
        ? SETTINGS.paymentMethods.find((m) => m.id === state.selectedPayment)?.name || state.selectedPayment
        : 'tidak diketahui'}\n` +
      `─────────────────────\n` +
      `Pilih tindakan:`;

    const sentProof = await bot.sendPhoto(adminId, bestPhoto.file_id, {
      caption,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[
        { text: '✅  Approve',  callback_data: `approve_proof_${chatId}` },
        { text: '❌  Reject',   callback_data: `reject_proof_${chatId}`  },
      ],[
        { text: '🔚  Tutup Sesi', callback_data: `close_session_${chatId}` },
      ]]},
    });
    pendingMsg[sentProof.message_id] = chatId;
    state.proofMsgIds.push(sentProof.message_id);
    return;
  }

  // ── Phase: chat biasa (default) ─────────────────────────────────
  const hasPhoto = msg.photo && msg.photo.length > 0;

  if (hasPhoto) {
    // User kirim foto di fase chat biasa — forward foto ke admin
    const bestPhoto = msg.photo[msg.photo.length - 1];
    const fwd = await bot.sendPhoto(adminId, bestPhoto.file_id, {
      caption:
        `🖼️ *Foto dari User*\n` +
        `👤 ${fullName}  (${userLink})\n` +
        `🆔 \`${chatId}\`\n` +
        `${msg.caption ? `\nKeterangan: ${msg.caption}` : ''}\n\n` +
        `_↩️ Reply teks untuk membalas_`,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[
        { text: '❌  Tutup Sesi', callback_data: `close_session_${chatId}` },
      ]]},
    });
    pendingMsg[fwd.message_id] = chatId;
    await bot.sendMessage(chatId, `✅ Foto terkirim ke admin. Mohon tunggu balasan. 🙏`);
    return;
  }

  if (!msg.text) return;

  // Teks biasa di fase chat
  const fwd = await bot.sendMessage(adminId,
    `📩 *Pesan dari User*\n` +
    `👤 ${fullName}  (${userLink})\n` +
    `🆔 \`${chatId}\`\n` +
    `─────────────────\n` +
    `${msg.text}\n` +
    `─────────────────\n` +
    `_↩️ Reply pesan ini untuk membalas_`,
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[
        { text: '❌  Tutup Sesi', callback_data: `close_session_${chatId}` },
      ]]},
    }
  );
  pendingMsg[fwd.message_id] = chatId;
  await bot.sendMessage(chatId, `✅ Pesan Anda sudah dikirim ke admin. Mohon tunggu balasan sebentar ya! 🙏`);
});

// ══════════════════════════════════════════════════════════════════════
//  FUNGSI: startLiveChat
// ══════════════════════════════════════════════════════════════════════
async function startLiveChat(chatId, fromUser, presetMessage, product) {
  const adminId  = String(ADMIN_ID);
  const userId   = String(chatId);

  sessions[userId] = true;
  resetState(userId);

  const fullName = [fromUser.first_name, fromUser.last_name].filter(Boolean).join(' ');
  const userLink = fromUser.username ? `@${fromUser.username}` : `ID: \`${userId}\``;

  await bot.sendMessage(chatId,
    `💬 *Live Chat Aktif!*\n\n` +
    `Anda sekarang terhubung dengan admin *${SETTINGS.storeName}*.\n\n` +
    `📝 Ketik pesan Anda — admin akan segera membalas.\n` +
    `_Ketik /start untuk kembali ke menu._`,
    { parse_mode: 'Markdown' }
  );

  const productInfo = product
    ? `\n\n🛍️ *Produk diminati:* ${product.name}`
    : '';

  const notif = await bot.sendMessage(adminId,
    `🔔 *LIVE CHAT BARU!*\n` +
    `─────────────────\n` +
    `👤 ${fullName}  (${userLink})\n` +
    `🆔 \`${userId}\`` +
    `${productInfo}\n` +
    `─────────────────\n` +
    `${presetMessage ? `📝 *Pesan awal:*\n${presetMessage}` : '_(User menghubungi tanpa pesan awal)_'}\n` +
    `─────────────────\n` +
    `*Perintah admin yang tersedia:*\n` +
    `• /payment — kirim pilihan metode bayar ke user\n` +
    `• /form — kirim form pengiriman ke user\n\n` +
    `_↩️ Reply pesan ini untuk membalas_`,
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[
        { text: '❌  Akhiri Sesi', callback_data: `close_session_${userId}` },
      ]]},
    }
  );
  pendingMsg[notif.message_id] = userId;

  if (presetMessage) {
    const fwd = await bot.sendMessage(adminId,
      `📩 *Pesan Otomatis dari User*\n` +
      `👤 ${fullName}  (${userLink})\n` +
      `🆔 \`${userId}\`\n` +
      `─────────────────\n` +
      `${presetMessage}\n` +
      `─────────────────\n` +
      `_↩️ Reply pesan ini untuk membalas_`,
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[
          { text: '❌  Akhiri Sesi', callback_data: `close_session_${userId}` },
        ]]},
      }
    );
    pendingMsg[fwd.message_id] = userId;
  }
}

// ══════════════════════════════════════════════════════════════════════
//  ERROR HANDLING
// ══════════════════════════════════════════════════════════════════════
bot.on('polling_error', (err) => console.error('Polling error:', err.message));
process.on('uncaughtException',  (err) => console.error('Uncaught:',   err.message));
process.on('unhandledRejection', (err) => console.error('Rejection:',  err?.message));

// ══════════════════════════════════════════════════════════════════════
//  WEB SERVER — menyajikan halaman etalase (public/index.html) dari
//  proses yang SAMA dengan bot, supaya cukup 1 deploy Railway saja.
//  URL publiknya (setelah "Generate Domain" di Railway) itulah yang
//  dimasukkan ke WEBAPP_URL / /settings → 🌐 Link Web App.
// ══════════════════════════════════════════════════════════════════════
const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css' : 'text/css; charset=utf-8',
  '.js'  : 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png' : 'image/png',
  '.jpg' : 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg' : 'image/svg+xml',
  '.ico' : 'image/x-icon',
  '.webp': 'image/webp',
  '.mp4' : 'video/mp4',
  '.webm': 'video/webm',
  '.ogg' : 'video/ogg',
  '.mov' : 'video/quicktime',
};

/**
 * Bungkus file_id foto Telegram (storePhoto / produk / metode bayar) jadi
 * URL yang bisa dipakai langsung sebagai <img src> di halaman web publik,
 * lewat endpoint proxy GET /photo/:fileId di bawah.
 */
function photoUrl(fileId) {
  return fileId ? `/photo/${encodeURIComponent(fileId)}` : '';
}

/** Data publik untuk halaman web — otomatis mengikuti settings.json bot. */
function buildPublicSiteData() {
  return {
    storeName  : SETTINGS.storeName,
    storeDesc  : SETTINGS.storeDesc,
    storePhoto : photoUrl(SETTINGS.storePhoto),
    webappUrl  : isValidWebAppUrl(SETTINGS.webappUrl) ? SETTINGS.webappUrl : '',
    orderInfo  : SETTINGS.orderInfo,
    texts      : SETTINGS.siteTexts,
    paymentMethods: SETTINGS.paymentMethods.map((m) => ({
      id: m.id, icon: m.icon, name: m.name, detail: m.detail, photo: photoUrl(m.photo),
    })),
    // Harga sengaja TIDAK disertakan — halaman web tidak menampilkan harga.
    products: SETTINGS.products.map((p) => ({
      id: p.id, name: p.name, desc: p.desc, stock: p.stock, photo: photoUrl(p.photo),
    })),
  };
}

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);

  // ── API publik: data toko otomatis dari settings.json ─────────────
  if (reqPath === '/api/site') {
    const body = JSON.stringify(buildPublicSiteData());
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(body);
    return;
  }

  // ── Proxy foto Telegram (file_id) → gambar asli, supaya bisa dipakai
  //    sebagai <img src> di browser tanpa mengekspos BOT_TOKEN ────────
  if (reqPath.startsWith('/photo/')) {
    const fileId = decodeURIComponent(reqPath.replace('/photo/', ''));
    if (!fileId) { res.writeHead(404); res.end('Not found'); return; }
    bot.getFileLink(fileId)
      .then((url) => {
        res.writeHead(302, { Location: url });
        res.end();
      })
      .catch(() => {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Foto tidak ditemukan');
      });
    return;
  }

  // Halaman pembuka (animasi typing) tampil dulu saat domain dibuka
  // langsung — Beranda asli tetap bisa diakses langsung di /index.html.
  if (reqPath === '/') reqPath = '/welcome.html';

  // Cegah path traversal (mis. "/../.env") — pastikan hasil akhir tetap di dalam PUBLIC_DIR
  const filePath = path.normalize(path.join(PUBLIC_DIR, reqPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Fallback ke index.html (single-page site) kalau file tidak ditemukan
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, indexData) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('404 — Halaman tidak ditemukan');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(indexData);
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

const PORT = process.env.PORT || 3000;
// Kalau web server gagal listen (mis. port bentrok), jangan sampai
// mematikan seluruh proses — bot Telegram (polling) harus tetap jalan.
server.on('error', (err) => console.error('⚠️ Web server error:', err.message));
server.listen(PORT, () => {
  console.log(`🌐 Web storefront jalan di port ${PORT}`);
});
