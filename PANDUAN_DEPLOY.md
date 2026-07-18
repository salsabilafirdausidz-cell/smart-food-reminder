# Panduan Deploy — Smart Food Reminder PWA

Dokumen ini memandu deploy aplikasi lengkap dengan **push notification asli**.
Semua layanan yang dipakai **gratis**. Estimasi waktu: **30–45 menit**.

---

## Ringkasan Arsitektur

| Komponen | Layanan | Fungsi |
|---|---|---|
| Aplikasi (PWA) | **Vercel** | Hosting file HTML/CSS/JS |
| Database | **Supabase** | Simpan langganan notifikasi + daftar bahan |
| Backend API | **Vercel Functions** | Endpoint subscribe/sync/unsubscribe |
| Penjadwal | **Vercel Cron** | Cek kadaluarsa otomatis 1×/hari |
| Push | **Web Push Protocol** | Kirim notifikasi ke HP user |

> **Penting:** Aplikasi dan backend harus di **satu project Vercel yang sama**, karena kode frontend memanggil `/api/...` sebagai path relatif.

---

## Langkah 1 — Siapkan Database (Supabase)

1. Buka **https://supabase.com** → **Start your project** → daftar pakai akun GitHub/Google.
2. Klik **New Project**:
   - **Name**: `smart-food-reminder`
   - **Database Password**: buat password (simpan, tapi tidak akan dipakai lagi)
   - **Region**: pilih **Southeast Asia (Singapore)** — paling dekat dengan Indonesia
   - Klik **Create new project**, tunggu ±2 menit.
3. Setelah project jadi, buka menu **SQL Editor** (ikon terminal di sidebar kiri) → **New query**.
4. Buka file `api/schema.sql` dari folder ini, **copy seluruh isinya**, paste ke editor, lalu klik **Run**.
   - Kalau berhasil, muncul tulisan *"Success. No rows returned"*.
5. Ambil kredensial: buka **Project Settings** (ikon gerigi) → **API**:
   - Salin **Project URL** → ini nilai untuk `SUPABASE_URL`
   - Di bagian **Project API keys**, salin key **`service_role`** (klik *Reveal*) → ini nilai untuk `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ **Jangan pernah** menaruh `service_role` key di kode frontend atau meng-upload ke GitHub publik. Key ini hanya dipakai di Environment Variables Vercel (sisi server).

---

## Langkah 2 — Upload Kode ke GitHub

1. Buka **https://github.com** → **New repository**:
   - **Name**: `smart-food-reminder`
   - Pilih **Public** (supaya Vercel gratis bisa akses)
   - **Jangan** centang "Add a README"
   - Klik **Create repository**
2. Di halaman repo kosong, klik **uploading an existing file**.
3. Drag **seluruh isi** folder ini (bukan foldernya, tapi isinya):
   ```
   index.html
   manifest.json
   sw.js
   package.json
   vercel.json
   icons/          (seluruh folder)
   api/            (seluruh folder)
   ```
   > File `.env.example` dan `PANDUAN_DEPLOY.md` boleh ikut, tidak masalah.
4. Klik **Commit changes**.

---

## Langkah 3 — Deploy ke Vercel

1. Buka **https://vercel.com** → **Sign Up** → pilih **Continue with GitHub**.
2. Di dashboard, klik **Add New...** → **Project**.
3. Cari repo `smart-food-reminder` → klik **Import**.
4. **JANGAN klik Deploy dulu!** Buka dulu bagian **Environment Variables**, lalu tambahkan 6 variabel berikut satu per satu:

   | Name | Value |
   |---|---|
   | `VAPID_PUBLIC_KEY` | `BMWZfaFdkgbsRwM5FrIzMm4U-R6V0HW1Vqfy-F8EqSDq-jHi5jjKWR-UnMpbsShXQZIReMO6Vy-4w69kAXXni_o` |
   | `VAPID_PRIVATE_KEY` | `DSAL7oYeIqwSMZrqFslA9ztbG04l8aOTp1foX7pn9m8` |
   | `VAPID_SUBJECT` | `mailto:email-kelompok@gmail.com` *(ganti dengan email kalian)* |
   | `SUPABASE_URL` | *(Project URL dari Langkah 1)* |
   | `SUPABASE_SERVICE_ROLE_KEY` | *(service_role key dari Langkah 1)* |
   | `CRON_SECRET` | *(string acak bebas, misal: `sfr-rahasia-2026-xyz789`)* |

5. Klik **Deploy**. Tunggu ±1–2 menit.
6. Selesai — kalian dapat link seperti `https://smart-food-reminder-xxx.vercel.app`

> **Cron otomatis aktif** setelah deploy pertama. Vercel membaca `vercel.json` dan menjadwalkan pengecekan tiap hari jam 01:00 UTC (= **08:00 WIB**).

---

## Langkah 4 — Uji Coba

### A. Uji instalasi PWA
1. Buka link Vercel di **HP Android** pakai **Chrome**.
2. Isi nama → masuk ke Home.
3. Tap menu **⋮** → **Add to Home screen** / muncul banner otomatis.
4. Ikon aplikasi muncul di homescreen. Buka dari situ → tampil fullscreen tanpa address bar.

### B. Uji notifikasi push
1. Di aplikasi, buka tab **Notifikasi**.
2. Aktifkan toggle **🔔 Notifikasi Push**.
3. Browser akan minta izin → tap **Allow / Izinkan**.
4. Banner berubah jadi hijau: *"Notifikasi aktif"*.

### C. Uji cron secara manual (tanpa menunggu besok pagi)
Buka **Terminal / Command Prompt** di laptop, jalankan:

```bash
curl -H "Authorization: Bearer ISI_CRON_SECRET_KALIAN" \
  https://LINK-VERCEL-KALIAN.vercel.app/api/cron/check-expiry
```

Kalau berhasil, muncul respons seperti:
```json
{"ok":true,"checked":1,"notificationsSent":1,"invalidRemoved":0}
```
Dan **notifikasi akan muncul di HP** — bahkan kalau aplikasinya sedang tertutup.

> Kalau `notificationsSent: 0`, artinya tidak ada bahan yang kadaluarsa hari ini / H-2 / H-3. Tambahkan bahan dengan tanggal expired hari ini untuk mengetesnya.

---

## Cara Bagikan ke Puluhan Tester

Cukup **bagikan link Vercel** lewat WhatsApp grup. Instruksi untuk mereka:

> 1. Buka link ini di **Chrome** (Android) atau **Safari** (iPhone)
> 2. Tap menu **⋮** (atau **Bagikan** di iPhone) → **Add to Home Screen**
> 3. Buka aplikasi dari ikon di layar utama
> 4. Isi nama, lalu aktifkan **Notifikasi Push** di tab Notifikasi

Tidak ada batas jumlah pengguna. Tidak perlu Play Store. Tidak kena aturan verifikasi developer Android.

---

## Batasan yang Perlu Diketahui

| Hal | Penjelasan |
|---|---|
| **iPhone** | Push notification hanya jalan di **iOS 16.4 ke atas**, dan **wajib** aplikasi sudah di-*Add to Home Screen* dulu. Kalau cuma dibuka di Safari biasa, notifikasi tidak akan muncul. |
| **Waktu cron** | Vercel Hobby hanya boleh **1×/hari**, dan waktunya **tidak presisi** — dijadwalkan 08:00 WIB tapi bisa jalan kapan saja antara 08:00–08:59. |
| **Supabase tidur** | Project gratis **di-pause otomatis kalau 7 hari tidak ada aktivitas**. Karena cron jalan tiap hari, ini otomatis tercegah. |
| **Data per-device** | Tiap HP punya langganan sendiri. Kalau user ganti HP, datanya tidak ikut pindah (tidak ada sistem login antar-perangkat). |
| **Batas gratis** | 500 MB database, 1 juta pemanggilan function/bulan. Untuk puluhan user, ini **jauh** dari cukup. |

---

## Kalau Ada Masalah

**Notifikasi tidak muncul sama sekali:**
- Cek apakah izin notifikasi diblokir: Chrome → ⋮ → Settings → Site settings → Notifications
- Pastikan aplikasi dibuka lewat **https://** (bukan file lokal) — push tidak jalan tanpa HTTPS
- Cek log di Vercel Dashboard → Project → **Logs**, lihat apakah cron jalan & apa errornya

**Cron tidak jalan:**
- Vercel Dashboard → Project → **Settings** → **Cron Jobs** — pastikan terdaftar
- Cron **baru aktif setelah deployment production pertama**, bukan preview

**Error "Failed to save subscription":**
- Cek Environment Variables sudah terisi semua & benar
- Cek tabel `push_subscriptions` sudah dibuat di Supabase (SQL Editor → Table Editor)

**Setelah ubah Environment Variable:**
- Wajib **redeploy**: Vercel Dashboard → Deployments → ⋮ pada deployment teratas → **Redeploy**

---

## Untuk Dipresentasikan ke Dosen

Poin teknis yang layak disebut:

- **Arsitektur serverless** — tidak menyewa server, hanya membayar (Rp0) saat function dipanggil
- **Web Push Protocol** — standar W3C, bukan layanan proprietary; kunci VAPID untuk otentikasi server
- **Service Worker** — script yang jalan terpisah dari halaman, memungkinkan aplikasi menerima notifikasi & bekerja offline meski tertutup
- **Cron job harian** — sistem proaktif mengecek data tiap pagi, bukan menunggu user membuka aplikasi
- **Privasi** — tidak mengumpulkan nomor HP/email; identifikasi murni lewat endpoint push anonim dari browser
