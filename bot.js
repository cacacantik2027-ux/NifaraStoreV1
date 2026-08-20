require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs   = require('fs');
const path = require('path');

// ══════════════════════════════════════════════════════════════════════
//  KONFIGURASI — nilai default awal (dari Environment Variables di Railway)
//  Setelah bot pernah dijalankan, nilai yang diedit lewat /settings akan
//  disimpan permanen di settings.json dan menggantikan nilai default ini.
// ══════════════════════════════════════════════════════════════════════
const TOKEN       = process.env.BOT_TOKEN;
const ADMIN_ID    = process.env.ADMIN_ID;
const DEFAULT_STORE_NAME  = process.env.STORE_NAME  || 'Toko Online Kami';
const DEFAULT_STORE_DESC  = process.env.STORE_DESC  || 'Kami menyediakan produk berkualitas terbaik dengan harga terjangkau. Kepuasan Anda adalah prioritas kami. 🛍️';
const DEFAULT_STORE_PHOTO = process.env.STORE_PHOTO || '';
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
  },
  {
    id  : 'bri',
    icon: '🏦',
    name: 'BRI',
    detail: '🏦 *Bank BRI*\nNo. Rekening: `0987654321`\nA/N: Nama Pemilik Toko',
  },
  {
    id  : 'mandiri',
    icon: '🏦',
    name: 'Mandiri',
    detail: '🏦 *Bank Mandiri*\nNo. Rekening: `1122334455`\nA/N: Nama Pemilik Toko',
  },
  {
    id  : 'dana',
    icon: '💙',
    name: 'DANA',
    detail: '💙 *DANA*\nNo. HP: `08123456789`\nA/N: Nama Pemilik Toko',
  },
  {
    id  : 'gopay',
    icon: '💚',
    name: 'GoPay',
    detail: '💚 *GoPay*\nNo. HP: `08123456789`\nA/N: Nama Pemilik Toko',
  },
  {
    id  : 'ovo',
    icon: '💜',
    name: 'OVO',
    detail: '💜 *OVO*\nNo. HP: `08123456789`\nA/N: Nama Pemilik Toko',
  },
  {
    id  : 'qris',
    icon: '📲',
    name: 'QRIS',
    detail: '📲 *QRIS*\nScan QR Code di bawah ini:\n_(Admin akan mengirim gambar QR)_',
  },
];

// ══════════════════════════════════════════════════════════════════════
//  FORM PENGIRIMAN
//  Daftar field yang harus diisi pengguna secara berurutan
// ══════════════════════════════════════════════════════════════════════
const FORM_FIELDS = [
  { key: 'nama',     label: 'Nama Lengkap',            hint: 'Contoh: Budi Santoso'                         },
  { key: 'hp',       label: 'No. HP / WhatsApp',       hint: 'Contoh: 08123456789'                          },
  { key: 'produk',   label: 'Produk & Jumlah',         hint: 'Contoh: Produk A x2, Produk B (Size L) x1'   },
  { key: 'alamat',   label: 'Alamat Lengkap',          hint: 'Termasuk nama jalan, RT/RW, kelurahan, kota'  },
  { key: 'provinsi', label: 'Provinsi',                hint: 'Contoh: Jawa Barat'                           },
  { key: 'kodepos',  label: 'Kode Pos',                hint: 'Contoh: 40111'                                },
  { key: 'kurir',    label: 'Pilihan Kurir',           hint: 'JNE / J&T / SiCepat / GoSend / Gojek Instant'},
  { key: 'catatan',  label: 'Catatan Tambahan',        hint: 'Kosongkan jika tidak ada (ketik: -)'          },
];

// ══════════════════════════════════════════════════════════════════════
//  PRODUK (nilai default — bisa ditambah/edit/hapus via /settings)
// ══════════════════════════════════════════════════════════════════════
const DEFAULT_PRODUCTS = [
  {
    id: 'p1',
    name: '🧴 Produk A',
    price: 'Rp 50.000',
    desc:
      'Produk perawatan kulit premium dari bahan alami pilihan.\n' +
      'Cocok untuk semua jenis kulit, aman untuk ibu hamil.\n\n' +
      '📌 *Manfaat:*\n' +
      '• Melembapkan kulit seharian\n' +
      '• Mencerahkan warna kulit secara alami\n' +
      '• Bebas paraben & alkohol',
    stock: '✅ Stok Tersedia',
    weight: '200gr',
    photo: '',
    variants: [],
  },
  {
    id: 'p2',
    name: '👗 Produk B',
    price: 'Mulai Rp 120.000',
    desc:
      'Pakaian kasual modern dengan bahan katun combed 30s.\n' +
      'Ringan, adem, dan nyaman dipakai seharian penuh.\n\n' +
      '📌 *Spesifikasi:*\n' +
      '• Bahan: Katun Combed 30s\n' +
      '• Tersedia ukuran S – XXL\n' +
      '• Banyak pilihan warna',
    stock: '✅ Stok Tersedia',
    weight: '300gr',
    photo: '',
    variants: [
      { name: 'Size S / M', price: 'Rp 120.000' },
      { name: 'Size L / XL', price: 'Rp 130.000' },
      { name: 'Size XXL',    price: 'Rp 145.000' },
    ],
  },
  {
    id: 'p3',
    name: '📱 Produk C',
    price: 'Rp 250.000',
    desc:
      'Aksesoris gadget premium dengan teknologi terkini.\n' +
      'Kompatibel dengan semua smartphone tipe terbaru.\n\n' +
      '📌 *Keunggulan:*\n' +
      '• Fast charging 65W\n' +
      '• Garansi resmi 1 tahun\n' +
      '• Gratis ongkir ke seluruh Indonesia',
    stock: '⚠️ Stok Terbatas',
    weight: '150gr',
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
    paymentMethods : DEFAULT_PAYMENT_METHODS,
    products       : DEFAULT_PRODUCTS,
  };
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const saved = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      return {
        storeName      : saved.storeName      ?? defaults.storeName,
        storeDesc      : saved.storeDesc      ?? defaults.storeDesc,
        storePhoto     : saved.storePhoto     ?? defaults.storePhoto,
        orderInfo      : saved.orderInfo      ?? defaults.orderInfo,
        paymentMethods : Array.isArray(saved.paymentMethods) ? saved.paymentMethods : defaults.paymentMethods,
        products       : Array.isArray(saved.products)       ? saved.products       : defaults.products,
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

function clearAdminEdit() {
  adminEdit = null;
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

function mainMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '🛍️  Daftar Produk',  callback_data: 'menu_products' }],
      [
        { text: '💬  Hubungi Admin', callback_data: 'menu_contact' },
        { text: '📋  Cara Order',    callback_data: 'menu_howto'   },
      ],
    ],
  };
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
  let priceBlock = p.variants && p.variants.length
    ? `\n💰 *Harga:*\n` + p.variants.map((v) => `   • ${v.name}  →  *${v.price}*`).join('\n')
    : `\n💰 *Harga:* ${p.price}`;
  return (
    `━━━━━━━━━━━━━━━━━━━━━━\n${p.name}\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `${p.desc}\n${priceBlock}\n\n📦 Berat: ${p.weight}\n${p.stock}\n\n` +
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
    `Ketik jawaban Anda lalu kirim:`
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
      [{ text: '💳  Metode Pembayaran', callback_data: 'settings_pay' }],
      [{ text: '🛍️  Produk',            callback_data: 'settings_prod' }],
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
    `Ini teks yang akan dilihat user saat memilih metode ini.`
  );
}

function payDetailKeyboard(id) {
  return {
    inline_keyboard: [
      [{ text: '✏️  Edit Nama',              callback_data: `settings_pay_editname_${id}`   }],
      [{ text: '😀  Edit Ikon (emoji)',      callback_data: `settings_pay_editicon_${id}`   }],
      [{ text: '🖊️  Edit Detail/Rekening',   callback_data: `settings_pay_editdetail_${id}` }],
      [{ text: '🗑️  Hapus Metode Ini',       callback_data: `settings_pay_delete_${id}`     }],
      [{ text: '⬅️  Kembali',                callback_data: 'settings_pay'                  }],
    ],
  };
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
      [{ text: '💰  Edit Harga',      callback_data: `settings_prod_edit_price_${id}`  }],
      [{ text: '📝  Edit Deskripsi',  callback_data: `settings_prod_edit_desc_${id}`   }],
      [{ text: '📦  Edit Info Stok',  callback_data: `settings_prod_edit_stock_${id}`  }],
      [{ text: '⚖️  Edit Berat',      callback_data: `settings_prod_edit_weight_${id}` }],
      [{ text: '🖼️  Edit Foto',       callback_data: `settings_prod_edit_photo_${id}`  }],
      [{ text: '🗑️  Hapus Produk Ini',callback_data: `settings_prod_delete_${id}`      }],
      [{ text: '⬅️  Kembali',         callback_data: 'settings_prod'                   }],
    ],
  };
}

/** Set adminEdit lalu minta admin mengirim nilai baru di chat */
async function promptAdminInput(field, promptText, extra = {}) {
  adminEdit = { field, draft: {}, ...extra };
  await bot.sendMessage(ADMIN_ID,
    `${promptText}\n\n_Ketik /batal untuk membatalkan._`,
    { parse_mode: 'Markdown' }
  );
}

bot.onText(/^\/settings(@\S+)?$/, async (msg) => {
  if (!isAdmin(msg.chat.id)) return;
  clearAdminEdit();
  await bot.sendMessage(ADMIN_ID, settingsMainText(), { parse_mode: 'Markdown', reply_markup: settingsMainKeyboard() });
});

bot.onText(/^\/batal(@\S+)?$/, async (msg) => {
  if (!isAdmin(msg.chat.id)) return;
  if (adminEdit) {
    clearAdminEdit();
    await bot.sendMessage(ADMIN_ID, '✅ Dibatalkan.', { parse_mode: 'Markdown' });
  }
});

/** Menangani semua callback_query berawalan "settings_" */
async function handleSettingsCallback(data, chatId, msgId) {
  const editView = async (text, keyboard) => {
    try {
      await bot.editMessageText(text, { chat_id: chatId, message_id: msgId, parse_mode: 'Markdown', reply_markup: keyboard });
    } catch (_) {
      await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: keyboard });
    }
  };

  if (data === 'settings_main') {
    clearAdminEdit();
    await editView(settingsMainText(), settingsMainKeyboard());
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
    await promptAdminInput('storeName', `✏️ Kirim *nama toko* baru.\n\nSaat ini: *${SETTINGS.storeName}*`);
    return;
  }
  if (data === 'settings_edit_storeDesc') {
    await promptAdminInput('storeDesc', `📝 Kirim *deskripsi toko* baru (ditampilkan di pesan /start).\n\nSaat ini:\n${SETTINGS.storeDesc}`);
    return;
  }
  if (data === 'settings_edit_storePhoto') {
    await promptAdminInput('storePhoto', `🖼️ Kirim *foto* baru untuk toko (upload langsung), atau ketik "-" untuk menghapus foto saat ini.`);
    return;
  }
  if (data === 'settings_edit_orderInfo') {
    await promptAdminInput('orderInfo', `📋 Kirim teks *"Cara Order"* baru (boleh pakai format Markdown Telegram: *bold*, _italic_, dll).`);
    return;
  }

  // ── Metode pembayaran ────────────────────────────────────────────
  if (data === 'settings_pay') {
    clearAdminEdit();
    await editView(`💳 *METODE PEMBAYARAN*  (${SETTINGS.paymentMethods.length})\n\nPilih untuk edit, atau tambah metode baru:`, paySettingsKeyboard());
    return;
  }
  if (data === 'settings_pay_add') {
    adminEdit = { field: 'pay_add', step: 'icon', draft: {} };
    await bot.sendMessage(chatId, '1/3 — Kirim *ikon/emoji* untuk metode ini (mis. 🏦 / 💙 / 📲):\n\n_Ketik /batal untuk membatalkan._', { parse_mode: 'Markdown' });
    return;
  }
  if (data.startsWith('settings_pay_view_')) {
    const id     = data.replace('settings_pay_view_', '');
    const method = SETTINGS.paymentMethods.find((m) => m.id === id);
    if (!method) { await bot.sendMessage(chatId, '⚠️ Metode tidak ditemukan (mungkin sudah dihapus).'); return; }
    clearAdminEdit();
    await editView(payDetailText(method), payDetailKeyboard(id));
    return;
  }
  if (data.startsWith('settings_pay_editname_')) {
    const id = data.replace('settings_pay_editname_', '');
    await promptAdminInput('pay_editname', '✏️ Kirim *nama* baru untuk metode ini:', { id });
    return;
  }
  if (data.startsWith('settings_pay_editicon_')) {
    const id = data.replace('settings_pay_editicon_', '');
    await promptAdminInput('pay_editicon', '😀 Kirim *ikon/emoji* baru untuk metode ini:', { id });
    return;
  }
  if (data.startsWith('settings_pay_editdetail_')) {
    const id = data.replace('settings_pay_editdetail_', '');
    await promptAdminInput('pay_editdetail', '🖊️ Kirim *detail pembayaran* baru (no. rekening/HP, atas nama, dll — boleh Markdown):', { id });
    return;
  }
  if (data.startsWith('settings_pay_delete_')) {
    const id  = data.replace('settings_pay_delete_', '');
    const idx = SETTINGS.paymentMethods.findIndex((m) => m.id === id);
    if (idx === -1) { await bot.sendMessage(chatId, '⚠️ Metode tidak ditemukan.'); return; }
    const [removed] = SETTINGS.paymentMethods.splice(idx, 1);
    saveSettings();
    await editView(`🗑️ Metode *${removed.name}* dihapus.\n\n💳 *METODE PEMBAYARAN*  (${SETTINGS.paymentMethods.length})`, paySettingsKeyboard());
    return;
  }

  // ── Produk ────────────────────────────────────────────────────────
  if (data === 'settings_prod') {
    clearAdminEdit();
    await editView(`🛍️ *PRODUK*  (${SETTINGS.products.length})\n\nPilih untuk edit, atau tambah produk baru:`, prodSettingsKeyboard());
    return;
  }
  if (data === 'settings_prod_add') {
    adminEdit = { field: 'prod_add', step: 'name', draft: {} };
    await bot.sendMessage(chatId, '1/5 — Kirim *nama produk* baru:\n\n_Ketik /batal untuk membatalkan._', { parse_mode: 'Markdown' });
    return;
  }
  if (data.startsWith('settings_prod_view_')) {
    const id      = data.replace('settings_prod_view_', '');
    const product = SETTINGS.products.find((p) => p.id === id);
    if (!product) { await bot.sendMessage(chatId, '⚠️ Produk tidak ditemukan (mungkin sudah dihapus).'); return; }
    clearAdminEdit();
    await editView(buildProductText(product), prodDetailKeyboard(id));
    return;
  }
  if (data.startsWith('settings_prod_edit_')) {
    const rest   = data.replace('settings_prod_edit_', '');
    const fields = ['name', 'price', 'desc', 'stock', 'weight', 'photo'];
    const field  = fields.find((f) => rest.startsWith(f + '_'));
    if (!field) return;
    const id      = rest.slice(field.length + 1);
    const product = SETTINGS.products.find((p) => p.id === id);
    if (!product) { await bot.sendMessage(chatId, '⚠️ Produk tidak ditemukan.'); return; }

    const labelMap = { name: 'nama', price: 'harga', desc: 'deskripsi', stock: 'info stok', weight: 'berat' };
    if (field === 'photo') {
      await promptAdminInput('prod_photo', `🖼️ Kirim *foto* baru untuk produk *${product.name}*, atau ketik "-" untuk menghapus foto.`, { id });
    } else {
      await promptAdminInput(`prod_${field}`, `✏️ Kirim *${labelMap[field]}* baru untuk produk *${product.name}*:`, { id });
    }
    return;
  }
  if (data.startsWith('settings_prod_delete_')) {
    const id  = data.replace('settings_prod_delete_', '');
    const idx = SETTINGS.products.findIndex((p) => p.id === id);
    if (idx === -1) { await bot.sendMessage(chatId, '⚠️ Produk tidak ditemukan.'); return; }
    const [removed] = SETTINGS.products.splice(idx, 1);
    saveSettings();
    await editView(`🗑️ Produk *${removed.name}* dihapus.\n\n🛍️ *PRODUK*  (${SETTINGS.products.length})`, prodSettingsKeyboard());
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

  const field = adminEdit.field;
  const text  = msg.text ? msg.text.trim() : null;
  const photo = (msg.photo && msg.photo.length) ? msg.photo[msg.photo.length - 1].file_id : null;

  const backToMain = async (extraText) => {
    clearAdminEdit();
    if (extraText) await bot.sendMessage(ADMIN_ID, extraText, { parse_mode: 'Markdown' });
    await bot.sendMessage(ADMIN_ID, settingsMainText(), { parse_mode: 'Markdown', reply_markup: settingsMainKeyboard() });
  };

  // ── Field toko sederhana (teks) ──────────────────────────────────
  if (field === 'storeName') {
    if (!text) { await bot.sendMessage(ADMIN_ID, '⚠️ Kirim teks nama toko baru (atau /batal).'); return true; }
    SETTINGS.storeName = text;
    saveSettings();
    await backToMain(`✅ Nama toko diubah menjadi *${text}*.`);
    return true;
  }
  if (field === 'storeDesc') {
    if (!text) { await bot.sendMessage(ADMIN_ID, '⚠️ Kirim teks deskripsi toko baru (atau /batal).'); return true; }
    SETTINGS.storeDesc = text;
    saveSettings();
    await backToMain(`✅ Deskripsi toko diperbarui.`);
    return true;
  }
  if (field === 'storePhoto') {
    if (!photo && text !== '-') { await bot.sendMessage(ADMIN_ID, '⚠️ Kirim *foto*, atau ketik "-" untuk menghapus foto (atau /batal).', { parse_mode: 'Markdown' }); return true; }
    SETTINGS.storePhoto = photo || '';
    saveSettings();
    await backToMain(photo ? `✅ Foto toko diperbarui.` : `✅ Foto toko dihapus.`);
    return true;
  }
  if (field === 'orderInfo') {
    if (!text) { await bot.sendMessage(ADMIN_ID, '⚠️ Kirim teks info cara order baru (atau /batal).'); return true; }
    SETTINGS.orderInfo = text;
    saveSettings();
    await backToMain(`✅ Info cara order diperbarui.`);
    return true;
  }

  // ── Metode pembayaran: edit field tunggal ────────────────────────
  if (field === 'pay_editname' || field === 'pay_editicon' || field === 'pay_editdetail') {
    const method = SETTINGS.paymentMethods.find((m) => m.id === adminEdit.id);
    if (!method) { await backToMain('⚠️ Metode tidak ditemukan (mungkin sudah dihapus).'); return true; }
    if (!text) { await bot.sendMessage(ADMIN_ID, '⚠️ Kirim teks (atau /batal).'); return true; }
    if (field === 'pay_editname')   method.name   = text;
    if (field === 'pay_editicon')   method.icon   = text;
    if (field === 'pay_editdetail') method.detail = text;
    saveSettings();
    clearAdminEdit();
    await bot.sendMessage(ADMIN_ID, `✅ Metode *${method.name}* diperbarui.`, { parse_mode: 'Markdown' });
    await bot.sendMessage(ADMIN_ID, payDetailText(method), { parse_mode: 'Markdown', reply_markup: payDetailKeyboard(method.id) });
    return true;
  }

  // ── Metode pembayaran: tambah baru (3 langkah) ───────────────────
  if (field === 'pay_add') {
    if (!text) { await bot.sendMessage(ADMIN_ID, '⚠️ Kirim teks (atau /batal).'); return true; }
    if (adminEdit.step === 'icon') {
      adminEdit.draft.icon = text;
      adminEdit.step = 'name';
      await bot.sendMessage(ADMIN_ID, '2/3 — Kirim *nama* metode pembayaran (mis. "BCA" / "QRIS"):', { parse_mode: 'Markdown' });
      return true;
    }
    if (adminEdit.step === 'name') {
      adminEdit.draft.name = text;
      adminEdit.step = 'detail';
      await bot.sendMessage(ADMIN_ID, '3/3 — Kirim *detail pembayaran* (no. rekening/HP, atas nama, dll — boleh Markdown):', { parse_mode: 'Markdown' });
      return true;
    }
    if (adminEdit.step === 'detail') {
      const newMethod = { id: makeId('pay'), icon: adminEdit.draft.icon, name: adminEdit.draft.name, detail: text };
      SETTINGS.paymentMethods.push(newMethod);
      saveSettings();
      clearAdminEdit();
      await bot.sendMessage(ADMIN_ID, `✅ Metode pembayaran *${newMethod.icon} ${newMethod.name}* ditambahkan.`, { parse_mode: 'Markdown' });
      await bot.sendMessage(ADMIN_ID, `💳 *METODE PEMBAYARAN*  (${SETTINGS.paymentMethods.length})`, { parse_mode: 'Markdown', reply_markup: paySettingsKeyboard() });
      return true;
    }
  }

  // ── Produk: edit field tunggal (teks) ────────────────────────────
  const prodFieldMap = { prod_name: 'name', prod_price: 'price', prod_desc: 'desc', prod_stock: 'stock', prod_weight: 'weight' };
  if (prodFieldMap[field]) {
    const product = SETTINGS.products.find((p) => p.id === adminEdit.id);
    if (!product) { await backToMain('⚠️ Produk tidak ditemukan (mungkin sudah dihapus).'); return true; }
    if (!text) { await bot.sendMessage(ADMIN_ID, '⚠️ Kirim teks (atau /batal).'); return true; }
    product[prodFieldMap[field]] = text;
    saveSettings();
    clearAdminEdit();
    await bot.sendMessage(ADMIN_ID, `✅ Produk *${product.name}* diperbarui.`, { parse_mode: 'Markdown' });
    await bot.sendMessage(ADMIN_ID, buildProductText(product), { parse_mode: 'Markdown', reply_markup: prodDetailKeyboard(product.id) });
    return true;
  }

  // ── Produk: edit foto ─────────────────────────────────────────────
  if (field === 'prod_photo') {
    const product = SETTINGS.products.find((p) => p.id === adminEdit.id);
    if (!product) { await backToMain('⚠️ Produk tidak ditemukan (mungkin sudah dihapus).'); return true; }
    if (!photo && text !== '-') { await bot.sendMessage(ADMIN_ID, '⚠️ Kirim *foto* produk baru, atau ketik "-" untuk menghapus foto (atau /batal).', { parse_mode: 'Markdown' }); return true; }
    product.photo = photo || '';
    saveSettings();
    clearAdminEdit();
    await bot.sendMessage(ADMIN_ID, photo ? `✅ Foto produk *${product.name}* diperbarui.` : `✅ Foto produk *${product.name}* dihapus.`, { parse_mode: 'Markdown' });
    await bot.sendMessage(ADMIN_ID, buildProductText(product), { parse_mode: 'Markdown', reply_markup: prodDetailKeyboard(product.id) });
    return true;
  }

  // ── Produk: tambah baru (5 langkah) ──────────────────────────────
  if (field === 'prod_add') {
    if (!text) { await bot.sendMessage(ADMIN_ID, '⚠️ Kirim teks (atau /batal).'); return true; }
    const steps  = ['name', 'price', 'desc', 'stock', 'weight'];
    const labels = {
      name  : '*nama produk*',
      price : '*harga* (mis. "Rp 50.000")',
      desc  : '*deskripsi* produk',
      stock : '*info stok* (mis. "✅ Stok Tersedia")',
      weight: '*berat* (mis. "200gr")',
    };
    adminEdit.draft[adminEdit.step] = text;
    const idx = steps.indexOf(adminEdit.step);
    if (idx < steps.length - 1) {
      adminEdit.step = steps[idx + 1];
      await bot.sendMessage(ADMIN_ID, `${idx + 2}/${steps.length} — Kirim ${labels[adminEdit.step]}:`, { parse_mode: 'Markdown' });
      return true;
    }
    const d = adminEdit.draft;
    const newProduct = { id: makeId('p'), name: d.name, price: d.price, desc: d.desc, stock: d.stock, weight: d.weight, photo: '', variants: [] };
    SETTINGS.products.push(newProduct);
    saveSettings();
    clearAdminEdit();
    await bot.sendMessage(ADMIN_ID,
      `✅ Produk *${newProduct.name}* ditambahkan!\n\n_Tips: tambahkan foto lewat menu 🖼️ Edit Foto di detail produk ini._`,
      { parse_mode: 'Markdown' }
    );
    await bot.sendMessage(ADMIN_ID, `🛍️ *PRODUK*  (${SETTINGS.products.length})`, { parse_mode: 'Markdown', reply_markup: prodSettingsKeyboard() });
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
  if (String(msg.chat.id) !== String(ADMIN_ID)) return;
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
  if (String(msg.chat.id) !== String(ADMIN_ID)) return;
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
    `Admin meminta Anda mengisi data pengiriman.\n` +
    `Jawab setiap pertanyaan satu per satu.\n\n` +
    formProgressText(state),
    { parse_mode: 'Markdown' }
  );

  await bot.sendMessage(ADMIN_ID,
    `✅ Form pengiriman sudah dikirim ke user \`${userId}\`.`,
    { parse_mode: 'Markdown' });
});

bot.onText(/\/status/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_ID)) return;
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
  if (String(msg.chat.id) !== String(ADMIN_ID)) return;
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

  // ── Pengaturan (/settings) — khusus admin ─────────────────────────
  if (data.startsWith('settings_')) {
    if (!isAdmin(chatId)) return;
    await handleSettingsCallback(data, chatId, msgId);
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
    const text = `🛍️ *DAFTAR PRODUK*\n_${SETTINGS.storeName}_\n\nKami memiliki *${SETTINGS.products.length} produk* unggulan.\nPilih produk untuk melihat detail & harga:`;
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
        await bot.sendPhoto(chatId, product.photo, { caption: text, parse_mode: 'Markdown', reply_markup: keyboard });
      } else {
        try {
          await bot.editMessageText(text, { chat_id: chatId, message_id: msgId, parse_mode: 'Markdown', reply_markup: keyboard });
        } catch (_) {
          await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: keyboard });
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

    const priceInfo = (product.variants && product.variants.length)
      ? product.variants.map((v) => `${v.name}: ${v.price}`).join(' | ')
      : product.price;

    await startLiveChat(chatId, query.from,
      `Halo admin, saya tertarik dengan:\n\n🛍️ *${product.name}*\n💰 ${priceInfo}\n\nMohon informasi lebih lanjut. 🙏`,
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
  //  PESAN DARI ADMIN (teks biasa = reply ke user)
  // ────────────────────────────────────────────────────────────────
  if (chatId === adminId) {
    // ── Input aktif untuk /settings (edit nama/foto/produk/dll) ────
    if (adminEdit) {
      const handled = await handleAdminEditInput(msg);
      if (handled) return;
    }

    if (!msg.text) return; // admin kirim foto/file → abaikan di handler ini
    if (!msg.reply_to_message) return;

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
    ? `\n\n🛍️ *Produk diminati:* ${product.name}\n💰 ${product.price}`
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
