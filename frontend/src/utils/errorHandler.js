/**
 * Enhanced Error Handler Utility
 * Provides consistent error handling across the application
 * with permission-aware messaging and user guidance
 */

/**
 * Format error message with enhanced information for 403 errors
 * @param {Error} error - The error object from API call
 * @param {string} defaultMessage - Default message if no specific error found
 * @param {Object} user - Current user object (optional, for role information)
 * @returns {string} Formatted error message
 */
export const formatErrorMessage = (error, defaultMessage = 'Terjadi kesalahan', user = null) => {
  console.error('Error occurred:', error);
  
  const statusCode = error?.response?.status;
  const errorDetail = error?.response?.data?.detail;
  const errorMessage = error?.response?.data?.message;
  
  // Handle permission errors (403 Forbidden)
  if (statusCode === 403) {
    let permissionError = '🔒 **Akses Ditolak**\n\n';
    permissionError += 'Anda tidak memiliki izin untuk mengakses fitur ini.\n\n';
    
    if (user) {
      const roleName = user.roles?.[0] || user.role || 'tidak diketahui';
      permissionError += `**Role Anda saat ini:** ${roleName}\n\n`;
    }
    
    permissionError += '**Cara Mengatasi:**\n';
    permissionError += '• Login dengan akun yang memiliki role Admin atau Super Admin\n';
    permissionError += '• Hubungi administrator untuk mendapatkan izin akses\n';
    permissionError += '• Periksa kembali role dan permissions akun Anda';
    
    return permissionError;
  }
  
  // Handle authentication errors (401 Unauthorized)
  if (statusCode === 401) {
    return '🔐 Sesi Anda telah berakhir. Silakan login kembali.';
  }
  
  // Handle not found errors (404)
  if (statusCode === 404) {
    return '❌ Data tidak ditemukan.';
  }
  
  // Handle validation errors (422)
  if (statusCode === 422) {
    const validationErrors = error?.response?.data?.detail;
    if (Array.isArray(validationErrors)) {
      return '⚠️ Data tidak valid:\n' + validationErrors.map(e => `• ${e.msg || e.message}`).join('\n');
    }
    return '⚠️ Data yang Anda masukkan tidak valid. Periksa kembali form Anda.';
  }
  
  // Handle conflict errors (409 - e.g. tidak bisa hapus karena ada relasi data)
  if (statusCode === 409) {
    return `⚠️ ${errorDetail || errorMessage || defaultMessage}`;
  }

  // Handle server errors (500)
  if (statusCode >= 500) {
    return '⚡ Terjadi kesalahan pada server. Silakan coba lagi nanti atau hubungi administrator.';
  }
  
  // Handle network errors
  if (!error?.response) {
    return '📡 Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
  }
  
  // Return specific error message from API if available
  return errorDetail || errorMessage || defaultMessage;
};

/**
 * Check if error is a permission error
 * @param {Error} error - The error object
 * @returns {boolean}
 */
export const isPermissionError = (error) => {
  return error?.response?.status === 403;
};

/**
 * Check if error is an authentication error
 * @param {Error} error - The error object
 * @returns {boolean}
 */
export const isAuthError = (error) => {
  return error?.response?.status === 401;
};

/**
 * Get error status code
 * @param {Error} error - The error object
 * @returns {number|null}
 */
export const getErrorStatusCode = (error) => {
  return error?.response?.status || null;
};

/**
 * Format error for display in alert/modal
 * Converts markdown-style formatting to plain text
 * @param {string} message - The formatted error message
 * @returns {string}
 */
export const formatErrorForAlert = (message) => {
  return message
    .replace(/\*\*/g, '') // Remove bold markers
    .replace(/^[•●]/gm, '  -') // Convert bullets to dashes
    .trim();
};

/**
 * Handle error with callback
 * @param {Error} error - The error object
 * @param {Function} setError - State setter for error message
 * @param {string} defaultMessage - Default error message
 * @param {Object} user - Current user object (optional)
 */
export const handleError = (error, setError, defaultMessage, user = null) => {
  const errorMessage = formatErrorMessage(error, defaultMessage, user);
  setError(errorMessage);
};
