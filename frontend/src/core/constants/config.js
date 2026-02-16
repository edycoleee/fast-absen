/**
 * Application Configuration
 * Centralized configuration constants
 */

/**
 * API Configuration
 */
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://192.168.171.15:8000/api/v1',
  TIMEOUT: 30000,
};

/**
 * Storage Keys
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  USER: 'user',
  SESSION_ID: 'session_id',
};

/**
 * Pagination Configuration
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
};

/**
 * Date & Time Format
 */
export const DATE_FORMAT = {
  DISPLAY: 'DD/MM/YYYY',
  API: 'YYYY-MM-DD',
  DATETIME: 'DD/MM/YYYY HH:mm:ss',
  TIME: 'HH:mm',
};

/**
 * Status Options
 */
export const ABSENSI_STATUS = {
  HADIR: 'HADIR',
  SAKIT: 'SAKIT',
  IZIN: 'IZIN',
  ALPA: 'ALPA',
  CUTI: 'CUTI',
};

export const PEGAWAI_STATUS = {
  PNS: 'PNS',
  PPPK: 'PPPK',
  KONTRAK: 'KONTRAK',
  HONORER: 'HONORER',
};

export const GENDER = {
  L: 'Laki-laki',
  P: 'Perempuan',
};

/**
 * App Metadata
 */
export const APP_META = {
  NAME: 'RSUD Sulfat Attendance System',
  SHORT_NAME: 'Absensi RSUD',
  VERSION: '1.0.0',
  DESCRIPTION: 'Sistem Absensi RSUD Sulfat',
};
