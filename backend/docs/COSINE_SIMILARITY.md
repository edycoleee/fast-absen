Baik 👍 kita jelaskan dengan **bahasa siswa SMA** dan pakai analogi sederhana.

---

## 🎯 Ide Dasarnya: Wajah Diubah Jadi Angka

Dalam **face recognition**, wajah **tidak dibandingkan sebagai gambar langsung**, tapi diubah dulu jadi **deretan angka**.

Bayangkan:

📸 Foto wajah → 🤖 Model AI → 🔢 Vektor angka
Contoh sederhana:

```
Wajah A → [0.2, 0.5, 0.1, 0.7]
Wajah B → [0.21, 0.49, 0.09, 0.69]
```

Deretan angka ini disebut **embedding vector**.

---

## 🧠 Lalu Bagaimana Cara Membandingkannya?

Kita pakai sesuatu yang namanya **Cosine Similarity**.

Secara sederhana:

> Kita tidak membandingkan BESAR angkanya,
> tapi membandingkan ARAH vektornya.

Bayangkan dua anak panah di ruang 3D.

* Kalau arahnya sama → sudut kecil → wajah kemungkinan sama
* Kalau arahnya beda → sudut besar → wajah berbeda

---

## 📐 Konsep Cosine Similarity

Rumus sederhananya:

[
\text{cosine similarity} = \cos(\theta)
]

Di mana:

* θ = sudut antara dua vektor
* Nilainya antara -1 sampai 1

Interpretasi:

| Nilai | Artinya                  |
| ----- | ------------------------ |
| 1     | Sangat mirip (arah sama) |
| 0     | Tidak berhubungan        |
| -1    | Berlawanan arah          |

Dalam face recognition biasanya:

* > 0.7 atau 0.8 → dianggap orang yang sama

---

## 🔍 Sekarang Kita Lihat Kodenya

```python
def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity antara dua unit vector L2-normalized."""
    a = a / (np.linalg.norm(a) + 1e-10)
    b = b / (np.linalg.norm(b) + 1e-10)
    return float(np.dot(a, b))
```

---

## ✨ Penjelasan Baris per Baris

### 1️⃣ Normalisasi Vektor

```python
a = a / (np.linalg.norm(a) + 1e-10)
b = b / (np.linalg.norm(b) + 1e-10)
```

Apa artinya?

* `np.linalg.norm(a)` = panjang vektor
* Kita membagi vektor dengan panjangnya
* Jadi panjangnya menjadi 1

Kenapa?

Supaya kita hanya membandingkan **arahnya saja**, bukan panjangnya.

Contoh analogi:

* Dua panah panjang berbeda
* Tapi mengarah ke arah yang sama
* Maka dianggap mirip

`1e-10` hanya supaya tidak error jika panjangnya 0.

---

### 2️⃣ Dot Product

```python
np.dot(a, b)
```

Dot product itu:

[
a \cdot b = |a||b|\cos(\theta)
]

Karena tadi sudah dinormalisasi:

* |a| = 1
* |b| = 1

Maka:

[
a \cdot b = \cos(\theta)
]

Jadi langsung dapat cosine similarity.

---

## 🎓 Versi Analogi untuk Siswa

Bayangkan:

* Setiap wajah adalah koordinat di ruang 128 dimensi
* Kita ukur sudut antara dua wajah
* Kalau sudutnya kecil → wajah sama
* Kalau sudutnya besar → wajah beda

---

## 🔥 Kenapa Tidak Pakai Selisih Biasa?

Karena:

Jika wajah lebih terang atau lebih gelap,
nilai angkanya bisa berubah besar kecil,
tapi arah polanya tetap sama.

Cosine similarity fokus pada **pola**, bukan besar angka.

---

## 🎯 Kesimpulan Sederhana

Face recognition bekerja seperti ini:

1. Wajah → jadi angka (embedding)
2. Bandingkan dua wajah pakai cosine similarity
3. Jika hasil mendekati 1 → kemungkinan orang yang sama

---

Kalau Anda mau, saya bisa bantu:

* Buatkan ilustrasi visual 2D supaya siswa langsung paham
* Atau contoh perhitungan manual 3 dimensi seperti saat mengajar XOR
* Atau animasi konsep sudut antar vektor untuk presentasi kelas

Tinggal bilang mau gaya mengajar seperti apa 👨‍🏫
Baik 👍 sekarang kita buat **simulasi perhitungan matematik manual** supaya bisa dijelaskan ke siswa SMA di papan tulis.

Kita pakai contoh sederhana 3 dimensi (aslinya bisa 128 dimensi, tapi konsepnya sama).

---

# 🎯 Contoh Kasus

Misalkan hasil AI memberi embedding:

[
A = [1, 2, 2]
]

[
B = [2, 4, 4]
]

Sekilas terlihat B adalah kelipatan A.
Artinya arah sama → harusnya sangat mirip.

Mari kita buktikan.

---

# ✏️ Langkah 1 — Hitung Panjang Vektor (Norm)

Rumus panjang vektor:

[
|A| = \sqrt{x^2 + y^2 + z^2}
]

### Untuk A

[
|A| = \sqrt{1^2 + 2^2 + 2^2}
]

[
= \sqrt{1 + 4 + 4}
]

[
= \sqrt{9}
]

[
= 3
]

---

### Untuk B

[
|B| = \sqrt{2^2 + 4^2 + 4^2}
]

[
= \sqrt{4 + 16 + 16}
]

[
= \sqrt{36}
]

[
= 6
]

---

# ✏️ Langkah 2 — Normalisasi

Bagi masing-masing dengan panjangnya.

### A normalisasi

[
A' = \left[\frac{1}{3}, \frac{2}{3}, \frac{2}{3}\right]
]

---

### B normalisasi

[
B' = \left[\frac{2}{6}, \frac{4}{6}, \frac{4}{6}\right]
]

[
= \left[\frac{1}{3}, \frac{2}{3}, \frac{2}{3}\right]
]

🔥 Perhatikan!
Setelah normalisasi, A' dan B' jadi IDENTIK.

---

# ✏️ Langkah 3 — Hitung Dot Product

Rumus:

[
A' \cdot B' = x_1x_2 + y_1y_2 + z_1z_2
]

[
= \left(\frac{1}{3}\times\frac{1}{3}\right)
+
\left(\frac{2}{3}\times\frac{2}{3}\right)
+
\left(\frac{2}{3}\times\frac{2}{3}\right)
]

[
= \frac{1}{9} + \frac{4}{9} + \frac{4}{9}
]

[
= \frac{9}{9}
]

[
= 1
]

---

# 🎉 Hasil

Cosine Similarity = **1**

Artinya:

👉 Sudut = 0°
👉 Arah sama
👉 Wajah dianggap sama

---

# 🔵 Contoh Kedua (Supaya Lebih Menarik)

Sekarang kita ambil:

[
C = [1, 0, 0]
]

[
D = [0, 1, 0]
]

---

### Panjang

[
|C| = 1
]

[
|D| = 1
]

---

### Dot Product

[
C \cdot D = (1×0)+(0×1)+(0×0) = 0
]

---

### Hasil

Cosine similarity = **0**

👉 Sudut 90°
👉 Tidak mirip sama sekali

---

# 🔴 Contoh Ketiga (Berlawanan)

[
E = [1, 0]
]

[
F = [-1, 0]
]

Dot product:

[
(1×-1) + (0×0) = -1
]

Cosine similarity = **-1**

👉 Sudut 180°
👉 Berlawanan arah

---

# 🧠 Intuisi untuk Face Recognition

Biasanya hasilnya seperti ini:

| Cosine Similarity | Interpretasi              |
| ----------------- | ------------------------- |
| 0.9 – 1.0         | Sangat mirip (orang sama) |
| 0.7 – 0.9         | Mungkin sama              |
| < 0.5             | Berbeda                   |

---

# 🎓 Cara Menjelaskan ke Siswa

Katakan:

> Kita tidak melihat seberapa besar wajahnya,
> tapi ke arah mana pola wajahnya menunjuk di ruang angka.

Jika arah dua wajah hampir sama → kemungkinan orangnya sama.

---

Kalau Anda mau, saya bisa lanjutkan:

* 🔥 Simulasi perhitungan dengan angka acak seperti embedding asli
* 📊 Visualisasi 2D agar bisa ditampilkan di kelas
* 🤖 Hubungkan langsung ke kode numpy dan tunjukkan kesamaan hasilnya
Bagus 👍 sekarang kita gabungkan **matematika + programming numpy** supaya siswa SMA bisa lihat bahwa:

> Perhitungan manual tadi = sama dengan hasil komputer.

Kita buat bertahap dan mudah dipahami.

---

# 🎯 1️⃣ Contoh Pertama (Harusnya Mirip = 1)

Kita pakai contoh tadi:

[
A = [1,2,2]
]
[
B = [2,4,4]
]

---

## 💻 Kode Numpy

```python
import numpy as np

# vektor wajah (embedding sederhana)
A = np.array([1, 2, 2], dtype=float)
B = np.array([2, 4, 4], dtype=float)

# hitung panjang (norm)
norm_A = np.linalg.norm(A)
norm_B = np.linalg.norm(B)

print("Norm A:", norm_A)
print("Norm B:", norm_B)

# normalisasi
A_normalized = A / norm_A
B_normalized = B / norm_B

print("A normalized:", A_normalized)
print("B normalized:", B_normalized)

# cosine similarity
cos_sim = np.dot(A_normalized, B_normalized)

print("Cosine Similarity:", cos_sim)
```

---

## ✅ Output yang Diharapkan

```
Norm A: 3.0
Norm B: 6.0
A normalized: [0.3333 0.6666 0.6666]
B normalized: [0.3333 0.6666 0.6666]
Cosine Similarity: 1.0
```

Artinya:
✔ Sudut 0°
✔ Wajah dianggap sama

---

# 🎯 2️⃣ Contoh Tidak Mirip (90°)

[
C = [1,0,0]
]
[
D = [0,1,0]
]

---

```python
C = np.array([1, 0, 0], dtype=float)
D = np.array([0, 1, 0], dtype=float)

C = C / np.linalg.norm(C)
D = D / np.linalg.norm(D)

cos_sim = np.dot(C, D)

print("Cosine Similarity:", cos_sim)
```

Output:

```
Cosine Similarity: 0.0
```

Artinya:
✔ Sudut 90°
✔ Tidak mirip

---

# 🎯 3️⃣ Buat Fungsi Supaya Lebih Rapi

Sekarang kita buat seperti kode face recognition asli:

```python
def cosine_similarity(a, b):
    a = a / (np.linalg.norm(a) + 1e-10)
    b = b / (np.linalg.norm(b) + 1e-10)
    return np.dot(a, b)


A = np.array([1, 2, 2], dtype=float)
B = np.array([2, 4, 4], dtype=float)

print("Cosine Similarity:", cosine_similarity(A, B))
```

---

# 🧠 Versi Untuk Simulasi Face Recognition Mini

Sekarang kita buat simulasi kecil:

```python
# database wajah (misal sudah tersimpan)
database = {
    "Andi": np.array([0.2, 0.5, 0.1]),
    "Budi": np.array([0.9, 0.1, 0.3]),
}

# wajah baru dari kamera
wajah_baru = np.array([0.21, 0.49, 0.11])

# cari siapa paling mirip
for nama, embedding in database.items():
    similarity = cosine_similarity(wajah_baru, embedding)
    print(f"Similarity dengan {nama}: {similarity:.4f}")
```

Siswa akan melihat:

* Nilai yang lebih mendekati 1 berarti lebih mirip
* Sistem memilih similarity tertinggi

---

# 🔥 Supaya Lebih Menarik Saat Mengajar

Anda bisa minta siswa:

* Ubah angkanya sedikit
* Lihat bagaimana similarity berubah
* Coba buat vektor berlawanan arah

---

Kalau mau, saya bisa lanjutkan dengan:

* 📊 Visualisasi grafik sudut antar vektor
* 🧮 Hubungkan dengan konsep perceptron yang sudah Anda ajarkan
* 🤖 Simulasi embedding 128 dimensi seperti model FaceNet asli

Tinggal pilih mau dibawa ke arah matematik, AI, atau coding lanjut 🚀
