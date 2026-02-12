# Image Optimization - Photo Upload

## 🎯 Overview

Sistem absensi sekarang dilengkapi dengan **automatic image optimization** untuk foto pegawai.

**Lokasi**: `services/pegawai_service.py` - method `_save_photo()`

---

## ✨ Fitur Optimization

### 1. Auto Resize
- **Max dimensions**: 800 × 800 pixels
- **Aspect ratio**: Preserved (maintained)
- **Algorithm**: Lanczos (highest quality resampling)

**Benefit:**
- Original: 3000×2000px (2MB) → Optimized: 800×533px (100KB)
- **Save ~95% storage!**

### 2. Format Conversion
- **Input**: JPG, PNG, JPEG
- **Output**: Always JPEG (consistent, better compression)
- **Transparency handling**: PNG dengan alpha channel → white background

**Benefit:**
- PNG (500KB) → JPEG (80KB) with same visual quality
- Consistent format untuk semua foto

### 3. Compression
- **Quality**: 85 (sweet spot untuk quality vs size)
- **Optimize flag**: True (PIL optimization)

**Quality Comparison:**
- Quality 100: Perfect quality, file besar
- **Quality 85**: Excellent quality, ukuran optimal ← **RECOMMENDED**
- Quality 70: Good quality, file kecil
- Quality 50: Noticeable artifacts

### 4. Error Handling
- Invalid file type → HTTP 400 error
- Corrupted image → HTTP 400 error with detail
- Processing failure → Informative error message

---

## 📊 Storage Comparison

### For 1000 Pegawai

**Without Optimization:**
```
1000 pegawai × 500KB (average) = 500MB storage
```

**With Optimization:**
```
1000 pegawai × 80KB (optimized) = 80MB storage
```

**Savings: 84% reduction!** 💰

---

## 🔧 Technical Details

### Processing Pipeline

```
Upload → Validate Type → Open with PIL → Convert RGBA to RGB 
→ Resize if needed → Save as JPEG (quality=85, optimize=True)
```

### Code Flow

```python
async def _save_photo(self, foto: UploadFile, pegawai_id: str) -> str:
    # 1. Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png"]
    
    # 2. Read contents
    contents = await foto.read()
    
    # 3. Open with PIL
    img = Image.open(io.BytesIO(contents))
    
    # 4. Convert RGBA → RGB (for PNG transparency)
    if img.mode in ('RGBA', 'LA', 'P'):
        background = Image.new('RGB', img.size, (255, 255, 255))
        # ... merge with white background
    
    # 5. Resize if too large (max 800x800)
    max_size = (800, 800)
    if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
        img.thumbnail(max_size, Image.Resampling.LANCZOS)
    
    # 6. Save as optimized JPEG
    img.save(file_path, 'JPEG', optimize=True, quality=85)
```

---

## 🧪 Testing

### Test Upload via Swagger

1. Login sebagai admin
2. POST `/api/v1/pegawai/`
3. Upload foto (JPG/PNG, any size)
4. Check hasil:
   ```bash
   ls -lh uploads/photos/
   # Output: P001.jpg (80KB) ← optimized!
   ```

### Test Different Scenarios

**Scenario 1: Large Image (5MB, 4000×3000)**
- Input: 5MB
- Output: ~100KB (max 800×600)
- ✅ Reduced by 98%

**Scenario 2: Small Image (50KB, 400×400)**
- Input: 50KB
- Output: ~30KB (no resize, only compress)
- ✅ Reduced by 40%

**Scenario 3: PNG with Transparency**
- Input: PNG 500KB with alpha
- Output: JPG 80KB with white background
- ✅ Reduced by 84%, transparency handled

---

## 📈 Performance Impact

### Upload Time
- **Before**: Direct write (1-2s for 5MB)
- **After**: Process + write (1-3s for 5MB)
- **Impact**: +0.5-1s (acceptable)

### Storage I/O
- **Read**: Faster (smaller files)
- **Write**: Slightly slower (processing overhead)
- **Net**: Positive (storage savings > processing cost)

### Bandwidth Savings
```
Serve 1000 photos to mobile app:
- Before: 500MB bandwidth
- After: 80MB bandwidth
- Savings: 420MB per session!
```

---

## ⚙️ Configuration

### Adjust Quality (if needed)

```python
# services/pegawai_service.py
# Line ~167

# Current: quality=85
img.save(file_path, 'JPEG', optimize=True, quality=85)

# For smaller file size (quality=75):
img.save(file_path, 'JPEG', optimize=True, quality=75)

# For best quality (quality=95):
img.save(file_path, 'JPEG', optimize=True, quality=95)
```

### Adjust Max Size

```python
# Current: 800×800
max_size = (800, 800)

# For smaller thumbnails:
max_size = (400, 400)

# For higher resolution:
max_size = (1200, 1200)
```

---

## 🔍 Monitoring

### Check File Sizes

```bash
# List photo sizes
ls -lh /home/sultan/fast-absen/backend/uploads/photos/

# Average size per photo
du -sh uploads/photos/ | awk '{print $1}'

# Count total photos
ls uploads/photos/ | wc -l
```

### Identify Large Files

```bash
# Find photos > 200KB (might need reoptimization)
find uploads/photos/ -size +200k -exec ls -lh {} \;
```

---

## 🐛 Troubleshooting

### Error: "Failed to process image"

**Cause**: Corrupted or invalid image file

**Solution**:
1. Verify file is valid image
2. Try opening in image viewer
3. Re-save with image editor
4. Upload again

### Error: "Invalid file type"

**Cause**: Unsupported format (WEBP, GIF, BMP, etc)

**Solution**:
1. Convert to JPG/PNG
2. Upload converted file

### Quality Too Low

**Cause**: Quality setting too aggressive

**Solution**:
```python
# Increase quality from 85 to 90
img.save(file_path, 'JPEG', optimize=True, quality=90)
```

### File Still Too Large

**Cause**: Max size too big

**Solution**:
```python
# Reduce from 800 to 600
max_size = (600, 600)
```

---

## 📝 Best Practices

### For Admins

1. **Upload Guidelines**:
   - ✅ Use JPG/PNG format
   - ✅ Any size accepted (auto-optimized)
   - ✅ Prefer JPG if already available
   - ⚠️ Avoid very low resolution (<200px)

2. **Photo Quality**:
   - ✅ Headshot/portrait photos work best
   - ✅ Good lighting
   - ✅ Clear face visible

3. **Bulk Upload**:
   - Upload one by one via API
   - Monitor storage usage
   - Check optimization working correctly

### For Developers

1. **Testing**:
   - Test with various sizes (10KB - 10MB)
   - Test with PNG transparency
   - Test with invalid files
   - Verify optimization ratio

2. **Monitoring**:
   - Monitor average file size
   - Check for processing errors
   - Verify disk usage trends

3. **Maintenance**:
   - Clean orphan photos periodically
   - Backup photos before bulk operations
   - Document any configuration changes

---

## 🎓 Technical Notes

### Why JPEG over PNG?

**JPEG Advantages:**
- ✅ Better compression for photos
- ✅ Smaller file size (typically 50% smaller)
- ✅ Universal browser support
- ✅ Faster loading

**PNG Advantages:**
- ✅ Lossless compression
- ✅ Transparency support
- ❌ Larger file size for photos
- ❌ Not needed for pegawai photos

**Decision**: JPEG is optimal for pegawai photos (portraits/headshots)

### Why Quality 85?

- Quality 100: Diminishing returns (file size ++ for marginal quality +)
- **Quality 85**: Sweet spot (excellent quality, good compression)
- Quality 70: Noticeable artifacts in detailed photos
- Quality 50: Only for very low bandwidth scenarios

**Research**: Human eye cannot distinguish quality 85 vs 100 in most photos

### Lanczos Resampling

- **Algorithm**: High-quality downsampling
- **Quality**: Better than BILINEAR, BICUBIC
- **Speed**: Acceptable for web applications
- **Use case**: Perfect for resize operations

---

## 📊 Statistics

### Expected Results (1000 Pegawai)

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Avg file size** | 500 KB | 80 KB | -84% |
| **Total storage** | 500 MB | 80 MB | -84% |
| **Upload time** | 1-2s | 1-3s | +0.5s |
| **Load time** | 500ms | 80ms | -84% |
| **Bandwidth/1000** | 500 MB | 80 MB | -420 MB |

---

## 🔄 Changelog

### Version 2.1.0 (12 Feb 2026)
- ✅ Added automatic image optimization
- ✅ Resize large images to max 800×800
- ✅ Compress with quality=85
- ✅ Convert all formats to JPEG
- ✅ Handle PNG transparency
- ✅ Error handling for invalid images

---

## 📞 Support

Issues dengan image optimization:
1. Check logs: `/backend/logs/`
2. Verify Pillow version: `pip show Pillow`
3. Test manual resize: `python -m PIL` 
4. Contact developer team

---

**Last Updated**: 12 Februari 2026  
**Status**: Production Ready ✅  
**Pillow Version**: 10.2.0
