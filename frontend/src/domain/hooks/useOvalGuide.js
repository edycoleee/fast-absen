import { useEffect } from 'react';

/**
 * useOvalGuide — canvas overlay oval animasi via requestAnimationFrame.
 *
 * Teknik "lubang oval":
 *   1. Gambar overlay hitam semi-transparan penuh
 *   2. Potong area oval dengan `destination-out` compositing
 *      (piksel yang digambar menjadi transparan → area wajah terlihat jelas)
 *   3. Gambar border oval berwarna di atas (source-over)
 *      - Cyan  (#00ffff) : wajah belum di posisi yang benar
 *      - Hijau (#00ff00) : wajah sudah dalam oval
 *
 * @param {React.RefObject} overlayCanvasRef — ref ke <canvas> overlay
 * @param {React.RefObject} videoRef         — ref ke <video>
 * @param {boolean}         cameraActive     — apakah stream kamera aktif
 * @param {boolean}         faceInPosition   — apakah wajah sudah di posisi oval
 */
export function useOvalGuide(overlayCanvasRef, videoRef, cameraActive, faceInPosition) {
  useEffect(() => {
    if (!cameraActive || !overlayCanvasRef.current || !videoRef.current) return;

    let animationId;

    const draw = () => {
      const video  = videoRef.current;
      const canvas = overlayCanvasRef.current;
      if (!video?.videoWidth) {
        animationId = requestAnimationFrame(draw);
        return;
      }

      // Resize canvas ke resolusi video agar pixel-perfect
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx     = canvas.getContext('2d');
      const centerX = canvas.width  / 2;
      const centerY = canvas.height / 2;
      const radiusX = canvas.width  * 0.30;
      const radiusY = canvas.height * 0.40;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Layer 1 — overlay hitam semi-transparan
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Layer 2 — "potong" oval → area wajah terlihat jelas
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      ctx.fill();

      // Layer 3 — border oval berwarna
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      ctx.strokeStyle = faceInPosition ? '#00ff00' : '#00ffff';
      ctx.lineWidth   = 3;
      ctx.setLineDash([12, 6]);
      ctx.stroke();

      // Layer 4 — teks panduan
      ctx.setLineDash([]);
      ctx.fillStyle  = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur  = 4;
      ctx.font        = `bold ${Math.max(14, Math.round(canvas.width * 0.025))}px Arial`;
      ctx.textAlign   = 'center';
      ctx.fillText('Posisikan wajah dalam oval', centerX, 36);
      ctx.font        = `${Math.max(12, Math.round(canvas.width * 0.020))}px Arial`;
      ctx.fillText('Lihat langsung ke kamera', centerX, canvas.height - 20);
      ctx.shadowBlur  = 0;

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [cameraActive, faceInPosition, overlayCanvasRef, videoRef]);
}
