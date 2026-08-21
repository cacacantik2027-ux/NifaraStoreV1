/**
 * site.js — diambil oleh semua halaman.
 * Mengambil data toko (nama, deskripsi, produk, metode bayar, SEMUA teks
 * website) langsung dari settings.json bot lewat endpoint GET /api/site,
 * jadi halaman web ini otomatis mengikuti apa pun yang diedit admin lewat
 * perintah /settings di bot Telegram — tanpa perlu edit file HTML.
 */
async function loadSiteData() {
  const res = await fetch('/api/site', { cache: 'no-store' });
  if (!res.ok) throw new Error('Gagal memuat data toko');
  return res.json();
}

function tgLink(username, path) {
  const u = (username || '').replace(/^@/, '').trim() || 'nifarastorebot';
  return `https://t.me/${u}${path || ''}`;
}

/** Render nav bar + footer yang sama di semua halaman. */
function renderChrome(data, activePage, titleSuffix) {
  const t = data.texts || {};
  const botUrl = tgLink(t.botUsername);

  document.querySelectorAll('[data-brand-main]').forEach((el) => (el.textContent = t.brandMain || 'NIFARA'));
  document.querySelectorAll('[data-brand-accent]').forEach((el) => (el.textContent = t.brandAccent || 'STORE'));

  const navMap = {
    produk: t.navProduk || 'Produk',
    alur  : t.navAlur   || 'Cara Order',
    bayar : t.navBayar  || 'Pembayaran',
  };
  document.querySelectorAll('[data-nav]').forEach((el) => {
    const key = el.getAttribute('data-nav');
    if (navMap[key] != null) el.textContent = navMap[key];
    if (key === activePage) el.classList.add('active');
  });

  document.querySelectorAll('[data-nav-cta]').forEach((el) => {
    el.textContent = t.navCta || 'Buka di Telegram';
    el.href = botUrl;
  });

  document.querySelectorAll('[data-tg-link]').forEach((el) => {
    el.href = botUrl;
  });

  document.querySelectorAll('[data-footer-text]').forEach((el) => {
    el.textContent = t.footerText || '© Nifara Store';
  });

  document.title = `${data.storeName || 'Nifara Store'}${titleSuffix ? ' — ' + titleSuffix : ''}`;
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/** Tombol menu (hamburger) untuk mobile — buka/tutup daftar nav-links. */
function setupNavToggle() {
  const toggle = document.querySelector('[data-nav-toggle]');
  const links  = document.querySelector('.nav-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
  });
  links.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => links.classList.remove('open'));
  });
}
document.addEventListener('DOMContentLoaded', setupNavToggle);
