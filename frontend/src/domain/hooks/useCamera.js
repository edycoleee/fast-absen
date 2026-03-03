import { useState, useRef, useCallback } from 'react';

/**
 * useCamera — custom hook untuk akses kamera browser
 *
 * Mengelola lifecycle MediaStream: start, stop, dan capture satu frame
 * sebagai base64 JPEG. Stream disimpan di `useRef` agar tidak memicu
 * re-render saat dibersihkan.
 *
 * @returns {object} { videoRef, cameraActive, error, startCamera, stopCamera, captureFrame }
 */
export function useCamera() {
  const videoRef    = useRef(null);   // ref ke <video> element
  const streamRef   = useRef(null);   // ref ke MediaStream aktif
  // cancelledRef: diset true saat stopCamera dipanggil sebelum getUserMedia selesai
  // agar stream yang baru tiba langsung dimatikan (race-condition unmount)
  const cancelledRef = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError]               = useState(null);

  /**
   * Meminta izin kamera dan memulai stream ke <video>.
   * Menunggu event `loadedmetadata` sebelum memanggil `.play()`.
   */
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      cancelledRef.current = false;   // reset flag setiap kali kamera diminta

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width:      { ideal: 480 },
          height:     { ideal: 640 },
          facingMode: 'user',  // kamera depan
          aspectRatio: { ideal: 0.75 }, // portrait 3:4
        },
        audio: false,
      });

      // Jika stopCamera dipanggil saat getUserMedia masih pending
      // (mis. user pindah halaman sebelum kamera siap), matikan stream sekarang
      if (cancelledRef.current || !videoRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      videoRef.current.srcObject = stream;
      streamRef.current          = stream;

      // Tunggu metadata sebelum play agar tidak blank di iOS Safari / Chrome mobile
      await new Promise((resolve, reject) => {
        videoRef.current.onloadedmetadata = () =>
          videoRef.current.play().then(resolve).catch(reject);
      });

      setCameraActive(true);
    } catch (err) {
      let msg;
      if (err.name === 'NotAllowedError') {
        msg = 'Akses kamera ditolak. Izinkan kamera di browser lalu coba lagi.';
      } else if (err.name === 'NotFoundError') {
        msg = 'Kamera tidak ditemukan pada perangkat ini.';
      } else if (err.name === 'OverconstrainedError') {
        msg = 'Kamera tidak mendukung resolusi yang diminta. Coba lagi.';
      } else {
        msg = 'Gagal membuka kamera: ' + err.message;
      }
      setError(msg);
      setCameraActive(false);
    }
  }, []);

  /**
   * Menghentikan semua track pada stream aktif dan mereset state.
   * Juga menandai cancelledRef agar startCamera yang masih berjalan async
   * langsung mematikan stream begitu getUserMedia selesai.
   */
  const stopCamera = useCallback(() => {
    cancelledRef.current = true;       // cegah startCamera yang masih pending

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    if (videoRef.current) videoRef.current.srcObject = null;

    setCameraActive(false);
  }, []);

  /**
   * Mengambil satu frame dari <video> aktif dan mengembalikan base64 JPEG.
   * Menggunakan canvas sementara (tidak perlu di DOM).
   *
   * @param {number} quality — kualitas JPEG 0–1 (default 0.95)
   * @returns {{ dataUrl: string, base64: string } | null}
   */
  const captureFrame = useCallback((quality = 0.95) => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video?.videoHeight) return null;

    const canvas   = document.createElement('canvas');
    canvas.width   = video.videoWidth;
    canvas.height  = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const base64  = dataUrl.split(',')[1];  // strip "data:image/jpeg;base64,"

    return { dataUrl, base64 };
  }, []);

  return { videoRef, cameraActive, error, startCamera, stopCamera, captureFrame };
}
