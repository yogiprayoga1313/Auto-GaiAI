# 🪐 GAIAI Bot

Bot otomatis login, daily check-in, dan membuat AI task di GAIAI menggunakan wallet Ethereum. Cocok untuk generate AI images harian dengan prompt yang bisa dikustomisasi.  

---

## ⚡ Fitur
- Login dengan wallet (private key & address)
- Daily check-in otomatis
- Generate AI task otomatis jika belum ada kreasi hari ini
- Retry otomatis jika request gagal (timeout / server error)
- Tampilan profile & creations di console
- Bisa custom prompt untuk generate AI image  

---

## 🛠️ Instalasi

1. Clone repository:
```bash
git clone https://github.com/yogiprayoga1313/Auto-GaiAI.git
```

```bash
cd Auto-GaiAI
```

Install dependencies:
```bash
npm install
```

Buat file .env dari template:
```bash
cp .env.example .env
```

Isi .env dengan data kamu:

```bash
PRIVATE_KEY=your_private_key_here
ADDRESS=your_wallet_address_here
API_BASE=https://api.metagaia.io
NAME=okx
INVITE_CODE=VCM1MZ
```

Menjalankan Bot
```bash
Menjalankan Bot
```

Bot akan:
Fetch nonce & login
Tampilkan profile
Daily check-in
Fetch kreasi hari ini
Jika belum ada kreasi, otomatis buat AI task

⚠️ Error 502 / Timeout
Kalau muncul error seperti:
```bash
Attempt 1 failed: timeout of 20000ms exceeded
Attempt 2 failed: Request failed with status code 502
```

Tenang! Itu biasanya server GAIAI sedang overload / lambat, bukan salah bot.
Bot sudah otomatis retry beberapa kali dan akan memeriksa kembali kreasi jika server sempat menunda.

Tips:
Tunggu beberapa detik & jalankan ulang
Jangan spam request terlalu cepat, biarkan retry otomatis bekerja