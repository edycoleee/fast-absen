/**
 * dateUtils.js
 * Utilitas format tanggal/waktu dengan timezone WIB (Asia/Jakarta).
 *
 * Semua fungsi selalu menampilkan waktu dalam WIB — tidak terpengaruh
 * oleh timezone browser maupun timezone server.
 */

const TZ = 'Asia/Jakarta';
const LOCALE = 'id-ID';

/**
 * Format tanggal: "06 Mar 2026"
 */
export const formatDate = (val) => {
  if (!val) return '-';
  try {
    return new Date(val).toLocaleDateString(LOCALE, {
      timeZone: TZ,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch { return '-'; }
};

/**
 * Format tanggal dengan hari: "Jum, 06 Mar 2026"
 */
export const formatDateWithDay = (val) => {
  if (!val) return '-';
  try {
    return new Date(val).toLocaleDateString(LOCALE, {
      timeZone: TZ,
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch { return '-'; }
};

/**
 * Format hari dalam seminggu: "Jumat"
 */
export const formatWeekday = (val, style = 'long') => {
  if (!val) return '-';
  try {
    return new Date(val).toLocaleDateString(LOCALE, { timeZone: TZ, weekday: style });
  } catch { return '-'; }
};

/**
 * Format waktu penuh: "08:30:45"
 */
export const formatTime = (val) => {
  if (!val) return '-';
  try {
    return new Date(val).toLocaleTimeString(LOCALE, {
      timeZone: TZ,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch { return '-'; }
};

/**
 * Format waktu singkat: "08:30"
 */
export const formatTimeShort = (val) => {
  if (!val) return '-';
  try {
    return new Date(val).toLocaleTimeString(LOCALE, {
      timeZone: TZ,
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch { return '-'; }
};

/**
 * Format tanggal + waktu: "06 Mar 2026, 08:30"
 */
export const formatDateTime = (val) => {
  if (!val) return '-';
  try {
    return new Date(val).toLocaleString(LOCALE, {
      timeZone: TZ,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch { return '-'; }
};

/**
 * Format tanggal + waktu penuh: "06 Mar 2026, 08:30:45"
 */
export const formatDateTimeFull = (val) => {
  if (!val) return '-';
  try {
    return new Date(val).toLocaleString(LOCALE, {
      timeZone: TZ,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch { return '-'; }
};

/**
 * Format tanggal pendek untuk header kolom kalender: "06 Mar"
 */
export const formatDateShort = (val) => {
  if (!val) return '-';
  try {
    return new Date(val).toLocaleDateString(LOCALE, {
      timeZone: TZ,
      day: 'numeric',
      month: 'short',
    });
  } catch { return '-'; }
};
