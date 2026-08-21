# Folder video/media

Taruh file video kamu di sini dengan nama persis:

- `hero-video.mp4`        → video horizontal (16:9) yang tampil di Beranda
- `hero-video-poster.jpg` → gambar thumbnail sebelum video diputar (opsional)

Setelah file ini ada di folder `public/media/`, video otomatis muncul di
halaman utama (index.html), section "Sekilas tentang Nifara Store".
Kalau file belum ada, halaman otomatis menampilkan placeholder — jadi
aman untuk deploy duluan lalu upload videonya belakangan.

Tips:
- Gunakan orientasi **horizontal/landscape** (rasio 16:9, misalnya 1920×1080
  atau 1280×720) supaya pas dengan bingkai video di halaman.
- Kompres videonya dulu (misalnya ke H.264 mp4, bitrate wajar) supaya tidak
  berat saat dimuat pengunjung.
- Teks judul, deskripsi, dan caption di section ini bisa diubah lewat
  perintah `/settings` → 📝 Edit Teks Website → 📹 Beranda (Video), tanpa
  perlu edit file.
