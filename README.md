# Time Boxing for Kids

Jadwal keluarga sederhana dalam **satu garis waktu visual**. Semua anggota
keluarga berbagi satu kanvas waktu yang sama: kegiatan tampil sebagai blok
berwarna sesuai profil, dan kegiatan bersama hanya tampil satu kali.

Tanpa login, tanpa server, tanpa database online. Data tersimpan di LocalStorage
perangkat.

**Status saat ini: Fase 1–3 selesai dan sudah live.**
Fase 4–7 belum diimplementasikan sesuai instruksi pengembangan bertahap.

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
- **Mode Fokus**: dari menu `⋯` di bar profil, satu ketukan menyembunyikan
  header, toolbar, dan pemilih profil sehingga timeline memenuhi layar. Tetap
  ada tombol tanggal, "Hari ini", dan "Keluar fokus" yang mengambang di bar
  atas. Tekan `Esc` untuk keluar. Mode ini sementara (tidak disimpan) dan
  otomatis batal saat berpindah ke halaman Profil/Pengaturan.
- **Peringatan penyimpanan lokal** dan informasi ukuran data.
- Tampilan **mobile-first** dengan target sentuh besar; pemilih profil tetap
  dapat diakses tanpa membuka halaman lain.

## Fitur Fase 2

- **Buat kegiatan**: ketuk area kosong di timeline → blok 30 menit langsung
  muncul (dengan snapping 5 menit).
- **Geser kegiatan**: tahan blok ±0,4 detik, lalu geser untuk memindah waktu
  (durasi tetap). Geser tanpa menahan akan menggulir timeline, bukan memindah.
- **Swipe kiri/kanan** di area kosong timeline: pindah hari (Hari) atau minggu
  (Minggu). Swipe di atas blok tidak menggeser tanggal agar tidak bentrok
  dengan geser kegiatan.
- **Resize kegiatan**: tahan pegangan atas/bawah lalu geser untuk mengubah jam
  mulai/selesai.
- **Edit kegiatan**: ketuk blok atau tombol pensil → dialog ringan (nama, peserta,
  catatan). Waktu diubah di timeline, bukan di dialog.
- **Hapus kegiatan**: dari dialog edit, dengan konfirmasi.
- **Snapping 5 menit** untuk geser/resize dan **durasi minimum 10 menit**.
- **Durasi terlihat di dalam blok**: `30 mnt`, `1 j`, `1 j 30 mnt`.
- **Touchscreen**: Pointer Events API — mouse, sentuh, stylus, tablet. Swipe
  vertikal di mana saja (kanvas maupun blok) menggulir jadwal.
- **Visual feedback** saat drag/resize; scroll halaman tidak ikut terganggu.

## Fitur Fase 3

- **Lane otomatis**: kegiatan yang waktunya bertumpuk ditata berdampingan di
  dalam satu timeline bersama. Jumlah lane mengikuti kebutuhan (2, 3, 4, 5 …),
  dan lane hanyalah tata letak visual — bukan kolom per profil.
- **Lane minimal**: kelompok kegiatan yang saling bertumpuk memakai jumlah lane
  paling sedikit yang memungkinkan; satu kegiatan tetap satu blok.
- **Bentrok peserta**: blok bergaris putus-putus oranye + tanda ⚠ saat dua
  kegiatan bertumpuk dan berbagi minimal satu peserta.
- **Ringkasan bentrok** di atas timeline, misalnya "2 jadwal bentrok", beserta
  nama pesertanya. Peringatan bersifat visual dan tidak memblokir apa pun.
- **Hitung ulang otomatis** saat kegiatan dibuat, digeser, di-resize, dihapus,
  atau saat profil disembunyikan/ditampilkan.
- **Tetap terbaca di layar sempit**: blok 2 lane menyembunyikan avatar dan
  durasi inline di ponsel; 3 lane atau lebih memakai satu baris judul + durasi.

## Fitur Fase 4 (tampilan minggu)

- **Tujuh kolom hari** (Sen–Min) dengan satu gutter jam; blok kegiatan hanya
  tampil pada jamnya, bukan daftar ringkasan terpisah.
- **Label jam seragam**: 00:00–24:00 berada tepat di tengah garis jamnya,
  baik di tampilan hari maupun minggu. Bagian label yang menjorok di luar grid
  dipotong, sehingga tidak menambah area gulir dan tidak ada ruang kosong di
  bawah garis 24:00.
- **Garis jam dan blok satu titik nol**: garis grid digambar di area jam, bukan
  di area judul hari, jadi posisi blok selalu cocok dengan labelnya.
- **Pindah hari lewat gestur**: tahan blok ±0,4 detik lalu geser ke kiri/kanan
  untuk memindahkannya ke hari sebelumnya/berikutnya. Jam dan durasi tetap;
  kolom tujuan disorot dan muncul notifikasi "Dipindah ke …".
- **Swipe tetap menggulir**: geser sebelum tahan selesai tidak memindahkan blok.
- **Lane untuk kegiatan bersamaan**: kegiatan yang bertumpuk dalam satu kolom
  dibagi menjadi lajur-lajur seperti di tampilan hari, jadi tidak saling
  menutupi. Blok yang sangat sempit tetap bisa diketuk untuk melihat judul
  lengkap di editor.
- **Cubit untuk zoom** di Hari dan Minggu: dua jari mengubah skala jam (80%–
  400%) dengan titik di bawah jari tetap diam, sehingga arah panduan tidak
  hilang. Skala dipakai bersama oleh kedua tampilan; geser satu jari tetap
  menggulir dan tidak berubah menjadi geser blok.
- **Detail menyesuaikan ruang blok**: bukan sekadar angka zoom. Setiap blok
  diukur tinggi aslinya; kalau cukup, ia menampilkan informasi berikutnya
  secara berurutan — judul → jam → dua baris judul → peserta & catatan → tiga
  baris judul. Kalau belum cukup, hanya yang paling penting yang tampil.
  Blok minggu juga menampilkan rentang jam saat ada ruang.
- **Judul menyesuaikan kotak**: blok yang terlalu sempit membuat judul
  mengecil otomatis dan tidak tebal, sehingga teks tetap terbaca daripada
  dipotong dalam ukuran besar.
- **Label callout untuk blok mikro**: kalau blok lebih pendek dari ~24 px,
  judulnya dipindah ke label berukuran normal di sisi kanan kanvas, dengan
  garis putus-putus yang menunjuk ke bloknya. Beberapa label yang berdekatan
  ditumpuk agar tidak bertabrakan. Ketuk label = buka editor.
- **Trackpad**: pinch (ctrl + wheel) melakukan hal yang sama di desktop.
- **Tombol "Zoom …%"** muncul saat skala bukan 100% untuk kembali ke normal.
- Ketuk blok → editor kegiatan; ketuk judul hari → tampilan hari.
- Kegiatan milik profil yang disembunyikan tetap mengikuti aturan visibilitas
  yang sama seperti tampilan hari.

## Fitur Fase 4 (tampilan bulan)

- **Grid 6 minggu × 7 hari** dengan judul bulan dan total kegiatan.
- **Jumlah kegiatan + titik warna profil** per tanggal (maksimal tiga warna),
  mengikuti aturan profil tersembunyi yang sama dengan tampilan hari.
- **Penanda visual**: hari ini, tanggal terpilih, akhir pekan, ikon hari khusus,
  dan ⚠ bila ada jadwal bentrok.
- **Navigasi per bulan** lewat ‹/› dan tombol "Hari ini"; ketuk tanggal untuk
  membuka tampilan hari.

## Panel atas yang ringkas

Panel di atas kanvas dibuat seringkas mungkin agar timeline dapat ruang:

- **Header** satu baris (subjudul hanya di layar lebar).
- **Toolbar satu baris**: `‹` tanggal `›` + **ikon kalender bertanggal hari
  ini** (ketuk untuk kembali ke hari ini) + pemilih tampilan ringkas
  (`Hari ▾`). Di layar lebar pemilih tampil sebagai segmented Hari/Minggu/Bulan.
  Angka di tengah ikon selalu tanggal hari ini, bukan tanggal yang sedang
  dibuka, dan diperbarui otomatis saat lewat tengah malam.
- **Bar profil satu baris**: chip profil digeser ke samping, sedangkan
  "Tampilkan semua", "Sembunyikan semua", "Hari ini", dan "Mode fokus" ada di
  menu `⋯`.
- **Ringkasan bentrok satu baris**: `⚠ 2 jadwal bentrok · Anak 1, Anak 2 ›`.
  Ketuk untuk melihat rincian setiap pasangan.
- Di layar sangat sempit (≤300 px) ikon hari ini disembunyikan agar tanggal
  tetap terbaca; "Hari ini" tetap tersedia di menu `⋯`. Di bawah 300 px tanggal
  memakai bentuk pendek (`18 Nov`), dan di bawah 250 px pemilih tampilan turun
  ke baris sendiri.

Catatan ikon: tidak ada library ikon yang menyediakan angka tanggal hidup
(Material Symbols `event` memakai angka tetap 17). Bingkai kalender dibuat
mengikuti pola Lucide/Tabler (lisensi MIT) dan angkanya dirender sebagai teks
SVG, sehingga tanpa dependency tambahan dan ikut warna tema.

Hasil terukur pada 390×844: tinggi panel turun dari ±360 px menjadi ±231 px,
sehingga kanvas bertambah dari 387 px menjadi ±539 px (±+39%).

### Belum termasuk (sesuai fase)

| Fase | Fitur | Status |
| --- | --- | --- |
| 2 | Buat/geser/resize/edit/hapus kegiatan, snapping 5 menit, durasi minimum 10 menit, touch gesture | **Selesai** |
| 3 | Lane otomatis untuk kegiatan bertumpuk, peringatan konflik | **Selesai** |
| 4 | Tampilan minggu & bulan, special day, zoom dan rentang waktu | Minggu, bulan & pinch zoom selesai; special day dan preset rentang waktu menyusul |
| 5 | Waktu salat lokal dengan parameter Kemenag/SIHAT | Belum |
| 6 | Ekspor/impor JSON, reset aplikasi | Belum |
| 7 | Uji perangkat Android, performance, deployment GitHub Pages | Belum |

Tampilan Bulan menampilkan grid 6 minggu (Sen–Min) dengan jumlah kegiatan,
titik warna profil, penanda hari ini/terpilih, dan ikon hari khusus. Ketuk
sebuah tanggal untuk membuka tampilan hari; tombol ‹/› melompat per bulan.

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
| 18 | Tampilan Minggu terbuka dengan 7 kolom; tampilan Bulan terbuka dengan grid tanggal dan kembali ke Hari | Lulus |
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
| 26 | Ketuk area kosong di timeline membuat blok 30 menit dengan snapping 5 menit | Lulus |
| 27 | Seret tengah blok memindah kegiatan (durasi tetap, snapping 5 menit, minimum 10 menit) | Lulus |
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

### Perbaikan gestur & keterbacaan

| # | Pengujian | Hasil |
| --- | --- | --- |
| 51 | Swipe vertikal di atas blok kegiatan menggulir timeline (tidak memindah blok) | Perlu uji HP |
| 52 | Tahan ±0,4 detik tanpa bergeser lalu geser: blok ikut jari, snapping 5 menit tetap | Lulus (emulasi) |
| 53 | Geser sedikit sebelum tahan berakhir (≤10 px) tetap dianggap swipe, bukan drag | Lulus (emulasi) |
| 54 | Saat drag aktif halaman tidak ikut tergulir (touchmove non-pasif ditahan) | Perlu uji HP |
| 55 | Durasi tampil di dalam blok compact (`30 mnt`) dan blok tinggi (`1 j 30 mnt`) | Lulus |
| 56 | Selama drag, label waktu dan durasi ikut diperbarui | Lulus (emulasi) |

### Fase 3: lane otomatis & bentrok

| # | Pengujian | Hasil |
| --- | --- | --- |
| 57 | Dua kegiatan bertumpuk tampil berdampingan (2 lane), tidak saling menimpa | Lulus |
| 58 | Tiga–lima kegiatan bertumpuk memakai lane seminimal mungkin; blok 5 lane tetap ≥44 px dan bisa diketuk | Lulus |
| 59 | Lane bukan kolom profil: kegiatan bersama tetap satu blok dan hanya muncul sekali | Lulus |
| 60 | Bentrok hanya muncul bila peserta beririsan; kegiatan bersamaan dengan peserta berbeda tidak ditandai | Lulus |
| 61 | Blok bentrok bergaris putus-putus + ⚠, dan `aria-label`/tooltip menyebut lawan bentrok serta pesertanya | Lulus |
| 62 | Ringkasan "N jadwal bentrok" muncul/hilang sesuai data dan menyebut peserta | Lulus |
| 63 | Sembunyikan profil: kegiatan hilang, lane dan bentrok dihitung ulang | Lulus |
| 64 | Tambah/geser/resize/hapus kegiatan: lane dan bentrok dihitung ulang setelah render | Lulus |
| 65 | Lebar 360–390 px: 2 lane tetap terbaca (judul + jam), tanpa overflow horizontal | Lulus |
| 66 | Toolbar satu baris di 390/360 px: tanggal, ikon hari ini, dan pemilih tampilan tidak terpotong | Lulus |
| 67 | Menu `⋯`: Hari ini, tampilkan/sembunyikan semua, mode fokus; menutup setelah aksi dan saat diketuk di luar | Lulus |
| 68 | Ringkasan bentrok satu baris; ketuk membuka rincian semua pasangan, ketuk lagi menutup | Lulus |
| 69 | 195×422 dan 260×563: footer terlihat penuh, tanggal tetap terbaca, tanpa overflow horizontal | Lulus |
| 70 | Desktop 1440×900: segmented Hari/Minggu/Bulan tampil, toolbar dan bar profil tetap satu baris | Lulus |
| 71 | Ikon kalender di toolbar menampilkan tanggal hari ini (1–31) dan tetap sama saat membuka tanggal lain | Lulus |
| 72 | Ketuk ikon kalender kembali ke hari ini; `aria-label` menyebut tanggal lengkap | Lulus |
| 73 | Angka di ikon diperbarui otomatis saat lewat tengah malam tanpa reload | Lulus (logika 30 detik) |
| 74 | Minggu: 7 kolom, gutter 00:00–23:00 dengan jarak label sama, garis jam dan blok segaris | Lulus |
| 75 | Tahan blok di minggu lalu geser kanan: pindah ke hari berikutnya, jam dan durasi tetap, muncul notifikasi | Lulus |
| 76 | Geser kiri: pindah ke hari sebelumnya; geser ke hari yang sama tidak mengubah data | Lulus |
| 77 | Geser cepat sebelum tahan selesai: blok tidak berpindah dan tidak ada sisa status gestur | Lulus |
| 78 | Ketuk blok minggu membuka editor; ketuk judul hari membuka tampilan hari | Lulus |
| 79 | Blok harian mentok ke tepi kanan timeline (termasuk area scroll); ketuk blok/area kosong tetap berfungsi | Lulus |
| 80 | Hari & minggu: label 00:00 dan 24:00 tepat di garisnya; 24 terpotong setengah tanpa menambah area gulir | Lulus |
| 81 | Judul kegiatan selalu tampil dan berada di urutan teratas, juga pada blok 60 menit di layar 390 px | Lulus |
| 82 | Pemilih Hari/Minggu/Bulan di HP memakai menu HTML aplikasi, bukan dialog sistem Android; pilihan, klik di luar, Esc, dan panah keyboard berfungsi | Lulus |
| 83 | Minggu: kegiatan bersamaan dalam satu kolom dibagi ke lane terpisah, tidak saling menimpa; ketuk & geser tetap berfungsi | Lulus |
| 84 | Cubit di Hari/Minggu mengubah skala jam 80–400%; titik di bawah jari tetap di tempat yang sama, label jam tetap segaris | Lulus |
| 85 | Pinch membatalkan geser/resize yang sedang berjalan, tidak membuka editor, dan tombol Zoom 100% mengembalikan skala | Lulus |
| 86 | Detail blok berdasar tinggi nyata: jam → 2 baris judul → peserta/catatan → 3 baris judul; blok minggu menampilkan jam saat cukup tinggi | Lulus |
| 87 | Zoom maksimum 400%; geser/resize snapping 5 menit pada data lama maupun baru; durasi minimum tetap 10 menit | Lulus |
| 88 | Judul blok sempit mengecil otomatis & tidak tebal, tetap terbaca di Hari/minggu tanpa overflow | Lulus |
| 89 | Zoom 80%: blok 10 menit memakai seluruh slot tanpa padding, blok berurutan tidak saling menimpa | Lulus |
| 90 | Blok mikro memakai label callout berukuran normal di kanan kanvas + garis penunjuk; label bertumpuk rapi dan ketuk label membuka editor | Lulus |
| 91 | Blok aslinya dipersempit, judul redup tetap ada; callout transparan dengan dot di dalam kedua kotak | Lulus |
| 92 | Jarak kotak callout mengikuti jarak asli timebox: 0 saat blok nempel, ≈5,7 px untuk jeda 5 menit; kurva tidak saling menyentuh | Lulus |
| 93 | Warna background & border callout sama dengan blok aslinya, tetap transparan | Lulus |
| 94 | Bulan: grid 6×7, 42 tanggal, jumlah kegiatan & titik warna profil, penanda hari ini/terpilih | Lulus |
| 95 | Bulan: ‹/› pindah per bulan, "Hari ini" kembali ke bulan berjalan, ketuk tanggal membuka Hari | Lulus |
| 96 | Bulan di 390/360 px: sel ≥44 px, footer terlihat, tanpa overflow horizontal | Lulus |
| 97 | Swipe kiri/kanan di area kosong: timeline mengikuti jari, lalu pindah ±1 hari/minggu atau kembali jika kurang jauh | Lulus |
| 98 | Swipe horizontal juga bekerja di atas blok; tahan lama tetap menggeser kegiatan, ketuk blok tetap membuka editor | Lulus |
| 99 | Swipe horizontal aktif di seluruh area blok termasuk pegangan resize; blok 30 menit bisa diswipe, tahan-lama tetap resize/move | Lulus |
| 100 | Swipe kiri/kanan juga bekerja di atas floating callout; ketuk callout tetap membuka editor | Lulus |

**Batasan yang belum diverifikasi:**

- Konfirmasi long-press di perangkat Android asli masih perlu dicoba pengguna;
  emulasi browser tidak bisa mereproduksi tahan-jari sungguhan.
- Pada 5 lane di ponsel (lebar ±47 px) judul terpotong menjadi beberapa huruf;
  detail lengkap tetap tersedia lewat ketuk (dialog) dan `aria-label`.
- Lane otomatis/konflik (Fase 3) sudah ada; kegiatan yang bertumpuk tidak lagi
  saling menimpa, tetapi lane tidak bisa digeser horizontal.
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
domain.

GitHub Pages meng-cache aset selama 10 menit. Untuk memaksa versi baru tanpa
mengganti nama file, buka URL dengan parameter `?v=` unik, misalnya
`https://benbask.github.io/time-boxing-for-kids/?v=04daab4`. Nilai `v` tersebut
disalin ke semua URL CSS, entry `app.js`, dan seluruh modul lewat import map,
jadi halaman dan asetnya benar-benar dimuat ulang. Tanpa `?v=`, aplikasi memakai
path aset biasa seperti sebelumnya.

## Catatan pengembangan

- Tanpa dependency, tanpa build step, tanpa backend.
- Satu sumber kebenaran data di `state.js`; setiap mutasi disimpan langsung.
- Tanggal dan waktu tidak pernah di-parse dengan `Date.parse`, untuk menghindari
  pergeseran zona waktu.
- Spesifikasi lengkap, skema JSON, dan keputusan teknis ada di
  [SPEC.md](SPEC.md).
