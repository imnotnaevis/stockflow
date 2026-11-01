# StockFlow AI — Test Account & Authentication Documentation

Dokumen ini berisi informasi kredensial autentikasi aplikasi **StockFlow AI**, konfigurasi akun pengujian **TestSprite MCP**, serta panduan akses manual maupun otomatis.

---

## 1. StockFlow AI Application Authentication (Password Gate)

Sistem StockFlow AI dirancang menggunakan arsitektur **Single Master Password Gate** (tanpa formulir username/email registrasi publik) untuk mengamankan manajemen portofolio Adobe Stock pribadi.

| Properti | Nilai / Kredensial | Keterangan |
|---|---|---|
| **Login URL** | `http://localhost:3000/login` | Rute antarmuka web autentikasi |
| **Username / Email** | *(Tidak diperlukan)* | Sistem menggunakan Password Gate terpusat |
| **Test Password** | `stockflow_local_password` | Master password dev lokal (dari `.env.local`) |
| **Default Fallback** | `stockflow2026` | Fallback konfigurasi sistem |
| **Session Cookie** | `sf_session` | Token JWT bertanda tangan HS256 (Masa aktif 7 hari) |
| **Auth Middleware** | `middleware.ts` | Mengunci seluruh rute dashboard (`/`, `/assets`, `/calendar`, dll.) |

---

## 2. TestSprite MCP Testing Account

Kredensial dan status akun **TestSprite** yang terhubung pada MCP server:

| Parameter | Detail Akun |
|---|---|
| **Account Name** | `imnotnaevis` |
| **Email Address** | `bitchimnotnaevis@gmail.com` |
| **Subscription Plan** | `Starter` |
| **Available Credits** | `549.5 Credits` |
| **Workspace** | `imnotnaevis's workspace` |

---

## 3. Cara Login ke Aplikasi

### A. Melalui Web Browser
1. Buka browser dan arahkan ke: **`http://localhost:3000`**
2. Halaman otomatis mengarahkan ke `/login` jika belum terautentikasi.
3. Masukkan password:
   ```text
   stockflow_local_password
   ```
4. Klik tombol **Unlock Portfolio** &rarr; Sesi dibuat dalam cookie `sf_session` dan langsung masuk ke dashboard.

---

### B. Melalui REST API (cURL / Automated Script)

#### 1. Melakukan Login & Mendapatkan Cookie Sesi:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"stockflow_local_password"}' \
  -c cookies.txt
```

**Respon Sukses (HTTP 200 OK):**
```json
{
  "success": true,
  "message": "Authenticated successfully"
}
```

#### 2. Mengakses Endpoint Terproteksi Menggunakan Cookie:
```bash
# Mengambil ringkasan statistik KPI dashboard
curl -b cookies.txt http://localhost:3000/api/dashboard/stats

# Mengambil daftar aset portofolio
curl -b cookies.txt http://localhost:3000/api/assets

# Mengambil data kalender musiman
curl -b cookies.txt http://localhost:3000/api/themes
```

#### 3. Melakukan Logout:
```bash
curl -X POST http://localhost:3000/api/auth/logout -b cookies.txt
```

---

## 4. Konfigurasi Lingkungan (`.env.local`)

File konfigurasi lokal tersimpan di [`.env.local`](./.env.local):

```env
DATABASE_URL="postgres://postgres:postgres@localhost:5432/stockflow"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_dummy_local"
GEMINI_API_KEY="dummy_key_local"
GEMINI_MODEL="gemini-1.5-flash"
APP_PASSWORD="stockflow_local_password"
SESSION_SECRET="super_secret_session_key_with_at_least_32_characters_123456"
```

---

## 5. Menjalankan Server & Pengujian Otomatis

```bash
# Menjalankan unit tests (46 test cases)
npm run test

# Memeriksa static typecheck TypeScript
npm run typecheck

# Memulai server produksi di port 3000
npm run start
```

