/**
 * Local storage service.
 * Provides safe localStorage read/write helpers.
 */
/** Set item in localStorage. */
const setItem = (key, value) => {
  try {
    const serializedValue = typeof value === 'string'
      ? value
      : JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
    return true;
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error);
    return false;
  }
};

/** Get item from localStorage. */
const getItem = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    if (!item || item === 'undefined' || item === 'null') {
      return defaultValue;
    }

    try {
      return JSON.parse(item);
    } catch {
      return item;
    }
  } catch (error) {
    console.error(`Error getting localStorage key "${key}":`, error);
    return defaultValue;
  }
};

/** Remove item from localStorage. */
const removeItem = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing localStorage key "${key}":`, error);
    return false;
  }
};

/** Clear all localStorage keys. */
const clear = () => {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
};

/** Check whether key exists in localStorage. */
const hasItem = (key) => localStorage.getItem(key) !== null;

const LocalStorage = {
  setItem,
  getItem,
  removeItem,
  clear,
  hasItem,
};

export default LocalStorage;
