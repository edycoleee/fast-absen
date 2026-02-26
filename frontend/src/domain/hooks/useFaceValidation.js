import { useState, useCallback } from 'react';
import FaceRepository from '../../data/repositories/FaceRepository';

/**
 * useFaceValidation — validasi gambar wajah ke backend + cek posisi dalam oval.
 *
 * Oval guide yang dipakai: centerX = W/2, centerY = H/2
 *   radiusX = W * 0.30, radiusY = H * 0.40
 * Formula point-in-ellipse: (dx/rx)² + (dy/ry)² <= 1
 */
export function useFaceValidation() {
  const [faceInPosition, setFaceInPosition] = useState(false);

  /**
   * Kirim gambar ke POST /face/validate.
   * @param {string} imageData — base64 JPEG (dengan atau tanpa header data URI)
   * @returns {Promise<{ success, message, data: { bbox, confidence, ... } }>}
   */
  const validateFace = useCallback(async (imageData) => {
    try {
      return await FaceRepository.validateFace(imageData);
    } catch (err) {
      // Normalkan error response dari axios
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'Validasi wajah gagal';
      return { success: false, message: detail };
    }
  }, []);

  /**
   * Cek apakah titik tengah bounding box wajah berada di dalam oval guide.
   * @param {{ bbox: number[] }} faceData — { bbox: [x1, y1, x2, y2] }
   * @param {number} canvasWidth
   * @param {number} canvasHeight
   * @returns {boolean}
   */
  const checkFacePosition = useCallback((faceData, canvasWidth, canvasHeight) => {
    if (!faceData?.bbox || faceData.bbox.length < 4) return false;

    const [x1, y1, x2, y2] = faceData.bbox;
    const faceCenterX = (x1 + x2) / 2;
    const faceCenterY = (y1 + y2) / 2;

    const dx = (faceCenterX - canvasWidth  / 2) / (canvasWidth  * 0.30);
    const dy = (faceCenterY - canvasHeight / 2) / (canvasHeight * 0.40);

    const isInOval = dx * dx + dy * dy <= 1;
    setFaceInPosition(isInOval);
    return isInOval;
  }, []);

  return { faceInPosition, validateFace, checkFacePosition };
}
