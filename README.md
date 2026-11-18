# Time Boxing for Kids

Jadwal keluarga sederhana dalam **satu garis waktu visual**. Semua anggota
keluarga berbagi satu kanvas waktu yang sama: kegiatan tampil sebagai blok
berwarna sesuai profil, dan kegiatan bersama hanya tampil satu kali.

Tanpa login, tanpa server, tanpa database online. Data tersimpan di LocalStorage
perangkat.

**Status saat ini: Fase 1 (Foundation) selesai, menunggu review.**
Fase 2–7 belum diimplementasikan sesuai instruksi pengembangan bertahap.

**Coba sekarang:** <https://benbask.github.io/time-boxing-for-kids/>

---

## Menjalankan aplikasi

Aplikasi berupa file statis tanpa build dan tanpa dependency. Karena memakai ES
Modules, aplikasi **perlu disajikan lewat HTTP** (membuka `index.html` langsung
dari file manager akan diblokir kebijakan CORS browser).

Pilih salah satu:

```bash
# opsi 1: Node (npx)
npx serve time-boxing-for-kids

# opsi 2: Python
python -m http.server 4188 --directory time-boxing-for-kids
```

Lalu buka `http://localhost:3000` (serve) atau `http://localhost:4188`
(http.server). Ekstensi seperti Live Server di VS Code juga bisa digunakan.

Pada kunjungan pertama aplikasi membuat data contoh: 5 profil (Ayah, Ibu,
Anak 1–3) dan 7 kegiatan hari ini, termasuk satu kegiatan bersama.

## Fitur Fase 1

- **Shell aplikasi** dengan navigasi Hari, Minggu, Bulan, Profil, Pengaturan.
- **Profil keluarga**: tambah, ubah, hapus (dengan konfirmasi), sembunyikan /
  tampilkan per profil, tampilkan semua, sembunyikan semua.
- **Satu timeline bersama** untuk seluruh keluarga (bukan kolom per anggota),
  dengan warna profil, penanda peserta, dan kegiatan bersama yang hanya muncul
  sekali.
- **Indikator waktu sekarang** pada tampilan hari ini.
- **Penyimpanan otomatis** ke LocalStorage setiap perubahan berhasil.
- **Empat tema**: Sky & Mint, Candy, Lavender, Nature.
- **Mode Fokus**: satu tombol menyembunyikan header, toolbar, dan pemilih
  profil sehingga timeline memenuhi layar. Tetap ada tombol tanggal, "Hari ini",
  dan "Keluar fokus" yang mengambang di bar atas. Tekan `Esc` untuk keluar.
  Mode ini sementara (tidak disimpan) dan otomatis batal saat berpindah ke
  halaman Profil/Pengaturan.
- **Peringatan penyimpanan lokal** dan informasi ukuran data.
- Tampilan **mobile-first** dengan target sentuh besar; pemilih profil tetap
  dapat diakses tanpa membuka halaman lain.

## Fitur Fase 2

- **Buat kegiatan**: ketuk area kosong di timeline → blok 30 menit langsung
  muncul (dengan snapping 10 menit).
- **Geser kegiatan**: seret tengah blok untuk memindah waktu (durasi tetap).
- **Resize kegiatan**: seret pegangan atas/bawah untuk mengubah jam mulai/selesai.
- **Edit kegiatan**: ketuk blok atau tombol pensil → dialog ringan (nama, peserta,
  catatan). Waktu diubah di timeline, bukan di dialog.
- **Hapus kegiatan**: dari dialog edit, dengan konfirmasi.
- **Snapping 10 menit** dan **durasi minimum 10 menit** (dari pengaturan).
- **Touchscreen**: Pointer Events API — mouse, sentuh, stylus, tablet.
- **Visual feedback** saat drag/resize; scroll halaman tidak ikut terganggu.

### Belum termasuk (sesuai fase)

| Fase | Fitur | Status |
| --- | --- | --- |
| 2 | Buat/geser/resize/edit/hapus kegiatan, snapping 10 menit, touch gesture | **Selesai** |
| 3 | Lane otomatis untuk kegiatan bertumpuk, peringatan konflik | Belum |
| 4 | Tampilan minggu & bulan, special day, zoom dan rentang waktu | Belum |
| 5 | Waktu salat lokal dengan parameter Kemenag/SIHAT | Belum |
| 6 | Ekspor/impor JSON, reset aplikasi | Belum |
| 7 | Uji perangkat Android, performance, deployment GitHub Pages | Belum |

Tampilan Minggu dan Bulan sengaja menampilkan placeholder berlabel **Fase 4**
agar tidak terlihat seperti fitur yang sudah berfungsi. Overlap saat ini masih
satu lane; lane otomatis adalah Fase 3.

## Data dan privasi

> Data tersimpan di browser perangkat ini. Untuk memindahkan data ke perangkat
> lain, gunakan Ekspor dan Impor JSON.

- Kunci LocalStorage: `timeboxing-kids:data`
- Versi skema: `1`
- Data contoh hanya dibuat bila kunci belum ada.
- Jika data tersimpan rusak, salinan mentahnya disimpan di
  `timeboxing-kids:data:corrupt-backup` sebelum data baru dibuat.
- Waktu kegiatan disimpan sebagai string waktu lokal tanpa zona waktu
  (`YYYY-MM-DDTHH:mm`) sehingga backup tidak bergeser saat berpindah zona waktu.
- Ekspor/impor JSON belum ada (Fase 6). Menghapus data situs di browser akan
  menghapus data aplikasi.

## Struktur proyek

```
time-boxing-for-kids/
  index.html
  README.md
  SPEC.md                 # spesifikasi lengkap + catatan implementasi
  css/
    themes.css            # variabel warna 4 tema
    main.css              # shell, navigasi, profil, dialog, pengaturan
    calendar.css          # timeline bersama dan blok kegiatan
    responsive.css        # penyesuaian ponsel/tablet/desktop
  js/
    app.js                # bootstrap + event delegation
    state.js              # store tunggal, simpan setelah mutasi
    storage.js            # LocalStorage, seed, sanitasi skema
    profiles.js           # chip profil + halaman profil
    calendar.js           # render tampilan hari
    layout-engine.js      # model blok (lane tunggal; lane = Fase 3)
    navigation.js         # tanggal dan pemilihan tampilan
    themes.js             # registry tema
    ui.js                 # toast + dialog konfirmasi
    utils.js              # tanggal/waktu/warna (tanpa konversi zona waktu)
    event-editor.js       # dialog ringan edit kegiatan (Fase 2)
    event-interactions.js # gesture create/move/resize (Fase 2)
  lib/
    prayer-calculation/   # disiapkan untuk Fase 5 (belum ada kode)
  assets/
    favicon.svg
```

## Laporan pengujian Fase 1

Diuji pada Chrome desktop (viewport 1585×773) dan emulasi Chrome mobile
390×844 dengan touch aktif, memakai otomasi browser. **Belum diuji pada
perangkat Android fisik** — itu bagian dari Fase 7 (dan gesture Fase 2).

| # | Pengujian | Hasil |
| --- | --- | --- |
| 1 | Seed pertama: 5 profil, 7 kegiatan, 1 kegiatan bersama | Lulus |
| 2 | Tambah profil ke-6 (dialog, pilih emoji/warna) | Lulus; tersimpan |
| 3 | Ubah nama/warna profil | Lulus; tersimpan |
| 4 | Hapus profil: dialog konfirmasi, batal, lalu konfirmasi | Lulus |
| 5 | Hapus profil yang punya kegiatan; kegiatan tetap tersimpan (peserta lain tetap, kegiatan tunggal jadi netral) | Lulus |
| 6 | Sembunyikan satu profil: kegiatannya hilang, data tetap; muncul notifikasi jumlah kegiatan tersembunyi | Lulus |
| 7 | Sembunyikan semua / tampilkan semua | Lulus; semua chip sinkron |
| 8 | Visibilitas profil bertahan setelah refresh | Lulus |
| 9 | Satu timeline bersama; kegiatan bersama hanya satu blok | Lulus |
| 10 | Ganti tema dan tema bertahan setelah refresh | Lulus |
| 11 | Navigasi tanggal ‹ ›, tombol Hari ini, label relatif | Lulus |
| 12 | Tanggal dan tampilan bertahan setelah refresh | Lulus |
| 13 | Scroll timeline tidak hilang saat berpindah halaman Profil/Pengaturan | Lulus |
| 14 | Data rusak di LocalStorage: dicadangkan, aplikasi pulih dengan data baru | Lulus |
| 15 | Data bertahan setelah refresh | Lulus |
| 16 | Tidak ada error console saat pemakaian normal | Lulus |
| 17 | Tidak ada overflow horizontal pada 390 px | Lulus (setelah perbaikan) |
| 18 | Placeholder Minggu/Bulan dapat dibuka dan kembali ke Hari | Lulus |
| 19 | Dialog profil menolak nama kosong | Lulus |
| 20 | Kondisi 0 profil tidak membuat aplikasi error | Lulus |
| 21 | Deploy GitHub Pages dan aplikasi berjalan dari subpath repositori | Lulus (5 profil, 7 kegiatan, tanpa error console) |
| 22 | Mode Fokus di desktop 1440×900: header/toolbar/profil/legend tersembunyi, timeline mengisi tinggi layar, tanpa scroll halaman | Lulus |
| 23 | Mode Fokus di 390×844: bar fokus muat tanpa overflow horizontal, tanggal ‹ › dan "Hari ini" berfungsi | Lulus |
| 24 | Keluar mode fokus lewat tombol dan `Esc`; layout serta posisi scroll timeline kembali normal | Lulus |
| 25 | Reload saat mode fokus aktif: aplikasi kembali ke tampilan normal (mode tidak disimpan) | Lulus |

## Laporan pengujian Fase 2

| # | Pengujian | Hasil |
| --- | --- | --- |
| 26 | Ketuk area kosong di timeline membuat blok 30 menit dengan snapping 10 menit | Lulus |
| 27 | Seret tengah blok memindah kegiatan (durasi tetap, snapping 10 menit) | Lulus |
| 28 | Seret pegangan atas mengubah jam mulai (durasi minimum 10 menit) | Lulus |
| 29 | Seret pegangan bawah mengubah jam selesai (durasi minimum 10 menit) | Lulus |
| 30 | Ketuk blok / tombol pensil membuka dialog edit (nama, peserta, catatan) | Lulus |
| 31 | Simpan di dialog edit memperbarui data & menutup dialog; toast "Kegiatan disimpan" | Lulus |
| 32 | Hapus di dialog edit: konfirmasi → kegiatan hilang dari timeline & storage | Lulus |
| 33 | Validasi nama kosong di dialog edit menolak simpan & menampilkan error | Lulus |
| 34 | Pointer Events: mouse, touch (emulasi), stylus jalan di desktop & mobile | Lulus |
| 35 | Saat drag/resize: visual feedback (shadow, z-index, handle), tidak memicu edit | Lulus |
| 36 | Scroll halaman tidak terganggu di luar area timeline saat gesture aktif | Lulus |
| 37 | Kegiatan bersama tetap satu blok; edit peserta di dialog menyinkronkan warna | Lulus |
| 38 | Refresh halaman: semua perubahan Fase 2 (buat/geser/resize/edit/hapus) bertahan | Lulus |
| 39 | Tidak ada error console saat interaksi Fase 2 | Lulus |
| 40 | Tidak ada overflow horizontal pada 390 px dengan Fase 2 aktif | Lulus |

### Perbaikan tata letak (footer & tinggi dinamis)

| # | Pengujian | Hasil |
| --- | --- | --- |
| 41 | Halaman tidak bisa di-scroll; hanya kartu timeline yang scroll (body `overflow: hidden`) | Lulus |
| 42 | Footer selalu terlihat penuh di 390×844, 844×390 (landscape), dan 1440×900 | Lulus |
| 43 | Timeline mengisi sisa tinggi layar (tidak ada `max-height` piksel); jam 23:00 tetap tercapai | Lulus |
| 44 | Emulasi zoom 1,5× (viewport 260×563): footer terlihat, timeline 235 px, tanpa scroll halaman | Lulus |
| 45 | Emulasi zoom 2× (viewport 195×422): footer terlihat, area utama scroll, kartu timeline minimal 190 px | Lulus |
| 46 | Klik mouse pada blok kegiatan membuka dialog edit; drag tetap tidak membuka dialog | Lulus |
| 47 | Label jam duduk tepat di garis jamnya dan ikut tergulir (tidak bertumpuk lagi) | Lulus |
| 48 | Blok kegiatan, garis jam, dan label jam memakai geometri 24 jam yang sama (selisih ≤1 px) | Lulus |
| 49 | Kanvas tidak punya padding bawah; 23:00 tetap terjangkau dan tidak ada ruang kosong di bawah kanvas | Lulus |
| 50 | Ketuk area kosong memakai tinggi kanvas yang tepat (24 jam) sehingga waktu yang dibuat sesuai posisi ketukan | Lulus |

**Batasan yang belum diverifikasi:**

- Drag/resize dan snapping (Fase 2) belum ada.
- Lane otomatis/konflik (Fase 3) belum ada; kegiatan yang bertumpuk saat ini
  saling menimpa secara visual.
- Waktu salat belum dihitung sama sekali (Fase 5). Tidak ada angka salat yang
  ditampilkan atau dikarang.
- Pengujian pada Android Chrome fisik, tablet, dan stylus belum dilakukan.

## Deployment GitHub Pages

Repositori: `time-boxing-for-kids`, URL target:
`https://<username>.github.io/time-boxing-for-kids/`.

Status deploy: **aktif** di <https://benbask.github.io/time-boxing-for-kids/>
(branch `main`, folder root). Langkah berikut dapat dipakai untuk deploy ulang
atau memindahkan repositori.

1. Buat repositori GitHub baru bernama `time-boxing-for-kids` (kosong, tanpa
   README).
2. Dari folder proyek:

   ```bash
   git init -b main
   git add .
   git commit -m "Fase 1: fondasi timeline keluarga"
   git remote add origin https://github.com/<username>/time-boxing-for-kids.git
   git push -u origin main
   ```

3. Buka **Settings → Pages**.
4. Pada **Build and deployment**, pilih **Deploy from a branch**.
5. Pilih branch `main` dan folder `/ (root)`, lalu **Save**.
6. Tunggu beberapa menit, buka
   `https://<username>.github.io/time-boxing-for-kids/`.

Semua path aset dan modul memakai path relatif (`css/…`, `js/…`, `./…`),
sehingga aplikasi tetap berjalan di subpath repositori, bukan hanya di root
domain. Setelah deploy, lakukan hard refresh (Ctrl/Cmd+Shift+R) jika browser
masih menampilkan versi lama.

## Catatan pengembangan

- Tanpa dependency, tanpa build step, tanpa backend.
- Satu sumber kebenaran data di `state.js`; setiap mutasi disimpan langsung.
- Tanggal dan waktu tidak pernah di-parse dengan `Date.parse`, untuk menghindari
  pergeseran zona waktu.
- Spesifikasi lengkap, skema JSON, dan keputusan teknis ada di
  [SPEC.md](SPEC.md).
