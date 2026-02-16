import { useEffect, useRef } from 'react';
import SessionsRepository from '../../data/repositories/SessionsRepository';
import LocalStorage from '../../data/storage/LocalStorage';
import { STORAGE_KEYS } from '../../core/constants';

/**
 * Session Heartbeat Hook
 * Automatically sends heartbeat to backend to keep session active
 * 
 * Usage:
 *   const { startHeartbeat, stopHeartbeat } = useSessionHeartbeat();
 *   
 *   // Start heartbeat when user is active
 *   useEffect(() => {
 *     startHeartbeat();
 *     return () => stopHeartbeat();
 *   }, []);
 * 
 * @param {number} intervalMinutes - Heartbeat interval in minutes (default: 5)
 */
export const useSessionHeartbeat = (intervalMinutes = 5) => {
  const intervalRef = useRef(null);
  const isActiveRef = useRef(false);

  /**
   * Send heartbeat to backend
   */
  const sendHeartbeat = async () => {
    try {
      const sessionId = LocalStorage.getItem(STORAGE_KEYS.SESSION_ID);
      
      if (!sessionId) {
        console.warn('[Heartbeat] No session ID found, skipping heartbeat');
        return;
      }

      await SessionsRepository.heartbeat(sessionId);
      console.log('[Heartbeat] Session activity updated at', new Date().toLocaleTimeString());
    } catch (error) {
      // Silently fail - don't disrupt user experience
      // Only log to console for debugging
      console.error('[Heartbeat] Failed to send heartbeat:', error.response?.data?.detail || error.message);
      
      // If session not found (404) or forbidden (403), stop heartbeat
      if (error.response?.status === 404 || error.response?.status === 403) {
        console.warn('[Heartbeat] Session invalid, stopping heartbeat');
        stopHeartbeat();
      }
    }
  };

  /**
   * Start heartbeat interval
   */
  const startHeartbeat = () => {
    // Don't start if already active
    if (isActiveRef.current) {
      console.log('[Heartbeat] Already running');
      return;
    }

    // Send initial heartbeat immediately
    sendHeartbeat();

    // Start interval
    const intervalMs = intervalMinutes * 60 * 1000; // Convert to milliseconds
    intervalRef.current = setInterval(sendHeartbeat, intervalMs);
    isActiveRef.current = true;

    console.log(`[Heartbeat] Started with ${intervalMinutes} minute interval`);
  };

  /**
   * Stop heartbeat interval
   */
  const stopHeartbeat = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      isActiveRef.current = false;
      console.log('[Heartbeat] Stopped');
    }
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopHeartbeat();
    };
  }, []);

  return {
    startHeartbeat,
    stopHeartbeat,
    sendHeartbeat, // Expose for manual heartbeat
  };
};
