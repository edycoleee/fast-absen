import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * useCapture — mengelola array gambar wajah yang berhasil di-capture/upload.
 *
 * Fitur utama:
 * - `addCapture` menambahkan item baru ke array captures
 * - `startAutoCapture` memulai interval otomatis tiap AUTO_INTERVAL_MS
 * - Auto-stop saat jumlah captures mencapai targetCaptures
 * - `capturesRef` — sync dari state, dipakai oleh setInterval agar tidak stale closure
 *
 * @param {number} initialTargetCaptures — target default (default 10)
 */

const AUTO_INTERVAL_MS = 2000; // interval auto capture: 2 detik

export function useCapture(initialTargetCaptures = 10) {
  const [captures, setCaptures]           = useState([]);
  const [captureMode, setCaptureMode]     = useState('manual'); // 'manual' | 'auto'
  const [isCapturing, setIsCapturing]     = useState(false);
  const [autoInterval, setAutoInterval]   = useState(null);
  const [targetCaptures, setTargetCaptures] = useState(initialTargetCaptures);

  // Ref selalu sinkron dengan captures — dipakai di dalam setInterval
  const capturesRef = useRef([]);
  useEffect(() => {
    capturesRef.current = captures;
  }, [captures]);

  // ── Auto-stop ketika target tercapai ──────────────────────────────
  useEffect(() => {
    if (captures.length >= targetCaptures && autoInterval) {
      clearInterval(autoInterval);
      setAutoInterval(null);
      setIsCapturing(false);
    }
  }, [captures.length, targetCaptures, autoInterval]);

  // ── Tambah satu capture ───────────────────────────────────────────
  const addCapture = useCallback((imageData, faceData) => {
    const item = {
      id:        Date.now(),
      image:     imageData,
      faceData:  faceData,
      timestamp: new Date().toLocaleTimeString(),
    };
    setCaptures((prev) => [...prev, item]);
    return item;
  }, []);

  // ── Hapus satu capture berdasarkan id ─────────────────────────────
  const deleteCapture = useCallback((id) => {
    setCaptures((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // ── Reset semua captures ──────────────────────────────────────────
  const resetCaptures = useCallback(() => {
    setCaptures([]);
    capturesRef.current = [];
  }, []);

  // ── Mulai auto capture ────────────────────────────────────────────
  const startAutoCapture = useCallback(
    (captureFunction) => {
      if (autoInterval) return; // sudah berjalan
      setCaptureMode('auto');
      setIsCapturing(true);

      // Langsung capture pertama, lalu setiap interval
      captureFunction();
      const interval = setInterval(captureFunction, AUTO_INTERVAL_MS);
      setAutoInterval(interval);
    },
    [autoInterval]
  );

  // ── Stop auto capture ─────────────────────────────────────────────
  const stopAutoCapture = useCallback(() => {
    if (autoInterval) {
      clearInterval(autoInterval);
      setAutoInterval(null);
    }
    setIsCapturing(false);
    setCaptureMode('manual');
  }, [autoInterval]);

  // ── Cleanup saat komponen unmount ─────────────────────────────────
  useEffect(() => {
    return () => {
      if (autoInterval) clearInterval(autoInterval);
    };
  }, [autoInterval]);

  return {
    captures,
    capturesRef,
    captureMode,
    setCaptureMode,
    isCapturing,
    setIsCapturing,
    autoInterval,
    targetCaptures,
    setTargetCaptures,
    addCapture,
    deleteCapture,
    resetCaptures,
    startAutoCapture,
    stopAutoCapture,
  };
}
